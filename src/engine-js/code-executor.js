'use strict';

// Code Executor
// =============
// > A dedicated process instance for each user with limited memory use

// **Loads Modules:**
	// and [Process Logger](process-logger.html)
var pl = require('./process-logger');

function sendToParent(obj) {
	try {
		process.send(obj);
	} catch(err) {
		console.error(err);
	}
}

pl((stats) => sendToParent({
	cmd: 'stats',
	data: stats
}));

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
	console.error('Your Code Executor produced an error!');
	console.error(err);
});
process.on('disconnect', () => {
	console.log('TP | Shutting down Code Executor');
	process.exit();
});
process.on('message', (msg) => {
	log.info('Child got command: ' + msg.cmd);
});

