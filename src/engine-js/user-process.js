'use strict';

// Code Executor
// =============
// > A dedicated process instance for each user with limited memory use

// **Loads Modules:**
	// [Process Logger](process-logger.html)
let pl = require('./process-logger')
	// [Dynamic Modules](dynamic-modules.html)
	, dynmod = require('./dynamic-modules')
	// - [Engine](engine.html)
	, engine = require('./engine')

	// - External Modules: [later](http://bunkat.github.io/later/)
	, later = require('later')

	, oSchedules = {}
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
	logschedule: (sid, msg) => sendToParent({ cmd: 'logschedule', data: {
		sid: sid, 
		msg: msg
	}}),
	event: (evt) => sendToParent({ cmd: 'event', data: evt }),
	ruledatalog: (data) => sendToParent({ cmd: 'ruledatalog', data: data }),
	rulepersist: (data) => sendToParent({ cmd: 'rulepersist', data: data }),
	schedulepersist: (data) => sendToParent({ cmd: 'schedulepersist', data: data }),
	scheduledatalog: (data) => sendToParent({ cmd: 'scheduledatalog', data: data }),
	schedulefails: (sid, msg) => sendToParent({ cmd: 'schedulefails', data: { sid: sid, msg: msg } })
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
		case 'schedule:start':
			let sched = oMsg.schedule;
			oSchedules[sched.id] = {
				trigger: null,
				schedule: sched
			};

			// // If the Event Trigger is already running we restart it due to changes
			// if(oEventTriggers[trigger.id]) {
			// 	send.logschedule(trigger.id, 'Restaring due to changes!')
			// 	startSchedule(trigger);
			// }

			// }
			// startSchedule(trigger);
		break;
		case 'schedule:stop':
			let sid = oMsg.sid;
			console.log('TODO implement Schedule stop for '+sid);
		break;
		case 'event':
			engine.processEvent(oMsg.evt);
		break;
		default: console.log('unknown command on child', oMsg)
	}
});

function startSchedule(trigger) {
	// Attach persistent data if it exists
	let pers;
	let oPers = trigger.ModPersists;
	if(oPers !== undefined) {
		for (let i = 0; i < oPers.length; i++) {
			if(oPers[i].moduleId === trigger.id) pers = oPers[i].data;
		}
	}
	if(pers === undefined) pers = {};

	send.logschedule(trigger.id, ' --> Loading Event Trigger "'+trigger.name+'"...');
	let store = {
		log: (msg) => {
			try {
				send.logschedule(trigger.id, msg.toString().substring(0, 200));
			} catch(err) {
				send.loginfo(err.toString());
				send.logschedule(trigger.id, 'It seems you didn\'t log a string. Only strings are allowed for the function log(msg)');
			}
		},
		data: (msg) => send.scheduledatalog({ cid: trigger.id, msg: msg }),
		persist: (data) => send.schedulepersist({ cid: trigger.id, persistence: data })
	};
	
	dynmod.runModule(store, trigger.Schedule.globals, pers)
		.then((oMod) => oRules[oRule.id].modules[trigger.id] = oMod)
		.then((mod) => {
			oEventTriggers[trigger.id] = mod;
			// Since module has been loaded succesfully, we now execute it according to the schedule
			let schedule = later.parse.text(trigger.Schedule.text)

			send.logschedule(trigger.id, ' --> Event Trigger "'+trigger.name+'" (v'+trigger.version+') loaded');
			send.logworker('UP | Event Trigger "'+trigger.name+'" loaded for user '+trigger.User.username);
		})
		.catch((err) => {
			send.logerror(err.toString()+'\n'+err.stack);
			send.schedulefails(trigger.id, err.toString());
		})

}


// TODO list all modules the worker process has loaded and tell from which module it was required
