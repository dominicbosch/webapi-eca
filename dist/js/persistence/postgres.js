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
	sequelize,

// DB Models:
	User,
	Process,
	Rule,
	Webhook,
	EventTrigger,
	ActionDispatcher;

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
		username: { type: Sequelize.STRING, unique: true },
		password: Sequelize.STRING,
		isAdmin: Sequelize.BOOLEAN
	});
	Process = sequelize.define('Process', {
		pid: { type: Sequelize.INTEGER, unique: true },
		log: Sequelize.ARRAY(Sequelize.STRING),
		modules: Sequelize.ARRAY(Sequelize.STRING),
		activeCodes: Sequelize.ARRAY(Sequelize.STRING)
	});
	Rule = sequelize.define('Rule', {
		event: Sequelize.STRING,
		conditions: Sequelize.JSON,
		actions: Sequelize.JSON
	});
	Webhook = sequelize.define('Webhook', {
		hookid: { type: Sequelize.STRING, unique: true },
		hookname: Sequelize.STRING,
		isPublic: Sequelize.BOOLEAN
	});
	EventTrigger = sequelize.define('EventTrigger', {
		name: Sequelize.STRING,
		code: Sequelize.STRING
	});
	ActionDispatcher = sequelize.define('ActionDispatcher', {
		name: Sequelize.STRING,
		code: Sequelize.STRING
	});

	// ### Define Relations
	// If a user gets deleted, we delete all his realted data too (cascade) 
	Process.belongsTo(User);
	Rule.belongsTo(User);
	Webhook.belongsTo(User);
	EventTrigger.belongsTo(User);
	ActionDispatcher.belongsTo(User);
	User.hasOne(Process, { onDelete: 'cascade' });
	User.hasMany(Rule, { onDelete: 'cascade' });
	User.hasMany(Webhook, { onDelete: 'cascade' });
	User.hasMany(EventTrigger, { onDelete: 'cascade' });
	User.hasMany(ActionDispatcher, { onDelete: 'cascade' });
	
	// Return a promise
	// return sequelize.sync().then(() => log.info('POSTGRES | Synced Models'));
	return sequelize.sync({ force: true }).then(() => log.info('POSTGRES | Synced Models'));
}

// After retrieving a plain array of sequelize records, this function transforms all
// of the records (recursively since sequelize v3.10.0) into plain JSON objects
function arrRecordsToJSON(arrRecords) {
	return arrRecords.map((o) => o.toJSON());
}

// shutDown closes the DB connection
exports.shutDown = (cb) => {
	log.warn('POSTGRES | Closing connection!');
	sequelize.close();
	sequelize = null;
};


// ##
// ## USERS
// ##

// Fetch all user IDs and pass them to cb(err, obj).
exports.getUsers = (cb) => {
	User.findAll().then((arrRecords) => {
		cb(null, arrRecords.map((o) => o.toJSON()));
	}).catch(cb);
};

// Fetch all user IDs and pass them to cb(err, obj).
exports.getUser = (uid, cb) => {
	User.findById(uid).then((oRecord) => {
		if(oRecord) cb(null, oRecord.toJSON());
		else cb(new Error('User not found!'));
	}).catch(cb);
};

// Fetch all user IDs and pass them to cb(err, obj).
exports.storeUser = (oUser, cb) => {
	log.info('POSTGRES | Storing new user ' + oUser.username);
	User.create(oUser).then((obj) => {
		cb(null, obj.toJSON());
		// return obj.addProcess(Process.create({pid: 98765}))
	}).catch(cb);
};

// Fetch all user IDs and pass them to cb(err, obj).
exports.updateUserAttribute = (uid, attr, val, cb) => {
	log.info('POSTGRES | Updating user #' + uid);
	User.findById(uid).then((oRecord) => {
		if(oRecord) {
			let oChg = {};
			oChg[attr] = val;
			return oRecord.update(oChg, { fields: [ attr ] })
				.then(() => cb(), cb)
		} else cb(new Error('User not found!'));
	}).catch(cb);
};

exports.deleteUser = (uid, cb) => {
	log.info('POSTGRES | Deleting user #'+uid);
	User.findById(uid).then((oRecord) => {
		if(oRecord) oRecord.destroy().then(() => cb(null, 'User deleted!')).catch(cb);
		else cb(new Error('User with ID #'+uid+' not found!'));
	})
};

// Checks the credentials and on success returns the user object to the
// callback(err, obj) function. The password has to be hashed (SHA-3-512)
// beforehand by the instance closest to the user that enters the password,
// because we only store hashes of passwords for security reasons.
exports.loginUser = (username, password, cb) => {
	User.findOne({ where: { username: username } }).then((oRecord) => {
		if(!oRecord) cb(new Error('User not found!'));
		else {
			let oUser = oRecord.toJSON();
			if(oUser.password === password) cb(null, oUser);
			else cb(new Error('Nice try!'));
		}
	}).catch(cb);
};

exports.getAllUsers = (cb) => {
	User.findAll().then((arrRecords) => cb(null, arrRecordsToJSON(arrRecords))).catch(cb);
};


// ##
// ## DEDICATED PROCESS
// ##

exports.logProcess = (uid) => {
	User.findById(uid).then((oUser) => {
		return oUser.getProcess().then((oProc) => {
			console.log('got process');
			console.log(oProc);
		})
	}).catch((err) => console.error('Logging failed for uid "'+uid+'"', err));
};


// ##
// ## WEBHOOKS
// ##

exports.getAllWebhooks = (cb) => {
	Webhook.findAll()
		.then((arrRecords) => cb(null, arrRecordsToJSON(arrRecords)))
		.catch(cb);
};

exports.getAllUserWebhooks = (uid, cb) => {
	var publicSearch = Webhook.findAll({ 
		include: [ User ],
		where: {
			isPublic: true,
			UserId: { $ne: uid }
		}
	});

	var privateSearch = User.findById(uid).then((oRecord) => oRecord.getWebhooks({ include: [ User ] }));

	publicSearch.then(() => privateSearch)
		.then((arrRecords) => {
			let arrResult = {
				private: arrRecordsToJSON(arrRecords),
				public: arrRecordsToJSON(publicSearch.value())
			};
			cb(null, arrResult);
		}).catch(cb);
};

exports.createWebhook = (uid, hookid, hookname, isPublic, cb) => {
	log.info('POSTGRES | Storing new webhook ' + hookname + ' for user ' + uid);
	User.findById(uid).then((oUser) => {
		return Webhook.create({
			hookid: hookid,
			hookname: hookname,
			isPublic: isPublic
		}).then((oWh) => oUser.addWebhook(oWh));
	}).then(() => cb()).catch(cb);
};

exports.deleteWebhook = (hookid, cb) => {
	log.info('POSTGRES | Deleting webhook #'+hookid);
	Webhook.findById(hookid).then((oRecord) => {
		if(oRecord) oRecord.destroy().then(() => cb(null, 'Webhook deleted!')).catch(cb);
		else cb(new Error('Webhook with ID #'+hookid+' not found!'));
	})
};


// ##
// ## RULES
// ##

exports.getAllRules = (uid, cb) => {
	var query;
	if(uid) query = { where: { UserId: uid } };
	Rule.findAll(query)
		.then((arrRecords) => cb(null, arrRecordsToJSON(arrRecords)))
		.catch(cb);
};

// exports.deleteWebhook = (hookid, cb) => {
// 	log.info('POSTGRES | Deleting webhook #'+hookid);
// 	Webhook.findById(hookid).then((oRecord) => {
// 		if(oRecord) oRecord.destroy().then(() => cb(null, 'Webhook deleted!')).catch(cb);
// 		else cb(new Error('Webhook with ID #'+hookid+' not found!'));
// 	})
// };


// ##
// ## ACTION DISPATCHERS
// ##

exports.getAllActionDispatchers = (uid, cb) => {
	var query;
	if(uid) query = { where: { UserId: uid } };
	ActionDispatcher.findAll(query)
		.then((arrRecords) => cb(null, arrRecordsToJSON(arrRecords)))
		.catch(cb);
};
// exports.createActionDispatcher = (oAD, cb) => {
// 	var query;
// 	if(uid) query = { where: { UserId: uid } };
// 	ActionDispatcher.findAll(query)
// 		.then((arrRecords) => cb(null, arrRecordsToJSON(arrRecords)))
// 		.catch(cb);
// };
exports.deleteActionDispatcher = (aid, cb) => {
	log.info('POSTGRES | Deleting ActionDispatcher #'+aid);
	ActionDispatcher.findById(aid).then((oRecord) => {
		if(oRecord) oRecord.destroy().then(() => cb(null, 'ActionDispatcher deleted!')).catch(cb);
		else cb(new Error('ActionDispatcher with ID #'+aid+' not found!'));
	})
};


// ##
// ## EVENT TRIGGERS
// ##

exports.getAllEventTriggers = (uid, cb) => {
	var query;
	if(uid) query = { where: { UserId: uid } };
	ActionDispatcher.findAll(query)
		.then((arrRecords) => cb(null, arrRecordsToJSON(arrRecords)))
		.catch(cb);
};

exports.deleteEventTrigger = (eid, cb) => {
	log.info('POSTGRES | Deleting EventTrigger #'+eid);
	EventTrigger.findById(eid).then((oRecord) => {
		if(oRecord) oRecord.destroy().then(() => cb(null, 'EventTrigger deleted!')).catch(cb);
		else cb(new Error('EventTrigger with ID #'+eid+' not found!'));
	})
};