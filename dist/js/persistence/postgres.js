'use strict';
// # PostgreSQL DB Connection Module
// 
// I think it is a good idea for now (Since we do not use promises throught the other modules) to keep
// the promises in here and only execute callbacks with the (err, result) arguments.

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),

	Sequelize = require('sequelize'),
	moment = require('moment'),

// Internal variables :
	sequelize,

// DB Models:
	User
	, Worker
	, Rule
	, Webhook
	, EventTrigger
	, ActionDispatcher
	;

// ## DB Connection

// Initializes the DB connection. This returns a promise. Which means you can attach .then or .catch handlers 
exports.init = (oDB) => {
	var dbPort = parseInt(oDB.port) || 5432;
	log.info('PG | Connecting module: '+oDB.module+', host: '
		+oDB.host+', port: '+dbPort+', username: '+oDB.user+', database: '+oDB.db);
	sequelize = new Sequelize('postgres://'+oDB.user+':'+oDB.pass+'@'+oDB.host+':'+dbPort+'/'+oDB.db, {
		// logging: false,
		define: { timestamps: false }
	});

	return sequelize.authenticate().then(initializeModels);
};

// Initializes the Database model and returns also a promise
function initializeModels() {
	// See http://docs.sequelizejs.com/en/latest/docs/models-definition/ for a list of available data types
	User = sequelize.define('User', {
		username: { type: Sequelize.STRING, unique: true },
		password: Sequelize.STRING,
		isAdmin: Sequelize.BOOLEAN
	});
	Worker = sequelize.define('Worker', {
		pid: { type: Sequelize.INTEGER, unique: true },
		log: Sequelize.ARRAY(Sequelize.STRING),
		modules: Sequelize.ARRAY(Sequelize.STRING),
		activeCodes: Sequelize.ARRAY(Sequelize.STRING)
	});
	Rule = sequelize.define('Rule', {
		name: Sequelize.STRING,
		conditions: Sequelize.JSON,
		actions: Sequelize.JSON,
		log: Sequelize.ARRAY(Sequelize.STRING)
	});
	Webhook = sequelize.define('Webhook', {
		hookid: { type: Sequelize.STRING, unique: true },
		hookname: Sequelize.STRING,
		isPublic: Sequelize.BOOLEAN
	});
	EventTrigger = sequelize.define('EventTrigger', {
		name: Sequelize.STRING,
		lang: Sequelize.STRING,
		code: Sequelize.TEXT,
		comment: Sequelize.TEXT,
		functions: Sequelize.JSON,
		published: Sequelize.BOOLEAN,
		globals: Sequelize.JSON
	});
	ActionDispatcher = sequelize.define('ActionDispatcher', {
		name: Sequelize.STRING,
		lang: Sequelize.STRING,
		code: Sequelize.TEXT,
		comment: Sequelize.TEXT,
		functions: Sequelize.JSON,
		published: Sequelize.BOOLEAN,
		globals: Sequelize.JSON
	});

	// ### Define Relations
	// If a user gets deleted, we delete all his realted data too (cascade) 
	Worker.belongsTo(User, { onDelete: 'cascade' });
	Rule.belongsTo(User, { onDelete: 'cascade' });
	Webhook.belongsTo(User, { onDelete: 'cascade' });
	EventTrigger.belongsTo(User, { onDelete: 'cascade' });
	ActionDispatcher.belongsTo(User, { onDelete: 'cascade' });
	User.hasOne(Worker);
	User.hasMany(Rule);
	User.hasMany(Webhook);
	User.hasMany(EventTrigger);
	User.hasMany(ActionDispatcher);
	Rule.belongsTo(Webhook);
	
	// Return a promise
	return sequelize.sync().then(() => log.info('PG | Synced Models'));
	// return sequelize.sync({ force: true }).then(() => log.info('PG | Synced Models'));
}

function ec(err) { log.error(err) }

function throwStatusCode(code, msg) {
	let e = new Error(msg);
	e.statusCode = code;
	throw e;
}
exports.throwStatusCode = throwStatusCode;

exports.errHandler = (res) => (err) => {
	log.error(err);
	res.status(err.statusCode || 500);
	res.send(err.message);
}

// After retrieving a plain array of sequelize records, this function transforms all
// of the records (recursively since sequelize v3.10.0) into plain JSON objects
function arrRecordsToJSON(arrRecords) {
	if(!arrRecords) return [];
	return arrRecords.map((o) => o.toJSON());
}

// shutDown closes the DB connection
exports.shutDown = (cb) => {
	log.warn('PG | Closing connection!');
	sequelize.close();
	sequelize = null;
};


// ##
// ## USERS
// ##

// Fetch all user IDs and pass them to cb(err, obj).
exports.getUsers = () => {
	return User.findAll().then((arr) => arrRecordsToJSON(arr))
};

// Fetch all user IDs and pass them to cb(err, obj).
exports.getUser = (uid) => {
	return User.findById(uid)
		.then((oRecord) => {
			if(oRecord) return oRecord.toJSON();
			else throwStatusCode(404, 'User not found!');
		});
};

exports.getUserByName = (username) => {
	return User.findOne({ where: { username: username } })
		.then((oRecord) => {
			if(oRecord) return oRecord.toJSON();
			else throwStatusCode(404, 'User not found!');
		});
};

exports.storeUser = (oUser) => {
	log.info('PG | Storing new user '+oUser.username);
	return User.create(oUser)
		.then((oNewUser) => {
			return oNewUser.createWorker({}).then(() => oNewUser)
		})
		.then((oNewUser) => oNewUser.toJSON())
};

// Fetch all user IDs and pass them to cb(err, obj).
exports.updateUserAttribute = (uid, attr, val) => {
	log.info('PG | Updating user #'+uid);
	return User.findById(uid)
		.then((oRecord) => {
			if(oRecord) {
				let oChg = {};
				oChg[attr] = val;
				return oRecord.update(oChg, { fields: [ attr ] });
			} else throwStatusCode(404, 'User not found!');
		})
		.then((o) => o.toJSON())
};

exports.deleteUser = (uid) => {
	log.info('PG | Deleting user #'+uid);
	return User.findById(uid)
		.then((oRecord) => {
			if(oRecord) return oRecord.destroy();
			else throwStatusCode(404, 'User with ID #'+uid+' not found!');
		});
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
	}, cb).catch(ec);
};

exports.getAllUsers = () => {
	return User.findAll().then((arr) => arrRecordsToJSON(arr));
};


// ##
// ## DEDICATED WORKER PROCESS
// ##

exports.logWorker = (uid, msg) => {
	return User.findById(uid)
		.then((oUser) => oUser.getWorker())
		.then((oWorker) => {
			if(oWorker) oWorker.update({
				log: sequelize.fn('array_append', sequelize.col('log'), msg)
			})
		}).catch(ec);
};

exports.getWorker = (username, cb) => {
	User.findOne({ where: { username: username } }).then((oUser) => {
		if(!oUser) return cb(new Error('User not found!'))
		return oUser.getWorker().then((oWorker) => cb(null, oWorker.toJSON()));
	}, cb).catch(ec);
};

exports.setWorker = (uid, pid) => {
	return User.findById(uid)
		.then((oUser) => {
			if(!oUser) throw new Error('User not found!');
			return oUser.getWorker();
		})
		.then((oWorker) => oWorker.update({ pid: pid }))
};


// ##
// ## WEBHOOKS
// ##
exports.getAllWebhooks = () => {
	return Webhook.findAll()
		.then((arr) => arrRecordsToJSON(arr))
};

exports.getAllUserWebhooks = (uid) => {
	var publicSearch = Webhook.findAll({ 
		include: [{ model: User, attributes: [ 'username' ]}],
		where: {
			isPublic: true,
			UserId: { $ne: uid }
		}
	});

	var privateSearch = User.findById(uid)
		.then((oRecord) => oRecord.getWebhooks());
		// .then((oRecord) => oRecord.getWebhooks({ include: [ User ] }));

	return publicSearch
		.then(() => privateSearch)
		.then((arrRecords) => {
			return {
				private: arrRecordsToJSON(arrRecords),
				public: arrRecordsToJSON(publicSearch.value())
			}
		});
};
exports.createWebhook = (uid, hookid, hookname, isPublic, cb) => {
	log.info('PG | Storing new webhook '+hookname+' for user '+uid);
	return User.findById(uid)
		.then((oUser) => {
			return oUser.createWebhook({
				hookid: hookid,
				hookname: hookname,
				isPublic: isPublic
			});
		})
		.then((oHook) => oHook.toJSON());
};
exports.deleteWebhook = (uid, hookid, cb) => {
	log.info('PG | Deleting webhook #'+hookid);
	Webhook.findById(hookid).then((oRecord) => {
		if(oRecord) {
			if(oRecord.get('UserId') === uid) {
				oRecord.destroy().then(() => cb(null, 'Webhook deleted!'), cb).catch(ec);
			} else cb(new Error('You are not the owner of this webhook!'));
		} else cb(new Error('Webhook with ID #'+hookid+' not found!'));
	}, cb).catch(ec)
};


// ##
// ## RULES
// ##
exports.getAllRules = (uid) => {
	var query = { include: [ Webhook ] };
	if(uid) query.where = { UserId: uid };
	return Rule
	.findAll(query)
		.then((arrRecords) => arrRecordsToJSON(arrRecords));
};

exports.storeRule = (uid, oRule, hookid) => {
	return User.findById(uid)
		.then((oUser) => {
			if(!oUser) throwStatusCode(404, 'You do not exist!?');

			return oUser.getRules({ where: { name: oRule.name }})
				.then((arrExisting) => {
					if(arrExisting.length === 0) return oUser;
					else throwStatusCode(409, 'Rule name already existing!');
				})
		})
		.then((oUser) => {
			return Webhook.findById(hookid)
				.then((oWebhook) => {
					if(oWebhook) {
						if(oWebhook.isPublic || oWebhook.UserId===uid) {
							return { user: oUser, hook: oWebhook };
						} else throwStatusCode(403, 'You are not allowed to use this Webhook!')
					} else throwStatusCode(404, 'Webhook not existing!');
				})
		})
		.then((o) => {
			return o.user.createRule(oRule)
				.then((oRule) => oRule.setWebhook(o.hook))
		})
		.then((oRule) => oRule.toJSON())
}

exports.logRule = (rid, msg) => {
	msg = moment().format('YYYY/MM/DD HH:mm:ss.SSS (UTCZZ)')+' | '+msg;
	return Rule.findById(rid)
		.then((oRule) => {
			if(oRule) oRule.update({
				log: sequelize.fn('array_append', sequelize.col('log'), msg)
			})
		}).catch(ec);
};

exports.getRuleLog = (rid) => {
	return Rule.findById(rid)
		.then((oRule) => oRule.get('log'));
};

// Returns a promise
exports.deleteRule = (uid, rid) => {
	log.info('PG | Deleting Rule #'+rid);
	return Rule.findById(rid)
		.then((oRecord) => {
			if(oRecord) {
				if(oRecord.get('UserId') === uid) return oRecord.destroy();
				else throwStatusCode(403, 'You are not the owner of this Rule!');
			} else throwStatusCode(404, 'Rule doesn\'t exist!');
		})
};

// ##
// ## ACTION DISPATCHERS
// ##

exports.getAllActionDispatchers = (uid) => {
	var query = { include: [{ model: User, attributes: [ 'username' ]}] };
	if(uid) query.where = { UserId: uid };
	return ActionDispatcher.findAll(query)
		.then((arrRecords) => arrRecordsToJSON(arrRecords));
};
exports.getActionDispatcher = (aid) => {
	return ActionDispatcher.findOne({
			where: { id: aid },
			include: [{ model: User, attributes: [ 'username' ]}]
		})
		.then((oAd) => {
			if(oAd) return oAd.toJSON();
			else throwStatusCode(404, 'Action Dispatcher does not exist!')
		});
};
exports.createActionDispatcher = (uid, oAD) => {
	return User.findById(uid)
		.then((oUser) => oUser.createActionDispatcher(oAD))
		.then((oNewAD) => oNewAD.toJSON())
};
exports.updateActionDispatcher = (uid, aid, oAd) => {
	return User.findById(uid)
		.then((oUser) => oUser.getActionDispatchers({ where: { id: aid }}))
		.then((arrOldAd) => {
			if(arrOldAd.length > 0) return arrOldAd[0].update(oAd);
			else throwStatusCode(404, 'Action Dispatcher not found!');
		})
};
exports.deleteActionDispatcher = (uid, aid) => {
	log.info('PG | Deleting ActionDispatcher #'+aid);
	return User.findById(uid)
		.then((oUser) => oUser.getActionDispatchers({ where: { id: aid }}))
		.then((arrOldAd) => {
			if(arrOldAd.length > 0) return arrOldAd[0].destroy();
			else {
				let e = new Error('No Action Dispatcher found to delete!');
				e.statusCode = 404;
				throw e;
			}
		});
};


// ##
// ## EVENT TRIGGERS
// ##

exports.getAllEventTriggers = (uid, cb) => {
	var query;
	if(uid) query = { where: { UserId: uid } };
	ActionDispatcher.findAll(query)
		.then((arrRecords) => cb(null, arrRecordsToJSON(arrRecords)), cb).catch(ec);
};

exports.deleteEventTrigger = (eid, cb) => {
	log.info('PG | Deleting EventTrigger #'+eid);
	EventTrigger.findById(eid).then((oRecord) => {
		if(oRecord) oRecord.destroy().then(() => cb(null, 'EventTrigger deleted!')).catch(cb);
		else cb(new Error('EventTrigger with ID #'+eid+' not found!'));
	}, cb).catch(ec);
};