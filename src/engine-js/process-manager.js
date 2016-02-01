'use strict';

// Process Manager
// ===============
// > Manages the dedicated processes per user

// **Loads Modules:**
// - [Logging](logging.html)
let log = require('./logging'),
	pl = require('./process-logger'),
	
	fb = require('./persistence/firebase'),
	encryption = require('./encryption'),
	webhooks = require('./webhooks'),

	// - Node.js Modules: [path](http://nodejs.org/api/path.html),
	path = require('path'),

	// 	[fs](http://nodejs.org/api/fs.html),
	fs = require('fs'),

	// [child_process](http://nodejs.org/api/child_process.html)
	cp = require('child_process'),

	geb = global.eventBackbone,
	db = global.db,
	arrAllowed,
	systemName = '➠ System',
	maxMem = 200,
	oChildren = {};

exports.init = (oConf) => {
	let allowedModulesPath = path.resolve(__dirname, '..', 'config', 'allowedmodules.json');
	arrAllowed = JSON.parse(fs.readFileSync(allowedModulesPath));
	log.info('PM | Initialzing Users and Loggers');
	fb.getLastIndex(systemName, (err, id) => {
		let mpi = MPI(null, systemName);
		let sendStats = (data) => mpi({ cmd: 'stats', data: data });
		pl(sendStats, id, db.getDBSize);
		mpi({
			cmd: 'startup',
			timestamp: (new Date()).getTime()
		});
	});

	// Load the standard users from the user config file if they are not already existing
	let pathUsers = path.resolve(__dirname, '..', 'config', 'users.json');
	let oUsers = JSON.parse(fs.readFileSync(pathUsers, 'utf8'));
	return db.getUsers()
		.then((arrUsers) => {
			let arrUsernames = arrUsers.map((o) => o.username);
			let arrPromises = [];

			for(let username in oUsers) {
				if(arrUsernames.indexOf(username) === -1) {
					oUsers[username].username = username;
					let p = db.storeUser(oUsers[username])
						.then((oUser) => {
							log.info('PM | User '+oUser.username
								+' successfully stored with ID#'+oUser.id);
							return startWorker(oUser);
						});
					arrPromises.push(p);
				}
			}
			for(let i = 0; i < arrUsers.length; i++) {
				arrPromises.push(startWorker(arrUsers[i]));
			}
			return Promise.all(arrPromises);
		})
}

// Process Manager heavily relies on (internal) events coming from the web services
geb.addListener('system:shutdown', () => {
	fb.logState(systemName, 'shutdown', (new Date().getTime()))
});

geb.addListener('modules:allowed', (arrModules) => {
	arrAllowed = arrModules;
	broadcast({
		cmd: 'modules:allowed',
		arr: arrModules
	});
});

geb.addListener('schedule:start', (oEvt) => {
	let sched = decryptScheduleGlobals(oEvt.schedule);
	if(sched) {
		sendToWorker(oEvt.uid, {
			cmd: 'schedule:start',
			schedule: sched
		})
	}
});
geb.addListener('schedule:stop', (oEvt) => {
	sendToWorker(oEvt.uid, {
		cmd: 'schedule:stop',
		sid: oEvt.sid
	});
});

geb.addListener('webhook:event', (oEvt) => {
	let oHook = webhooks.getByUrl(oEvt.hookurl);
	let evt = {
		cmd: 'event',
		evt: oEvt
	};
	// Here we separate public events from private ones
	if(oHook.isPublic) {
		broadcast(evt);
	} else {
		sendToWorker(oHook.UserId, evt)
	}
});

geb.addListener('rule:new', sendRuleToUser);

geb.addListener('rule:delete', (oEvt) => {
	sendToWorker(oEvt.uid, {
		cmd: 'rule:delete',
		rid: oEvt.rid
	});
});

function emitEvent(uid, evt) {
	let oHook = webhooks.getByUser(uid, evt.hookname);
	evt.hookid = oHook.id;
	evt.hookurl = oHook.hookurl;
	geb.emit('webhook:event', evt);
}

function sendToWorker(uid, evt) {
	try {
		if(oChildren[uid]) oChildren[uid].send(evt);
		else log.warn('User #'+uid+' worker process offline');
	} catch(err) {
		log.error(err);
	}
}

function broadcast(evt) {
	for(let uid in oChildren) sendToWorker(uid, evt);
}

// Message Passing Interface, Incoming from children
function MPI(uid, username) {
	log.info('PM | Registered Process Logger (uid='+uid+', username='+username+')')
	return (oMsg) => {
		let dat = oMsg.data;
		switch(oMsg.cmd) {
			case 'log:info': log.info(dat);
				break;
			case 'log:error': log.error(dat);
				break;
			case 'logworker': db.logWorker(uid, dat);
				break;
			case 'logrule': db.logRule(dat.rid, dat.msg);
				break;
			case 'logschedule': db.logSchedule(dat.sid, dat.msg);
				break;
			case 'ruledatalog': db.logRuleData(dat.rid, dat.msg);
				break;
			case 'rulepersist': db.persistRuleData(dat.rid, dat.cid, dat.persistence);
				break;
			case 'scheduledatalog': db.logScheduleData(dat.sid, dat.msg);
				break;
			case 'schedulepersist': db.persistScheduleData(dat.sid, dat.persistence);
				break;
			case 'schedulefails':
				db.startStopSchedule(uid, dat.sid, false);
				db.logSchedule(dat.sid, dat.msg);
				break;
			case 'event': emitEvent(uid, dat);
				break;
			case 'startup':
			case 'shutdown': fb.logState(username, oMsg.cmd, oMsg.timestamp);
				break;
			case 'stats': fb.logStats(username, dat);
				break;
			default: log.warn('PM | Got unknown command:' + oMsg.cmd);
		}
	}
}
function sendRuleToUser(oRule) {
	let arrPromises = [];
	// The user process ha no DB connection so we need to send it all the required 
	// Action dispatchers that are needed for the module
	for(let i = 0; i < oRule.actions.length; i++) {
		arrPromises.push(db.getActionDispatcher(oRule.actions[i].id));
	}
	Promise.all(arrPromises)
		.then((arr) => {
			oRule.actionModules = {};
			for(let i = 0; i < arr.length; i++) {
				oRule.actionModules[arr[i].id] = arr[i];
			}

			// Decrypt global action parameters before notifying the user process
			for(let i = 0; i < oRule.actions.length; i++) {
				let oAction = oRule.actions[i];
				let glob = oAction.globals;
				for(let el in glob) {
					if(oRule.actionModules[oAction.id].globals[el]) {
						oAction.globals[el] = encryption.decrypt(oAction.globals[el] || '');
					}
				}
			}
			sendToWorker(oRule.UserId, {
				cmd: 'rule:new',
				rule: oRule
			});
		})
		.catch((err) => console.error(err));
}

function startWorker(oUser) {
	return new Promise((resolve, reject) => {
		var options = {
			// execArgv: ['--max-old-space-size=10']
			execArgv: ['--max-old-space-size='+maxMem]
			// , stdio: 'inherit'
			// , stdio: [ 0, 0, 0 ]
		};
		if(oChildren[oUser.id]) {
			log.warn('PM | Dedicated process for user '+oUser.username
				+' already existing with PID '+oChildren[oUser.id].pid);
			throw new Error('Process already running');
		} 
		fb.getLastIndex(oUser.username, (err, id) => {
			if(err) reject(err);
			else try {
				let proc = cp.fork(path.resolve(__dirname, 'user-process'), [], options);
				oChildren[oUser.id] = proc;
				log.info('PM | Started dedicated process with PID '+proc.pid+' for user '+oUser.username);
				db.setWorker(oUser.id, proc.pid)
					.then(() => {
						proc.on('message', MPI(oUser.id, oUser.username));
						sendToWorker(oUser.id, {
							cmd: 'init',
							startIndex: id,
							host: ''
						});
					})
					.then(() => resolve())
					.catch(reject);
			} catch(err) {
				reject(err);
			}
		});
	})
	// After a worker has been started it needs to know which modules are allowed
	.then(() => sendToWorker(oUser.id, {
		cmd: 'modules:allowed',
		arr: arrAllowed
	}))
	// After a worker has been started it needs to receive all its rules
	.then(() => db.getAllRules(oUser.id, true))
	.then((arr) => {
		for(var i = 0; i < arr.length; i++) sendRuleToUser(arr[i]);
	})
	// After a worker has been started, rules were loaded it needs to receive all running event triggers
	.then(() => db.getSchedule(oUser.id))
	.then((arr) => {
		for(var i = 0; i < arr.length; i++) {
			if(arr[i].running) {
				let sched = decryptScheduleGlobals(arr[i]);
				if(sched) {
					sendToWorker(oUser.id, {
						cmd: 'schedule:start',
						schedule: sched
					})
				}
			}
		}
	});
}

function decryptScheduleGlobals(oSched) {
	db.logSchedule(oSched.id, 'Starting Schedule!');

	// Check valid global paremeters
	let glob = oSched.execute.globals;
	let hasNoErr = true;
	for(let el in oSched.CodeModule.globals) {
		if(!glob[el]) {
			db.logSchedule(oSched.id, 'Your Event Trigger seems to have changed!'
				+' Missing global parameter "'+el+'". Please edit this Schedule!');
			hasNoErr = false;

		} else if(oSched.CodeModule.globals[el]) glob[el] = encryption.decrypt(glob[el] || '');
	}

	// Check valid function arguments
	let exefunc = oSched.execute.functions[0];
	let arrArgs = oSched.CodeModule.functions[exefunc.name];
	for(let i = 0; i < arrArgs.length; i++) {
		if(!exefunc.args[arrArgs[i]]) {
			db.logSchedule(oSched.id, 'Your Event Trigger seems to have changed!'
				+' Missing function argument "'+arrArgs[i]+'". Please edit this Schedule!');
			hasNoErr = false;
		}
	}

	if(hasNoErr) return oSched;
	else {
		db.setErrorSchedule(oSched.UserId, oSched.id, 'Your Event Trigger requires more values than '
				+'you provided in your Schedule! Please edit schedule!')
			.catch((err) => log.error(err));
		return null;
	}
}

function killWorker(uid, uname) {
	return new Promise((resolve, reject) => {
		if(!oChildren[uid]) reject('Process not running!');
		else {
			oChildren[uid].kill('SIGINT');
			log.warn('PM | Killed user process for user ID#'+uid);
			fb.logState(uname, 'shutdown', (new Date().getTime()))
			db.setWorker(uid, null)
				.then(() => {
					oChildren[uid] = null;
					resolve();
				})
				.catch((err) => reject(err))
		}
	});
}

exports.setMaxMem = function(memsize) {
	maxMem = parseInt(memsize) || 50;
	return maxMem;
};
exports.getMaxMem = function() { return maxMem };
exports.startWorker = startWorker;
exports.killWorker = killWorker;
