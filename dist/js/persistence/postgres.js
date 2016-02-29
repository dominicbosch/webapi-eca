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
	fs = require('graceful-fs'),
	path = require('path'),
	util = require('util'),

// Internal variables :
	sequelize,
	logDir = path.resolve(__dirname, 'logs'),

// DB Models:
	User,
	Worker,
	Rule,
	Webhook,
	Schedule,
	ModPersist,
	CodeModule;

// ## DB Connection

// Initializes the DB connection. This returns a promise. Which means you can attach .then or .catch handlers 
exports.init = (oDB) => {
	var dbPort = parseInt(oDB.port) || 5432;
	log.info('PG | Connecting module: '+oDB.module+', host: '
		+oDB.host+', port: '+dbPort+', username: '+oDB.user+', database: '+oDB.db);
	sequelize = new Sequelize('postgres://'+oDB.user+':'+oDB.pass+'@'+oDB.host+':'+dbPort+'/'+oDB.db, {
		logging: false,
		define: { timestamps: false }
	});

	return sequelize.authenticate().then(() => initializeModels(oDB.reset));
};

// Initializes the Database model and returns also a promise
function initializeModels(isReset) {
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
	
	Schedule.belongsTo(CodeModule, { onDelete: 'cascade' });
	CodeModule.hasMany(Schedule);

	User.hasOne(Worker);
	User.hasMany(Rule);
	User.hasMany(Schedule);
	User.hasMany(Webhook);
	User.hasMany(CodeModule);
	Rule.belongsTo(Webhook);

		
	// Return a promise
	let opt;
	if(isReset) {
		opt = { force: true };
		log.warn('PG | Resetting Database!')
	}
	return sequelize.sync(opt).then(() => log.info('PG | Synced Models'));
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

// TODO all logging should go into files since db connection somehow is very slow sadly atm...
// Either drastically improve DB interaction or change this logging also into files.
// Anyways how it is at the moment, it is fine because the only logging that is done for the
// worker is when new modules are loaded, therefore we really should not have a lot of log entries.
// otherwise we have other problems to solve,  such as training our users to behave ;)
exports.logWorker = (uid, msg) => {
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => oUser.getWorker())
		.then((oWorker) => {
			if(oWorker) oWorker.update({
				// and also array_append seems to show very bad performance
				log: sequelize.fn('array_append', sequelize.col('log'), msg.substring(0, 255))
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
				prom = o.user.createRule(oRule);
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

function checkRuleExists(uid, rid) {
	return Rule.findOne({
		where: {
			id: rid,
			UserId: uid
		},
		attributes: [ 'id' ]
	})
	.then((oRule) => {
		if(!oRule) throwStatusCode(404, 'Rule not found for user')
	});
}

exports.logRule = (rid, msg) => {
	return setLog('rule', rid, msg);
};

exports.getRuleLog = (uid, rid) => {
	return checkRuleExists(uid, rid)
		.then(() => getLog('rule', rid));
};

exports.clearRuleLog = (uid, rid) => {
	return checkRuleExists(uid, rid)
		.then(() => deleteLog('rule_'+rid))
		.catch(ec);
};

exports.logRuleData = (rid, data) => {
	return setLogData('rule', rid, data);
};

exports.getRuleDataLog = (uid, rid) => {
	return checkRuleExists(uid, rid)
		.then(() => getDataLog('rule', rid));
};

exports.clearRuleDataLog = (uid, rid) => {
	return checkRuleExists(uid, rid)
		.then(() => deleteLog('rule_data_'+rid))
		.catch(ec);
};

// Returns a promise
exports.deleteRule = (uid, rid) => {
	log.info('PG | Deleting Rule #'+rid);
	return Rule.findById(rid, { attributes: [ 'id', 'UserId' ] })
		.then((oRecord) => {
			if(oRecord) {
				if(oRecord.get('UserId') === uid) {
					deleteLog('rule_'+rid);
					deleteLog('rule_data_'+rid);
					return oRecord.destroy();
				}
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

function deleteCodeModule(uid, cid, isEt) {
	log.info('PG | Deleting CodeModule #'+cid);
	let pGetCodeModule = User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => oUser.getCodeModules({ where: { id: cid }}))
		.then((arrOldMod) => {
			if(arrOldMod.length > 0) return arrOldMod[0];
			else throwStatusCode(404, 'No Code Module found to delete!');
		});

	return pGetCodeModule.then((mod) => mod.getSchedules())
		.then((arr) => {
			return pGetCodeModule.value()
				.destroy()
				.then(() => arrRecordsToJSON(arr));
		})
	// return User.findById(uid, { attributes: [ 'id' ] })
	// 	.then((oUser) => oUser.getCodeModules({ where: { id: cid }}))
	// 	.then((arrOldMod) => {
	// 		if(arrOldMod.length > 0) {
	// 			return arrOldMod[0].getSchedules()
	// 				.then((arrSched) => {
	// 					return arrOldMod[0].destroy()
	// 						.then(() => arrSched.toJSON())
	// 				})
	// 		}
	// 		else throwStatusCode(404, 'No Code Module found to delete!');
	// 	});
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
exports.deleteEventTrigger = (uid, cid) => deleteCodeModule(uid, cid, true)
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
		include: [
			CodeModule,
			ModPersist,
			{ model: User, attributes: [ 'username' ] }
		],
		order: 'id DESC'
	}
	if(sid) options.where = { id: sid };
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => {
			if(!oUser) throwStatusCode(404, 'User not found!');
			return oUser.getSchedules(options);
		})
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
						exports.logSchedule(uid, newSchedule.id, 'Schedule created');
						return Schedule.findById(newSchedule.id, {
								include: [
									CodeModule,
									ModPersist,
									{ model: User, attributes: [ 'username' ] }
								]
							});
					})
					.then((res) => res.toJSON());

			}
		});
};

exports.updateSchedule = (uid, sid, oSched, cid) => {
	return User.findById(uid, { attributes: [ 'id' ] })
		.then((oUser) => oUser.getSchedules({
			where: { id: sid },
			include: [CodeModule, ModPersist, { model: User, attributes: [ 'username' ] }]
		}))
		.then((sched) => {
			if(sched.length === 0) throwStatusCode(404, 'Schedule not found!');
			else return sched[0].update(oSched);
		})
		.then((newSched) => {
			exports.logSchedule(newSched.get('LogId'), 'Schedule updated');
			return newSched.toJSON();
		});
}

exports.startStopSchedule = (uid, sid, isStart, execute) => {
	return User.findById(uid, { attributes: [ 'id', 'username' ] })
		.then((oUser) => {
			let opt = {
				where: { id: sid },
				include: [ CodeModule ]
			}
			if(isStart) {
				opt.include.push(ModPersist);
				opt.include.push({ model: User, attributes: [ 'username' ] });
			}
			return oUser.getSchedules(opt);
		})
		.then((arrOldSched) => {
			if(arrOldSched.length > 0) {
				let upd = { running: isStart };
				if(isStart) {
					if(execute) upd.execute = execute;
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

exports.deleteSchedule = (uid, sid) => {
	log.info('PG | Deleting Schedule #'+sid);
	return Schedule.findById(sid, { attributes: [ 'id', 'UserId' ] })
		.then((oRecord) => {
			if(oRecord) {
				if(oRecord.get('UserId') === uid) {
					deleteLog('schedule_'+sid);
					deleteLog('schedule_data_'+sid);
					return oRecord.destroy();
				}
				else throwStatusCode(403, 'You are not the owner of this Schedule!');
			} else throwStatusCode(404, 'Schedule doesn\'t exist!');
		})
};

function checkScheduleExists(uid, sid) {
	return Schedule.findOne({
		where: {
			id: sid,
			UserId: uid
		},
		attributes: [ 'id' ]
	})
	.then((oSched) => {
		if(!oSched) throwStatusCode(404, 'Schedule not found for user')
	});
}

exports.logSchedule = (sid, msg) => {
	return setLog('schedule', sid, msg);
};

exports.getScheduleLog = (uid, sid) => {
	return checkScheduleExists(uid, sid)
		.then(() => getLog('schedule', sid));
};

exports.clearScheduleLog = (uid, sid) => {
	return checkScheduleExists(uid, sid)
		.then(() => deleteLog('schedule_'+sid))
		.catch(ec);
};

exports.logScheduleData = (sid, data) => {
	return setLogData('schedule', sid, data);
};

exports.getScheduleDataLog = (uid, sid) => {
	return checkScheduleExists(uid, sid)
		.then(() => getDataLog('schedule', sid));
};

exports.clearScheduleDataLog = (uid, sid) => {
	return checkScheduleExists(uid, sid)
		.then(() => deleteLog('schedule_data_'+sid))
		.catch(ec);
};



// ##
// ## Log
// ##

function setLog(mod, id, msg) {
	return new Promise((resolve, reject) => {
		msg = moment().format('YYYY/MM/DD HH:mm:ss.SSS (UTCZZ)')+' | '+msg;
		fs.appendFile(logDir+'/'+mod+'_'+id+'.log', msg.substring(0, 255)+'\n', (err) => {
			if(err) reject(err);
			else resolve();
		});
	})
	.catch((err) => {
		log.info(err);
		fs.appendFile(logDir+'/'+lid+'.log', 'Error: '+err.message+'\n');
	});
}
function setLogData(mod, id, data) {
	return new Promise((resolve, reject) => {
		let oLogVal = JSON.stringify({
			timestamp: (new Date()).getTime(),
			data: data
		});
		fs.appendFile(logDir+'/'+mod+'_data_'+id+'.log', oLogVal+'\n', (err) => {
			if(err) reject(err);
			else resolve();
		});
	})
	.catch((err) => {
		setLog(mod, id, 'Error: '+err.message);
	});
}

function getLog(mod, id) {
	return new Promise((resolve, reject) => {
		fs.readFile(logDir+'/'+mod+'_'+id+'.log', 'utf-8', (err, data) => {
			if(err) resolve([]);
			else resolve(data.split('\n').reverse());
		})
	})
}
function getDataLog(mod, id) {
	return new Promise((resolve, reject) => {
		fs.readFile(logDir+'/'+mod+'_data_'+id+'.log', 'utf-8', (err, data) => {
			log.info(err);
			// In the current architecture it causes a lot less pain to just return the empty array
			if(err) resolve([]);
			else {
				// after some benchmarking this seemed to be the fastest possibility to
				// return a parsed array of JSON objects. This also allows for very fast writes.
				// since we have one line break too much we append a null (removing the comma at the end was too expensive)
				let str = '['+data.replace(/\n/g, ',')+'null]';
				// parse the now valid JSON
				let res;
				try {
					res = JSON.parse(str);
				} catch(err) {
					log.info('Error parsing data log file of "'+mod+'_data_'+id+'.log": '+err.message);
					setLog(mod, id, '!!! Error parsing data log file: '+err.message);
					res = [null];
				}
				// and pop the null immediately again
				res.pop();
				resolve(res);
			};
		})
	})
}

function deleteLog(uniqueID) {
	log.info('PG | Deleting log "'+uniqueID+'.log"')
	fs.unlink(logDir+'/'+uniqueID+'.log', (err) => {
		if(err) log.info('PG | Log "'+uniqueID+'.log" didn\'t exist!')
	});
}
