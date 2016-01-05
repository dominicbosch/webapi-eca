'use strict';

// Code Executor
// =============
// > A dedicated process instance for each user with limited memory use

// **Loads Modules:**
	// [Process Logger](process-logger.html)
let pl = require('./process-logger')
	// [Dynamic Modules](dynamic-modules.html)
	, dynmod = require('./dynamic-modules')
	// [Encryption](encryption.html)
	, encryption = require('./encryption')
	// - [Engine](engine.html)
	, engine = require('./engine')

	, oEventTriggers = {}
	;
// Message Passing Interface: Outgoing to main process
function sendToParent(obj) {
	try {
		process.send(obj);
	} catch(err) {
		// Actually we should die here, right?
		console.error(err);
	}
}

let send = {
	startup: () => sendToParent({ cmd: 'startup', timestamp: (new Date()).getTime() }),
	stats: (stats) => sendToParent({ cmd: 'stats', data: stats }),
	log: (level, msg) => sendToParent({ cmd: 'log:'+level, data: msg }),
	event: (evt) => sendToParent({ cmd: 'event', data: evt }),
	datalog: (data) => sendToParent({ cmd: 'datalog', data: data }),
	persist: (data) => sendToParent({ cmd: 'persist', data: data })
};

send.startup();

let log = {
	info: (msg) => send.log('info', msg),
	worker: (msg) => send.log('worker', msg),
	error: (msg) => send.log('error', msg),
	rule: (rid, msg) => send.log('rule', {
		rid: rid, 
		msg: msg
	})
};
engine.setLogger(log);

process.on('uncaughtException', (err) => {
	console.log('Your user process produced an error!');
	console.log(err);
});
process.on('disconnect', () => {
	console.log('UP | Shutting down Code Executor');
	process.exit();
});

// Message Passing Interface: Incoming from main process
process.on('message', (oMsg) => {
	console.log('got message', oMsg)
	switch(oMsg.cmd) {
		case 'init':
			pl(send.stats, oMsg.startIndex);
			log.info('Starting up with initial stats log index ' + oMsg.startIndex);
		break;
		case 'modules:allowed':
			dynmod.newAllowedModuleList(oMsg.arr);
		break;
		case 'rule:new':
			engine.newRule(oMsg.rule);
		break;
		case 'rule:delete':
			deleteRule(oMsg.id);
		break;
		case 'eventtrigger:new':
			console.log('TODO implement ET new');
			// engine.runModule();
		break;
		case 'eventtrigger:start':
			console.log('TODO implement ET start');
		break;
		case 'eventtrigger:stop':
			console.log('TODO implement ET stop');
		// TODO check if is running . because it might be an update on a non running module
// 		Got event ttrigger { id: 3,
//   name: 'Hello Worldqwqwfasdasdasq',
//   lang: 'CoffeeScript',
//   version: 2,
//   code: '\n# A simple Hello World code block\nexports.pollHelloWorld = () ->\n\tlog \'Hello World!\'\n\t',
//   comment: 'A simple Hello World code block\n',
//   modules: [],
//   functions: { pollHelloWorld: [] },
//   globals: {},
//   isaction: false,
//   UserId: 1,
//   Schedule: 
//    { id: 3,
//      text: 'every 20 mins starting on the 7th min',
//      running: true,
//      CodeModuleId: 3 } }
// Worker got new event trigger:[object Object]
// Executing (default): select pg_database_size('webapi-eca')
// [11:33:42] Redeploying:  src/engine-js/process-manager.js
// [11:33:42] [nodemon] restarting due to changes...
// [11:33:42] [nodemon] starting `node dist/js/webapi-eca.js`
// [11:33:42] 
// [2015-12-21T10:33:
			console.log('Worker got new event trigger:'+oMsg.trigger);
		break;
		case 'event':
			console.log('Worker got new event, HANDLE!!!:'+oMsg);
			engine.processEvent(oMsg.evt);
		break;
		default: console.log('unknown command on child', oMsg)
	}
});

function deleteRule(id) {
	console.log('TODO: UP | Implement delete Rule');
}


// TODO list all modules the worker process has loaded and tell from which module it was required
