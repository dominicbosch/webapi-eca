'use strict';
// # PostgreSQL DB Connection Module
// 
// I think it is a good idea for now (Since we do not use promises throught the other modules) to keep
// the promises in here and only executed callbacks with the (err, result) arguments.

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),

	Sequelize = require('sequelize'),

// Internal variables :
	sequelize, oUsers = {},

// DB Models:
	User,
	Webhook;

// ## DB Connection

// Initializes the DB connection. This returns a promise. Which means you can attach .then or .catch handlers 
exports.init = (oDB, cb) => {
	var dbPort = parseInt(oDB.port) || 5432;
	log.info('POSTGRES | Connecting module: ' + oDB.module + ', port: ' + dbPort + ', database: ' + oDB.db);
	sequelize = new Sequelize('postgres://postgres:postgres@localhost:' + dbPort + '/' + oDB.db, {
		// logging: false,
		define: { timestamps: false }
	});

	// On success we call cb with nothing. if rejected an error is passed along:
	sequelize.authenticate().then(initializeModels).then(() => cb(), cb);
};

// Initializes the Database model and returns also a promise
function initializeModels() {
	// See http://docs.sequelizejs.com/en/latest/docs/models-definition/ for a list of available data types
	User = sequelize.define('User', {
		username: Sequelize.STRING,
		password: Sequelize.STRING,
		isAdmin: Sequelize.BOOLEAN
	});
	Webhook = sequelize.define('Webhook', {
		hookid: Sequelize.STRING,
		hookname: Sequelize.STRING,
		isPublic: Sequelize.BOOLEAN
	});
	// ### Define Relations

	Webhook.belongsTo(User);
	User.hasMany(Webhook, { onDelete: 'cascade' }); // If a user gets deleted, we delete all his webhooks too
	
	// Return a promise
	// return sequelize.sync().then(() => log.info('POSTGRES | Synced Models'));
	return sequelize.sync({ force: true }).then(() => log.info('POSTGRES | Synced Models'));
}

function getRecVals(arrRecords) {
	return arrRecords.map((oRecord) => {
		return oRecord.dataValues;
	});
}

// shutDown closes the DB connection
exports.shutDown = (cb) => {
	log.warn('POSTGRES | Closing connection!');
	sequelize.close();
	sequelize = null;
};


// ## USERS

// Fetch all user IDs and pass them to cb(err, obj).
exports.getUserIds = (cb) => {
	User.findAll().then((arrRecords) => {
		cb(null, arrRecords.map((oRecord) => {
			return oRecord.dataValues.username;
		}))
	}).catch(cb);
};

// Fetch all user IDs and pass them to cb(err, obj).
exports.storeUser = (oUser, cb) => {
	log.info('POSTGRES | Storing new user ' + oUser.username);
	User.create(oUser).then((user) => cb(null, user.dataValues)).catch(cb);
};

// Checks the credentials and on success returns the user object to the
// callback(err, obj) function. The password has to be hashed (SHA-3-512)
// beforehand by the instance closest to the user that enters the password,
// because we only store hashes of passwords for security reasons.
exports.loginUser = (username, password, cb) => {
	User.findAll({ where: { username: username } }).then((arrRecords) => {
		if(arrRecords.length === 0) cb(new Error('User not found!'));
		else {
			let oUser = arrRecords[0].dataValues;
			if(oUser.password === password) {
				oUsers[oUser.id] = arrRecords[0];
				cb(null, oUser);
			}
			else cb(new Error('Nice try!'));
		}
	}).catch(cb);
};

// TODO: This approach will eventually cause a little leak if many user logouts are not caught over time.
// Eventually we should try to track inactivity and log the sessions out and also delete the reference here
exports.logoutUser = (userid) => delete oUsers[userid];

// ## WEBHOOKS
exports.getAllWebhooks = (cb) => {
	Webhook.findAll()
		.then((arrRecords) => cb(null, getRecVals(arrRecords)))
		.catch(cb);
};

exports.getAllUserWebhooks = (userid, cb) => {
	var publicSearch = Webhook.findAll({ where: {
		isPublic: true,
		UserId: { $ne: userid }
	}});

	var privateSearch = oUsers[userid].getWebhooks();

	publicSearch.then(() => privateSearch)
		.then((arrRecords) => {
			let arrHooks = arrRecords.concat(publicSearch.value());
			let arrPromises = [];
			for (let i = 0; i < arrHooks.length; i++) {
				arrPromises.push(arrHooks[i].getUser());
			}
			Promise.all(arrPromises).then((arrUsers) => {
				for (let i = 0; i < arrUsers.length; i++) {
					arrHooks[i].dataValues.username = arrUsers[i].dataValues.username;
				}
				let arrResult = {
					private: getRecVals(publicSearch.value()),
					public: getRecVals(arrRecords)
				};
				cb(null, arrResult);
			}).catch(cb);
		}).catch(cb);
};

exports.createWebhook = (userid, hookid, hookname, isPublic, cb) => {
	log.info('POSTGRES | Storing new webhook ' + hookname + ' for user ' + userid);
	Webhook.create({
		UserId: userid,
		hookid: hookid,
		hookname: hookname,
		isPublic: isPublic
	}).then(() => cb()).catch(cb);
};