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
	, ModPersist
	, CodeModule
	, Log
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
		log: Sequelize.ARRAY(Sequelize.STRING)
	});
	Rule = sequelize.define('Rule', {
		name: Sequelize.STRING,
		conditions: Sequelize.JSON,
		actions: Sequelize.JSON,
		log: Sequelize.ARRAY(Sequelize.STRING),
		datalog: Sequelize.ARRAY(Sequelize.JSON)
	});
	Webhook = sequelize.define('Webhook', {
		hookurl: { type: Sequelize.STRING, unique: true },
		hookname: Sequelize.STRING,
		isPublic: Sequelize.BOOLEAN
	});
	Schedule = sequelize.define('Schedule', {
		name: Sequelize.STRING,
		error: Sequelize.STRING,
		execute: Sequelize.JSON,
		text: Sequelize.JSON,
		running: { type: Sequelize.BOOLEAN, defaultValue: true }
	});
	CodeModule = sequelize.define('CodeModule', {
		name: Sequelize.STRING,
		lang: Sequelize.STRING,
		version: Sequelize.INTEGER,
		code: Sequelize.TEXT,
		comment: Sequelize.TEXT,
		modules: Sequelize.JSON,
		functions: Sequelize.JSON,
		globals: Sequelize.JSON,
		isaction: Sequelize.BOOLEAN
	});
	ModPersist = sequelize.define('ModPersist', {
		moduleId: Sequelize.INTEGER,
		data: Sequelize.JSON
	});
	Log = sequelize.define('Log', {
		log: Sequelize.ARRAY(Sequelize.STRING),
		datalog: Sequelize.ARRAY(Sequelize.JSON)
	});

	// ### Define Relations
	// If a user gets deleted, we delete all his realted data too (cascade) 
	Worker.belongsTo(User, { onDelete: 'cascade' });
	Rule.belongsTo(User, { onDelete: 'cascade' });
	Schedule.belongsTo(User, { onDelete: 'cascade' });
	Webhook.belongsTo(User, { onDelete: 'cascade' });
	CodeModule.belongsTo(User, { onDelete: 'cascade' });

	// Module persistance either belongs to a rule (AD) or a Schedule (ET)
	ModPersist.belongsTo(Rule, { onDelete: 'cascade' });
	ModPersist.belongsTo(Schedule, { onDelete: 'cascade' });
	Rule.hasMany(ModPersist);
	Schedule.hasOne(ModPersist);

	// Log either belongs to a rule (AD) or a Schedule (ET)
	Schedule.hasOne(Log);
	Rule.hasOne(Log);
	Log.belongsTo(Schedule, { onDelete: 'cascade' });
	Log.belongsTo(Rule, { onDelete: 'cascade' });
	
	Schedule.belongsTo(CodeModule, { onDelete: 'cascade' });
	CodeModule.hasMany(Schedule);

	User.hasOne(Worker);
	User.hasMany(Rule);
	User.hasMany(Schedule);
	User.hasMany(Webhook);
	User.hasMany(CodeModule);
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

// Fetch all users
exports.getUsers = () => {
	return User.findAll().then((arr) => arrRecordsToJSON(arr))
};

// Fetch distinct user
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

exports.updateUserAttribute = (uid, attr, val) => {
	log.info('PG | Updating user #'+uid);
	return User.findById(uid, { attributes: [ 'id' ] })
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
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oRecord) => {
			if(oRecord) return oRecord.destroy();
			else throwStatusCode(404, 'User with ID #'+uid+' not found!');
		});
};

// Checks the credentials and on success returns the user object.
// The password has to be hashed (SHA-3-512)
// beforehand by the instance closest to the user that enters the password,
// because we only store hashes of passwords for security reasons.
exports.loginUser = (username, password) => {
	return User.findOne({ where: { username: username } })
		.then((oRecord) => {
			if(!oRecord) throwStatusCode(404, 'User not found!');
			else {
				let oUser = oRecord.toJSON();
				if(oUser.password === password) return oUser;
				else throwStatusCode(404, 'Nice try!');
			}
		});
};

exports.getAllUsers = () => {
	return User.findAll().then((arr) => arrRecordsToJSON(arr));
};


// ##
// ## DEDICATED WORKER PROCESS
// ##

exports.logWorker = (uid, msg) => {
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => oUser.getWorker())
		.then((oWorker) => {
			if(oWorker) oWorker.update({
				log: sequelize.fn('array_append', sequelize.col('log'), msg)
			})
		}).catch(ec);
};

exports.getWorker = (username) => {
	return User.findOne({ where: { username: username } })
		.then((oUser) => {
			if(!oUser) throwStatusCode(404, 'User not found!');
			return oUser.getWorker();
		})
		.then((o) => o.toJSON());
};

exports.setWorker = (uid, pid) => {
	return User.findById(uid, { attributes: [ 'id' ] })
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

	var privateSearch = User.findById(uid, { attributes: [ 'id' ] })
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
exports.createWebhook = (uid, hookurl, hookname, isPublic) => {
	log.info('PG | Storing new webhook '+hookname+' for user '+uid);
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => {
			return oUser.createWebhook({
				hookurl: hookurl,
				hookname: hookname,
				isPublic: isPublic
			});
		})
		.then((oHook) => oHook.toJSON());
};
exports.deleteWebhook = (uid, hid) => {
	log.info('PG | Deleting webhook #'+hid);
	return Webhook.findById(hid, { attributes: [ 'id', 'UserId' ] })
		.then((oRecord) => {
			if(oRecord) {
				if(oRecord.get('UserId') === uid) return oRecord.destroy();
				else throwStatusCode(403, 'You are not the owner of this webhook!');
			} else throwStatusCode(404, 'Webhook with ID #'+hid+' not found!');
		})
};


// ##
// ## RULES
// ##
exports.getAllRules = (uid, full) => {
	var query = {
		attributes: [
			'id',
			'UserId',
			'WebhookId',
			'name',
			'conditions',
			'actions'
		],
		order: 'id DESC',
		include: [{
			model: Webhook,
			attributes: [ 'id', 'hookurl' ],
		}]
	};
	if(uid) query.where = { UserId: uid };
	if(full) query.include.push(ModPersist);
	return Rule.findAll(query)
		.then((arrRecords) => arrRecordsToJSON(arrRecords));
};

exports.getRule = (uid, rid) => {
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => {
			if(!oUser) throwStatusCode(404, 'You do not exist!?');
			return oUser.getRules({
				where: { id: rid },
				attributes: [ 'id', 'UserId', 'WebhookId', 'name', 'conditions', 'actions' ]
			})
		})
		.then((arrRules) => {
			if(arrRules.length > 0) return arrRules[0];
			else throwStatusCode(404, 'Rule not existing!');
		})
}

function storeRule(uid, rid, oRule, hid) {
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => {
			let query = { attributes: [ 'id', 'UserId', 'WebhookId', 'name', 'conditions', 'actions' ] };
			if(!oUser) {
				throwStatusCode(404, 'You do not exist!?');
			
			// Create new rule
			} else if(rid===undefined) {
				query.where = { name: oRule.name };
				return oUser.getRules(query)
					.then((arrRules) => {
						if(arrRules.length === 0) return { user: oUser };
						else throwStatusCode(409, 'Rule name already existing!');
					})
			// Update of existing rule
			} else {
				query.where = { id: rid };
				return oUser.getRules(query)
					.then((arrRules) => {
						if(arrRules.length > 0) return { user: oUser, rule: arrRules[0] };
						else throwStatusCode(403, 'Rule not existing!');
					})
			}
		})
		.then((oResult) => {
			return Webhook.findById(hid, { attributes: [ 'id', 'isPublic', 'UserId', 'hookurl' ] })
				.then((oWebhook) => {
					if(oWebhook) {
						if(oWebhook.isPublic || oWebhook.UserId===uid) {
							return { user: oResult.user, rule: oResult.rule, hook: oWebhook };
						} else throwStatusCode(403, 'You are not allowed to use this Webhook!')
					} else throwStatusCode(404, 'Webhook not existing!');
				})
		})
		.then((o) => {
			let prom;
			if(rid===undefined) {
				// If it's not an update we need to initialize an empty log as well
				prom = o.user.createRule(oRule)
					.then((newRule) => {
						return newRule.createLog({})
							.then(() => newRule);
					});
			} else {
				prom = o.rule.update(oRule);
			}
			return prom.then((oRule) => {
					return oRule.setWebhook(o.hook);
				})
				.then((oRule) => {
					oRule = oRule.toJSON();
					oRule.Webhook = o.hook.toJSON();
					return oRule;
				});
		})
}

exports.createRule = (uid, oRule, hid) => storeRule(uid, undefined, oRule, hid);
exports.updateRule = (uid, rid, oRule, hid) => storeRule(uid, rid, oRule, hid);

exports.logRule = (rid, msg) => {
	msg = moment().format('YYYY/MM/DD HH:mm:ss.SSS (UTCZZ)')+' | '+msg;
	return Rule.findById(rid, { attributes: [ 'id' ]})
		.then((oRule) => oRule.getLog({ attributes: [ 'id', 'log' ]}))
		.then((oLog) => {
			if(oLog) oLog.update({
				log: sequelize.fn('array_append', sequelize.col('log'), msg)
			})
		}).catch(ec);
};

exports.getRuleLog = (uid, rid) => {
	return Rule.findOne({
			where: {
				id: rid,
				UserId: uid
			}
		})
		.then((oRule) => oRule.getLog({ attributes: [ 'id', 'log' ]}))
		.then((oLog) => (oLog.get('log') || []).reverse());
};

exports.clearRuleLog = (uid, rid) => {
	return Rule.findById(rid, { attributes: [ 'id' ] })
		.then((oRule) => oRule.getLog({ attributes: [ 'id', 'log' ]}))
		.then((oLog) => {
			if(oLog) oLog.update({ log: null })
		}).catch(ec);
};
exports.clearRuleDataLog = (uid, rid) => {
	return Rule.findById(rid, { attributes: [ 'id' ] })
		.then((oRule) => oRule.getLog({ attributes: [ 'id', 'datalog' ]}))
		.then((oLog) => {
			if(oLog) oLog.update({ datalog: null })
		}).catch(ec);
};

exports.logRuleData = (rid, msg) => {
	log.info('PG | Logging rule data #'+rid, msg);
	let oLogVal = JSON.stringify({
		timestamp: (new Date()).getTime(),
		data: msg
	});
	return Rule.findById(rid, { attributes: [ 'id' ] })
		.then((oRule) => oRule.getLog({ attributes: [ 'id', 'datalog' ]}))
		.then((oLog) => {
			if(oLog) {
				return oLog.update({
					datalog: sequelize.fn('array_append', sequelize.col('datalog'), oLogVal)
				})
			}
		})
		.catch(ec);
};

exports.getRuleDataLog = (uid, rid) => {
	return Rule.findOne({ where: {
			id: rid,
			UserId: uid
		}})
		.then((oRule) => oRule.getLog({ attributes: [ 'id', 'datalog' ]}))
		.then((oLog) => oLog.get('datalog'));
};

// Returns a promise
exports.deleteRule = (uid, rid) => {
	log.info('PG | Deleting Rule #'+rid);
	return Rule.findById(rid, { attributes: [ 'id', 'UserId' ] })
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
function getCodeModule(cid) {
	return CodeModule.findOne({
			where: { id: cid },
			include: [{ model: User, attributes: [ 'username' ] }]
		})
		.then((oMod) => {
			if(oMod) return oMod.toJSON();
			else throwStatusCode(404, 'Code Module does not exist!')
		});
}

function getAllCodeModules(isaction) {
	var query = {
		where: { isaction: isaction },
		include: [{ model: User, attributes: [ 'username' ]}],
		order: [['id', 'DESC']]
	};
	return CodeModule.findAll(query)
		.then((arrRecords) => arrRecordsToJSON(arrRecords));
}

function createCodeModule(uid, oMod) {
	oMod.version = 1;
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => oUser.createCodeModule(oMod))
}

function updateCodeModule(uid, cid, oMod) {
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => oUser.getCodeModules({
			where: { id: cid }
		}))
		.then((arrOldMod) => {
			if(arrOldMod.length > 0) {
				oMod.version = arrOldMod[0].version+1;
				return arrOldMod[0].update(oMod);
			}
			else throwStatusCode(404, 'Code Module not found!');
		})
}

exports.persistRuleData = function(rid, cid, data) {
	return Rule.findById(rid, { attributes: [ 'id' ] })
		.then((oRule) => {
			if(!oRule) throwStatusCode(404, 'Rule not found');
			else return oRule;
		})
		.then((oRule) => {
			return oRule.getModPersists({ where: { moduleId: cid }})
				.then((arr) => {
					return {
						rule: oRule,
						arr: arr
					}
				})
		})
		.then((oRes) => {
			if(oRes.arr.length > 0) return oRes.arr[0].update({ data: data });
			else return ModPersist.create({
					moduleId: cid,
					data: data
				})
				.then((oMp) => oRes.rule.addModPersist(oMp));
		})
		.catch(ec);
}

function deleteCodeModule(uid, cid) {
	log.info('PG | Deleting CodeModule #'+cid);
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => oUser.getCodeModules({ where: { id: cid }}))
		.then((arrOldMod) => {
			if(arrOldMod.length > 0) return arrOldMod[0].destroy();
			else throwStatusCode(404, 'No Code Module found to delete!');
		});
}



// ##
// ## ACTION DISPATCHERS
// ##

exports.getAllActionDispatchers = () => getAllCodeModules(true);
exports.getActionDispatcher = getCodeModule;
exports.updateActionDispatcher = updateCodeModule;
exports.deleteActionDispatcher = deleteCodeModule;
exports.createActionDispatcher = (uid, oAd) => {
	oAd.isaction = true;
	return createCodeModule(uid, oAd)
		.then((oNewMod) => oNewMod.toJSON())
};



// ##
// ## EVENT TRIGGERS
// ##

exports.getAllEventTriggers = () => getAllCodeModules(false);
exports.getEventTrigger = getCodeModule;
exports.updateEventTrigger = updateCodeModule;
exports.deleteEventTrigger = deleteCodeModule;
exports.createEventTrigger = (uid, oEt) => {
	oEt.isaction = false;
	return createCodeModule(uid, oEt)
		.then((oNewMod) => oNewMod.toJSON())
};



// ##
// ## Schedule
// ##

function getSchedule(sid) {
	return Schedule.findById(sid, { attributes: [ 'id' ] })
		.then((answ) => {
			if(!answ) throwStatusCode(404, 'Schedule not found');
			else return answ;
		})
}

exports.getSchedule = (uid, sid) => {
	let options = {
		include: [CodeModule, { model: User, attributes: [ 'username' ] }]
	}
	if(sid) options.where = { id: sid };
	return Schedule.findAll(options)
		.then((answ) => {
			if(sid) {
				if(answ.length === 0) throwStatusCode(404, 'Schedule not found');
				else return answ[0];
			} else {
				return (answ || []);
			};
		})
};

exports.createSchedule = (uid, oSched, cid) => {
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => {
			return oUser.getSchedules({
					include: [CodeModule, { model: User, attributes: [ 'username' ] }]
				})
				.then((arrScheds) => {
					return {
						user: oUser,
						arr: arrScheds
					}
				})
		})
		.then((o) => {
			return CodeModule.findById(cid)
				.then((oMod) => {
					if(!oMod) throwStatusCode(404, 'CodeModule #'+cid+' not found!')
					else {
						o.module = oMod;
						return o;
					}
				})
		})
		.then((o) => {
			if(o.arr.some((d) => d.name === oSched.name)) {
				throwStatusCode(409, 'Schedule Name already existing')
			} else {
				return o.user.createSchedule(oSched)
					.then((newSchedule) => newSchedule.setCodeModule(o.module))
					.then((newSchedule) => {
						return newSchedule.createLog({})
							.then(() => newSchedule.toJSON());
					})

			}
		});
};

exports.updateSchedule = (uid, sid, oSched, cid) => {
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => oUser.getSchedules({
			where: { id: sid },
			include: [CodeModule, { model: User, attributes: [ 'username' ] }]
		}))
		.then((sched) => {
			if(sched.length === 0) throwStatusCode(404, 'Schedule not found!');
			else return sched[0].update(oSched);
		})
		.then((newSched) => newSched.toJSON())
}

exports.startStopSchedule = (uid, sid, isStart, execute) => {
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => oUser.getSchedules({
			where: { id: sid },
			include: [ CodeModule ]
		}))
		.then((arrOldSched) => {
			if(arrOldSched.length > 0) {
				let upd = { running: isStart };
				if(isStart) {
					upd.execute = execute;
					upd.error = null;
				}
				return arrOldSched[0].update(upd);
			}
			else throwStatusCode(404, 'No Code Module found to update!');
		});
}

exports.setErrorSchedule = (uid, sid, msg) => {
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => oUser.getSchedules({ where: { id: sid } }))
		.then((arrSched) => {
			if(arrSched.length > 0) {
				let upd = {
					running: false,
					error: msg
				};
				return arrSched[0].update(upd);
			}
			else throwStatusCode(404, 'No Code Module found to update!');
		});
}


exports.persistScheduleData = function(sid, data) {
	return getSchedule(sid)
		.then((oSched) => {
			return oSched.getModPersist()
				.then((oPers) => {
					return {
						schedule: oSched,
						persist: oPers
					}
				});
		})
		.then((oRes) => {
			if(oRes.persist) {
				return oRes.persist.update({ data: data });
			} else {
				return ModPersist.create({
					moduleId: sid,
					data: data
				})
				.then((oMp) => oRes.schedule.setModPersist(oMp));
			}
		})
		.catch(ec);
}

exports.logSchedule = (sid, msg) => {
	msg = moment().format('YYYY/MM/DD HH:mm:ss.SSS (UTCZZ)')+' | '+msg;
	return getSchedule(sid)
		.then((oSched) => oSched.getLog({ attributes: [ 'id', 'log' ] }))
		.then((oLog) => {
			if(oLog) oLog.update({
				log: sequelize.fn('array_append', sequelize.col('log'), msg)
			})
		})
		.catch(ec);
};

exports.getScheduleLog = (uid, sid) => {
	return getSchedule(sid)
		.then((oSched) => oSched.getLog({ attributes: [ 'id', 'log' ]}))
		.then((oLog) => (oLog.get('log') || []).reverse());
};

exports.clearScheduleLog = (uid, sid) => {
	return getSchedule(sid)
		.then((oSched) => oSched.getLog({ attributes: [ 'id', 'log' ]}))
		.then((oLog) => {
			if(oLog) oLog.update({ log: null })
		})
		.catch(ec);
};

exports.logScheduleData = (uid, sid, data) => {
	let oLogVal = JSON.stringify({
		timestamp: (new Date()).getTime(),
		data: data
	});
	return getSchedule(sid)
		.then((oSched) => oSched.getLog({ attributes: [ 'id', 'datalog' ] }))
		.then((oLog) => {
			if(oLog) oLog.update({
				data: sequelize.fn('array_append', sequelize.col('datalog'), oLogVal)
			})
		})
		.catch(ec);
};

exports.getScheduleDataLog = (uid, sid) => {
	return getSchedule(sid)
		.then((oSched) => oSched.getLog({ attributes: [ 'datalog' ] }))
		.then((oLog) => oLog.get('datalog'));
};

exports.clearScheduleDataLog = (uid, rid) => {
	return getSchedule(sid)
		.then((oSched) => oSched.getLog({ attributes: [ 'datalog' ] }))
		.then((oLog) => {
			if(oLog) oLog.update({ datalog: null })
		})
		.catch(ec);
};

exports.deleteEventTrigger = (uid, eid) => deleteCodeModule(uid, eid);

