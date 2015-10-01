
// # PostgreSQL DB Connection Module

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),

	Sequelize = require('sequelize'),

// Internal variables :
	sequelize,
	User,
	Webhook;

// ## DB Connection

// Initializes the DB connection. This returns a promise. Which means you can attach .then or .catch handlers 
exports.init = (oDB) => {
	var dbPort = parseInt(oDB.port) || 5432;
	log.info('POSTGRES | Connecting module: ' + oDB.module + ', port: ' + dbPort + ', database: ' + oDB.db);
	sequelize = new Sequelize('postgres://postgres:postgres@localhost:' + dbPort + '/' + oDB.db, {
		// logging: false,
		define: { timestamps: false }
	});
	return sequelize.authenticate().then(initializeModels);
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
	// We do not need to maintain this in the user since the user id will be the most used thing throughout the whole code
	// User.hasMany(Webhook);
	
	// Return a promise
	// return sequelize.sync().then(() => log.info('POSTGRES | Synced Models'));
	return sequelize.sync({ force: true }).then(() => log.info('POSTGRES | Synced Models'));
}

exports.checkConnection = (cbYes, cbNo) => sequelize.authenticate().then(cbYes, cbNo)

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
	}, (err) => log.error('getUserIds', err));
};

// Fetch all user IDs and pass them to cb(err, obj).
exports.storeUser = (oUser, cb) => {
	log.info('POSTGRES | Storing new user ' + oUser.username);
	User.create(oUser).then((user) => {
		if(typeof cb === 'function') cb(null, user);
	}, (err) => log.error('storeUser', err));
};


// ## WEBHOOKS
exports.getAllWebhooks = (cb) => {
	Webhook.findAll().then((arrRecords) => {
		cb(null, arrRecords.map((oRecord) => {
			return oRecord.dataValues;
		}))
	}, (err) => log.error('getAllWebhooks', err));
};

exports.getAllUserWebhooks = (cb) => {

};

exports.createWebhook = (userid, hookid, hookname, isPublic) => {
	log.info('POSTGRES | Storing new webhook ' + hookname + ' for user ' + userid);
	Webhook.create({
		UserId: userid,
		hookid: hookid,
		hookname: hookname,
		isPublic: isPublic
	}).catch((err) => log.error('createWebhook', err));
};