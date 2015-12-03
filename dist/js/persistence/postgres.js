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
	sequelize

// DB Models:
	, User
	, Worker
	, Rule
	, Webhook
	, Schedule
	, CodeModule
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
		log: Sequelize.ARRAY(Sequelize.STRING),
		datalog: Sequelize.ARRAY(Sequelize.JSON)
	});
	Webhook = sequelize.define('Webhook', {
		hookid: { type: Sequelize.STRING, unique: true },
		hookname: Sequelize.STRING,
		isPublic: Sequelize.BOOLEAN
	});
	Schedule = sequelize.define('Schedule', {
		schedule: Sequelize.JSON,
		running: Sequelize.BOOLEAN
	});
	CodeModule = sequelize.define('CodeModule', {
		name: Sequelize.STRING,
		lang: Sequelize.STRING,
		code: Sequelize.TEXT,
		comment: Sequelize.TEXT,
		modules: Sequelize.JSON,
		functions: Sequelize.JSON,
		globals: Sequelize.JSON,
		isaction: Sequelize.BOOLEAN
	});

	// ### Define Relations
	// If a user gets deleted, we delete all his realted data too (cascade) 
	Worker.belongsTo(User, { onDelete: 'cascade' });
	Rule.belongsTo(User, { onDelete: 'cascade' });
	Webhook.belongsTo(User, { onDelete: 'cascade' });
	CodeModule.belongsTo(User, { onDelete: 'cascade' });
	User.hasOne(Worker);
	User.hasMany(Rule);
	User.hasMany(Webhook);
	User.hasMany(Schedule);
	User.hasMany(CodeModule);
	Rule.belongsTo(Webhook);
	CodeModule.hasOne(Schedule);
	Schedule.belongsTo(CodeModule, { onDelete: 'cascade' });
	
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
	if(err.statusCode) log.info(err.message);
	else log.error(err);
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
exports.shutDown = () => {
	log.warn('PG | Closing connection!');
	sequelize.close();
	sequelize = null;
};

exports.getDBSize = () => {
	return sequelize.query("select pg_database_size('"+sequelize.config.database+"')")
		.spread(function(results, metadata) {
			if(results.length > 0) {
				return parseInt(results[0]['pg_database_size']);
			} else {
				throwStatusCode(500, 'Unable to determine the database size!');
			}
		})
}

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
	return Rule.findAll(query)
		.then((arrRecords) => arrRecordsToJSON(arrRecords));
};

exports.getAllRulesSimple = (uid) => {
	var query = {
		attributes: [ 'id', 'name' ],
		include: [{
			model: Webhook,
			attributes: [ 'hookid' ],
		}]
	};
	return User.findById(uid)
		.then((oUser) => {
			if(!oUser) throwStatusCode(404, 'You do not exist!?');
			return oUser.getRules(query);
		})
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

exports.getRuleLog = (uid, rid) => {
	return Rule.findById(rid)
		.then((oRule) => (oRule.get('log') || []).reverse());
};

exports.clearRuleLog = (uid, rid) => {
	return Rule.findById(rid)
		.then((oRule) => {
			if(oRule) oRule.update({ log: null })
		}).catch(ec);
};
exports.clearRuleDataLog = (uid, rid) => {
	return Rule.findById(rid)
		.then((oRule) => {
			if(oRule) oRule.update({ datalog: null })
		}).catch(ec);
};

exports.logRuleData = (rid, msg) => {
	log.info('PG | Logging rule data #'+rid, msg);
	let oLog = JSON.stringify({
		timestamp: (new Date()).getTime(),
		data: msg
	});
	return Rule.findById(rid)
		.then((oRule) => {
			if(oRule) {
				return oRule.update({
					datalog: sequelize.fn('array_append', sequelize.col('datalog'), oLog)
				})
			} else {
				console.log('no rule foub')
			}
		}).catch(ec);
};

exports.getRuleDataLog = (uid, rid) => {
	return Rule.findOne({ where: {
			id: rid,
			UserId: uid
		}})
		.then((oRule) => oRule.get('datalog'));
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
// ## CODE MODULES -- Internal functions
// ## This is because Event Triggers and Action Dispatchers have almost the same functionality
// ## except for that the Event Triggers also have a schedule
// ## 

function getCodeModule (cid) {
	return CodeModule.findOne({
			where: { id: cid },
			include: [{ model: User, attributes: [ 'username' ]}]
		})
		.then((oMod) => {
			if(oMod) return oMod.toJSON();
			else throwStatusCode(404, 'Code Module does not exist!')
		});
}

function getAllCodeModules(isaction) {
	var query = {
		where: { isaction: isaction },
		include: [{ model: User, attributes: [ 'username' ]}]
	};
	return CodeModule.findAll(query)
		.then((arrRecords) => arrRecordsToJSON(arrRecords));
} 

function createCodeModule(uid, oMod, oSchedule) {
	return User.findById(uid)
		.then((oUser) => oUser.createCodeModule(oMod))
		// .then((oNewMod) => oNewMod.toJSON())
		.then((oNewMod) => oNewMod.toJSON())
}

function updateCodeModule (uid, cid, oMod) {
	return User.findById(uid)
		.then((oUser) => oUser.getCodeModules({ where: { id: cid }}))
		.then((arrOldMod) => {
			if(arrOldMod.length > 0) return arrOldMod[0].update(oMod);
			else throwStatusCode(404, 'Code Module not found!');
		})
}

function deleteCodeModule(uid, cid) {
	log.info('PG | Deleting CodeModule #'+cid);
	return User.findById(uid)
		.then((oUser) => oUser.getCodeModules({ where: { id: cid }}))
		.then((arrOldMod) => {
			if(arrOldMod.length > 0) return arrOldMod[0].destroy();
			else throwStatusCode(404, 'No Code Module found to delete!');
		});
}

// ##
// ## ACTION DISPATCHERS
// ##

exports.getActionDispatcher = (aid) => getCodeModule(aid);
exports.getAllActionDispatchers = () => getAllCodeModules(true);
exports.updateActionDispatcher = (uid, aid, oAd) => updateCodeModule(uid, aid, oAd)
exports.deleteActionDispatcher = (uid, aid) => deleteCodeModule(uid, aid);
exports.createActionDispatcher = (uid, oAd) => {
	oAd.isaction = true;
	return createCodeModule(uid, oAd)
};

// ##
// ## EVENT TRIGGERS
// ##

exports.getActionDispatcher = (eid) => {
	return getCodeModule(eid);
};

exports.getAllEventTriggers = () => {
	return getAllCodeModules(false);
};


// exports.createEventTrigger = (uid, oEt) => {
	// oEt.isaction = true;
// 	return createCodeModule(uid, oEt)
// };

// exports.updateEventTrigger = (uid, eid, oEt) => {
// 	return updateCodeModule(uid, eid, oEt)
// };

// exports.deleteEventTrigger = (uid, eid) => {
// 	return deleteCodeModule(uid, eid);
// };