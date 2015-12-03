'use strict';

// Process Manager
// ===============
// > Manages the dedicated processes per user

// **Loads Modules:**
// - [Logging](logging.html)
var log = require('./logging'),
	pl = require('./process-logger'),
	
	fb = require('./persistence/firebase'),

	// - Node.js Modules: [path](http://nodejs.org/api/path.html),
	path = require('path'),

	// 	[fs](http://nodejs.org/api/fs.html),
	fs = require('fs'),

	// [child_process](http://nodejs.org/api/child_process.html)
	cp = require('child_process'),

	geb = global.eventBackbone,
	db = global.db,
	systemName = '➠ System',
	maxMem = 200,
	oChildren = {};

exports.init = (oConf) => {	
	log.info('PM | Initialzing Users and Loggers');

	fb.getLastIndex(systemName, (err, id) => {
		pl(registerProcessLogger(null, systemName), id, db.getDBSize);
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

geb.addListener('system:shutdown', () => {
	fb.logState(systemName, 'shutdown', (new Date().getTime()))
});

geb.addListener('modules:list', (arrModules) => {
	broadcast({
		cmd: 'modules:list',
		arr: arrModules
	});
});

function sendToWorker(uname, evt) {
	try {
		oChildren[uname].send(evt);
	} catch(err) {
		log.error(err);
	}
}
function broadcast(evt) {
	for(let uname in oChildren) {
		sendToWorker(uname, evt);
	}
}

geb.addListener('rule:new', (oRule) => {
	let arrPromises = [];
	for(let i = 0; i < oRule.actions.length; i++) {
		arrPromises.push(db.getActionDispatcher(oRule.actions[i].id));
	}
	Promise.all(arrPromises)
		.then((arr) => {
			oRule.actionModules = {};
			for(let i = 0; i < arr.length; i++) {
				oRule.actionModules[arr[i].id] = arr[i];
			}
			let evt = {
				cmd: 'rule:new',
				rule: oRule
			}
			sendToWorker(oRule.UserId, evt);
		})
});

geb.addListener('action', (oEvt) => {
	sendToWorker(oEvt.uid, {
		cmd: 'action',
		evt: oEvt
	});
});

function registerProcessLogger(uid, username) {
	log.info('PM | Registered Process Logger (uid='+uid+', username='+username+')')
	return (oMsg) => {
		switch(oMsg.cmd) {
			case 'log:debug': log.info('PM | Child "'+username+'" sent: ' + JSON.stringify(oMsg.data));
				break;
			case 'log:info': db.logWorker(uid, oMsg.data);
				break;
			case 'log:rule': db.logRule(oMsg.data.rid, oMsg.data.msg);
				break;
			case 'log:ruledata': db.logRuleData(oMsg.data.rid, oMsg.data.msg);
				break;
			case 'log:persist': db.persistRuleData(oMsg.data.rid, oMsg.data.cid, oMsg.data.data);
				break;
			case 'startup':
			case 'shutdown': fb.logState(username, oMsg.cmd, oMsg.timestamp);
				break;
			case 'stats': fb.logStats(username, oMsg.data);
				break;
			default: log.warn('PM | Got unknown command:' + oMsg.cmd);
		}
	}
}

function startWorker(oUser) {
	return new Promise((resolve, reject) => {
		var options = {
			// execArgv: ['--max-old-space-size=10']
			execArgv: ['--max-old-space-size='+maxMem]
			// , stdio: [ 0, 0, 0 ]
		};
		if(oChildren[oUser.id]) {
			log.warn('PM | Dedicated process for user '+oUser.username
				+' already existing with PID '+oChildren[oUser.id].pid);
			throw new Error('Process already running');
		} 
		fb.getLastIndex(oUser.username, (err, id) => {
			if(err) reject(err);
			else {
				let proc = cp.fork(path.resolve(__dirname, 'user-process'), [], options);
				oChildren[oUser.id] = proc;
				log.info('PM | Started dedicated process with PID '+proc.pid+' for user '+oUser.username);
				db.setWorker(oUser.id, proc.pid)
					.then(() => {
						proc.on('message', registerProcessLogger(oUser.id, oUser.username));
						sendToWorker(oUser.id, {
							cmd: 'init',
							startIndex: id
						});
					})
					.then(() => resolve());
			}
		});
	})
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
