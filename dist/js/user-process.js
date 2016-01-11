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

	// - External Modules: [later](http://bunkat.github.io/later/)
	, later = require('later')

	, oEventTriggerCodes = {}
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
	loginfo: (msg) => sendToParent({ cmd: 'log:info', data: msg }),
	logerror: (msg) => sendToParent({ cmd: 'log:error', data: msg }),
	logworker: (msg) => sendToParent({ cmd: 'logworker', data: msg }),
	logrule: (rid, msg) => sendToParent({ cmd: 'logrule', data: {
		rid: rid, 
		msg: msg
	}}),
	logtrigger: (cid, msg) => sendToParent({ cmd: 'logtrigger', data: {
		cid: cid, 
		msg: msg
	}}),
	event: (evt) => sendToParent({ cmd: 'event', data: evt }),
	ruledatalog: (data) => sendToParent({ cmd: 'ruledatalog', data: data }),
	rulepersist: (data) => sendToParent({ cmd: 'rulepersist', data: data }),
	triggerpersist: (data) => sendToParent({ cmd: 'triggerpersist', data: data }),
	triggerdatalog: (data) => sendToParent({ cmd: 'triggerdatalog', data: data }),
	triggerfails: (cid, msg) => sendToParent({ cmd: 'triggerfails', data: { cid: cid, msg: msg } })
};

send.startup();

engine.setSend(send);

process.on('uncaughtException', (err) => {
	console.log('Your user process produced an error!');
	console.log(err.stack);
});
process.on('disconnect', () => {
	console.log('UP | Shutting down Code Executor');
	process.exit();
});

// Message Passing Interface: Incoming from main process
process.on('message', (oMsg) => {
	let trigger, glob;
	console.log('got message', oMsg)
	switch(oMsg.cmd) {
		case 'init':
			pl(send.stats, oMsg.startIndex);
			send.loginfo('Starting up with initial stats log index ' + oMsg.startIndex);
		break;
		case 'modules:allowed':
			dynmod.newAllowedModuleList(oMsg.arr);
		break;
		case 'rule:new':
			engine.newRule(oMsg.rule);
		break;
		case 'rule:delete':
			engine.deleteRule(oMsg.id);
		break;
		case 'eventtrigger:new':
			trigger = oMsg.trigger;
			glob = trigger.Schedule.globals;
			oEventTriggerCodes[trigger.id] = trigger;
			for(let el in trigger.globals) {
				if(trigger.globals[el]) glob[el] = encryption.decrypt(glob[el] || '');
			}
			// If the Event Trigger is already running we restart it due to changes
			if(oEventTriggers[trigger.id]) {
				send.logtrigger(trigger.id, 'Restaring due to changes!')
				startEventTrigger(trigger);
			}
		break;
		case 'eventtrigger:start':

			trigger = oEventTriggerCodes[oMsg.eid];
			glob = trigger.Schedule.globals;
			trigger.Schedule.globals = oMsg.globals;
			for(let el in trigger.globals) {
				if(trigger.globals[el]) glob[el] = encryption.decrypt(glob[el] || '');
			}
			startEventTrigger(trigger);
		break;
		case 'eventtrigger:stop':
			console.log('TODO implement ET stop');
			console.log('Worker got new event trigger:'+oMsg.trigger);
		break;
		case 'event':
			engine.processEvent(oMsg.evt);
		break;
		default: console.log('unknown command on child', oMsg)
	}
});

function startEventTrigger(trigger) {
	// Attach persistent data if it exists
	let pers;
	let oPers = trigger.ModPersists;
	if(oPers !== undefined) {
		for (let i = 0; i < oPers.length; i++) {
			if(oPers[i].moduleId === trigger.id) pers = oPers[i].data;
		}
	}
	if(pers === undefined) pers = {};

	send.logtrigger(trigger.id, ' --> Loading Event Trigger "'+trigger.name+'"...');
	let store = {
		log: (msg) => {
			try {
				send.logtrigger(trigger.id, msg.toString().substring(0, 200));
			} catch(err) {
				send.loginfo(err.toString());
				send.logtrigger(trigger.id, 'It seems you didn\'t log a string. Only strings are allowed for the function log(msg)');
			}
		},
		data: (msg) => send.triggerdatalog({ cid: trigger.id, msg: msg }),
		persist: (data) => send.triggerpersist({ cid: trigger.id, persistence: data })
	};
	
	dynmod.runModule(store, trigger.Schedule.globals, pers)
		.then((oMod) => oRules[oRule.id].modules[trigger.id] = oMod)
		.then((mod) => {
			oEventTriggers[trigger.id] = mod;
			// Since module has been loaded succesfully, we now execute it according to the schedule
			let schedule = later.parse.text(trigger.Schedule.text)

			send.logtrigger(trigger.id, ' --> Event Trigger "'+trigger.name+'" (v'+trigger.version+') loaded');
			send.logworker('UP | Event Trigger "'+trigger.name+'" loaded for user '+trigger.User.username);
		})
		.catch((err) => {
			send.logerror(err.toString()+'\n'+err.stack);
			send.triggerfails(trigger.id, err.toString());
		})

}


// TODO list all modules the worker process has loaded and tell from which module it was required
