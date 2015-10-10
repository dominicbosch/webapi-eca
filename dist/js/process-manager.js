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
					forkChild(oUser);
				});
			}
		}
	});
	pl((stats) => fb.logStats('webapi-eca-system', stats));
});

geb.addListener('user:startworker', forkChild);

geb.addListener('user:killworker', (oUser) => {
	if(oChildren[oUser.id]) {
		oChildren[oUser.id].kill();
		log.warn('PM | Killed user process for user ID#'+oUser.id);
		db.setWorker(oUser.id, null)
		oChildren[oUser.id] = null;
	}
});

function forkChild(oUser) {
	var options = {
		execArgv: ['--max-old-space-size=20']
	};
	if(oChildren[oUser.id]) {
		log.warn('PM | Dedicated process for user '+oUser.username+' already existing with PID '+oChildren[oUser.id].pid);
	} else {
		let proc = cp.fork(path.resolve(__dirname, 'code-executor'), [], options);
		log.info('PM | Started dedicated process with PID '+proc.pid+' for user '+oUser.username);
		oChildren[oUser.id] = proc;
		db.setWorker(oUser.id, proc.pid)
		proc.on('message', (o) => {
			switch(o.cmd) {
				case 'log': db.logProcess(oUser.id, o.data);
					break;
				case 'stats': fb.logStats(oUser.username, o.data);
					break;
			}
		});
	}
}

