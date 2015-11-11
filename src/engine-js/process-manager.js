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
	oConf,
	oChildren = {};

geb.addListener('firebase:init', (oc) => {
	oConf = oc;
	log.info('PM | Succcessfully connected to DB, Initialzing Users');
	// Load the standard users from the user config file if they are not already existing
	let pathUsers = path.resolve(__dirname, '..', 'config', 'users.json');
	let arrUsers = JSON.parse(fs.readFileSync(pathUsers, 'utf8'));
	db.getUsers((err, arrReply) => {
		if(err) {
			log.error(err);
			arrReply = [];
		}
		let arrUsernames = arrReply.map((o) => o.username);
		for(let username in arrUsers) {
			if(arrUsernames.indexOf(username) === -1) {
				arrUsers[username].username = username;
				db.storeUser(arrUsers[username], (err, oUser) => {
					log.info('PM | User '+oUser.username+' successfully stored with ID#'+oUser.id);
					exports.startWorker(oUser);
				});
			}
		}
		for(let i = 0; i < arrReply.length; i++) {
			exports.startWorker(arrReply[i]);
		}
	});
	fb.getLastIndex('webapi-eca-system', (err, id) => {
		pl(registerProcessLogger(null, 'webapi-eca-system'), id);
	})
});

geb.addListener('system:shutdown', () => {
	fb.logState('webapi-eca-system', 'shutdown', (new Date().getTime()))
});

function registerProcessLogger(uid, username) {
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

exports.killWorker = function(oUser, cb) {
	if(oChildren[oUser.id]) {
		oChildren[oUser.id].kill('SIGINT');
		log.warn('PM | Killed user process for user ID#'+oUser.id);
		fb.logState(oUser.username, 'shutdown', (new Date().getTime()))
		db.setWorker(oUser.id, null)
		oChildren[oUser.id] = null;
		cb(null);
	} else cb(new Error('Process not running!'))
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

