'use strict';

// Code Executor
// =============
// > A dedicated process instance for each user with limited memory use

// **Loads Modules:**
// 	// and [Dynamic Modules](dynamic-modules.html)
// 	// dynmod = require('./dynamic-modules')
// 	;
var os = require('os');

function sendToParent(obj) {
	try {
		process.send(obj);
	} catch(err) {
		console.error(err);
	}
}

function sendLog(level, msg) {
	sendToParent({
		cmd: 'log',
		data: {
			level: level,
			msg: msg
		}
	});
}

var log = {
	info: (msg) => sendLog('info', msg),
	warn: (msg) => sendLog('warn', msg),
	error: (msg) => sendLog('error', msg)
};

process.on('uncaughtException', (err) => {
	log.error('Your Code Executor produced an error!');
	log.error(err);
});
process.on('disconnect', () => {
	log.warn('TP | Shutting down Code Executor');
	process.exit();
});
process.on('message', (msg) => {
	log.info('Child got command: ' + msg.cmd);
});

setInterval(() => {
	sendToParent({
		cmd: 'stats',
		data: {
			timestamp: (new Date()).getTime(),
			memory: process.memoryUsage(),
			loadavg: os.loadavg()
		}
	});
}, 10*1000); // We are exhaustively sending stats to the parent
log.info('Child started with PID #'+process.pid+'!');
