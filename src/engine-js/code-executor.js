// 'use strict';

// Code Executor
// =============
// > A dedicated process instance for each user with limited memory use

// **Loads Modules:**
// 	// and [Dynamic Modules](dynamic-modules.html)
// 	// dynmod = require('./dynamic-modules')
// 	;

function sendLog(level, msg) {
	try {
		process.send({
			cmd: 'log',
			data: {
				level: level,
				msg: msg
			}
		});
	} catch(err) {
		console.error(err);
	}
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
}, 10000);
log.info('Child started with PID #'+process.pid+'!');