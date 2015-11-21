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
	oChildren = {};

geb.addListener('firebase:init', (oConf) => {
	log.info('PM | Succcessfully connected to DB, Initialzing Users');
	// Load the standard users from the user config file if they are not already existing
	let pathUsers = path.resolve(__dirname, '..', 'config', 'users.json');
	let oUsers = JSON.parse(fs.readFileSync(pathUsers, 'utf8'));
	db.getUsers()
		.then((arrUsers) => {
			let arrUsernames = arrUsers.map((o) => o.username);
			for(let username in oUsers) {
				if(arrUsernames.indexOf(username) === -1) {
					oUsers[username].username = username;
					db.storeUser(oUsers[username]).then((oUser) => {
						log.info('PM | User '+oUser.username+' successfully stored with ID#'+oUser.id);
						exports.startWorker(oUser);
					})
					.catch((err) => log.error(err));
				}
			}
			for(let i = 0; i < arrUsers.length; i++) {
				exports.startWorker(arrUsers[i]);
			}
		})
		.catch((err) => log.error(err));

	fb.getLastIndex(systemName, (err, id) => {
		pl(registerProcessLogger(null, systemName), id);
	})
});

geb.addListener('system:shutdown', () => {
	fb.logState(systemName, 'shutdown', (new Date().getTime()))
});

geb.addListener('rule:new', (oRule) => {
	console.log('process manager got event about rule', oRule);
	let oChild = oChildren[oRule.UserId];
	if(oChild) {
		oChild.send(oRule);
	} else log.warn('PM | Got new rule for inactive Worker')
});

function registerProcessLogger(uid, username) {
	log.info('PM | Registered Process Logger (uid='+uid+', username='+username+')')
	return (oMsg) => {
		switch(oMsg.cmd) {
			case 'log:debug': log.info('PM | Child "'+username+'" sent: ' + JSON.stringify(oMsg.data));
				break;
			case 'log:info': db.logWorker(uid, oMsg.data);
				break;
			case 'startup':
			case 'shutdown': fb.logState(username, oMsg.cmd, oMsg.timestamp);
				break;
			case 'stats': fb.logStats(username, oMsg.data);
				break;
			default: log.warn('PM | Got unknown command:' + oMsg.comd);
		}
	}
}

exports.startWorker = function(oUser, cb) {
	var options = {
		execArgv: ['--max-old-space-size=20']
		// , stdio: [ 0, 0, 0 ]
	};
	if(oChildren[oUser.id]) {
		log.warn('PM | Dedicated process for user '+oUser.username+' already existing with PID '+oChildren[oUser.id].pid);
		if(typeof cb === 'function') cb(new Error('Process already running'))
	} else {
		fb.getLastIndex(oUser.username, (err, id) => {
			let proc = cp.fork(path.resolve(__dirname, 'user-process'), [], options);
			proc.send({
				cmd: 'init',
				startIndex: id
			});
			log.info('PM | Started dedicated process with PID '+proc.pid+' for user '+oUser.username);
			oChildren[oUser.id] = proc;
			db.setWorker(oUser.id, proc.pid);
			proc.on('message', registerProcessLogger(oUser.id, oUser.username));
			if(typeof cb === 'function') cb(null);
		});
	}
}

exports.killWorker = function(uid, uname, cb) {
	if(oChildren[uid]) {
		oChildren[uid].kill('SIGINT');
		log.warn('PM | Killed user process for user ID#'+uid);
		fb.logState(uname, 'shutdown', (new Date().getTime()))
		db.setWorker(uid, null)
		oChildren[uid] = null;
		cb(null);
	} else cb(new Error('Process not running!'))
}

