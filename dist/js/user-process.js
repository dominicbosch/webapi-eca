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
	console.log('Your user process produced an error! PID #'+process.pid);
	console.log(err.stack);
});
process.on('disconnect', () => {
	console.log('UP | Shutting down Code Executor with PID #'+process.pid);
	process.exit();
});

// Message Passing Interface: Incoming from main process
process.on('message', (oMsg) => {
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
			engine.deleteRule(oMsg.rid);
		break;
		case 'schedule:start':
			let sched = oMsg.schedule;
			oSchedules[sched.id] = {
				timer: null,
				schedule: sched
			};
			startSchedule(oSchedules[sched.id]);
		break;
		case 'schedule:stop':
			let sid = oMsg.sid;
			let obj = oSchedules[sid];
			if(obj) {
				send.loginfo('UP('+process.pid+') | Stopping Schedule #'+sid+' "'+obj.schedule.name+'"!');
				send.logschedule(sid, 'Stopping Schedule #'+sid+' "'+obj.schedule.name+'"!');
				if(obj.timer) obj.timer.clear();
				delete oSchedules[sid];
			} else {
				send.loginfo('UP('+process.pid+') | Can\'t stop Schedule #'+sid+' because it is not running!');
				send.logschedule(sid, 'Can\'t stop Schedule #'+sid+' because it is not running!');
			}
		break;
		case 'event':
			engine.processEvent(oMsg.evt);
		break;
		default: console.log('unknown command on child', oMsg)
	}
});

function startSchedule(oExecution) {
	let oSched = oExecution.schedule;
	send.loginfo('UP('+process.pid+') | Starting new Schedule #'+oSched.id+' "'+oSched.name+'"!');
	// Attach persistent data if it exists
	let oPers = {};
	if(oSched.ModPersist) oPers = oSched.ModPersist.data;
	send.logschedule(oSched.id, ' --> Loading Event Trigger "'+oSched.CodeModule.name+'"...');
	let store = {
		log: (msg) => {
			try {
				send.logschedule(oSched.id, msg.toString().substring(0, 200));
			} catch(err) {
				send.loginfo(err.toString());
				send.logschedule(oSched.id, 'It seems you didn\'t log a string. Only strings are allowed for the function log(msg)');
			}
		},
		data: (dat) => {
			try {
				JSON.stringify(dat);
				send.scheduledatalog({ sid: oSched.id, msg: dat });
			} catch(err) {
				send.logschedule(oSched.id, '!!! Error logging your data: '+err.message);
			}
		},
		persist: (data) => send.schedulepersist({ sid: oSched.id, persistence: data }),
		event: send.event
	};
	
	dynmod.runModule(store, oSched.CodeModule, oSched.execute.globals, oPers, oSched.User.username)
		.then((oMod) => {
			let schedule = later.parse.text(oSched.text);
			let func = oSched.execute.functions[0];
			let arrArgs = oSched.CodeModule.functions[func.name];
			let args = [];
			for (let i = 0; i < arrArgs.length; i++) {
				args.push(func.args[arrArgs[i]]);
			};
			let trigger = () => {
				send.logschedule(oSched.id, 'Polling with "'+func.name+'"');
				try {
					oMod[func.name].apply(null, args);
				} catch(err) {
					send.logschedule(oSched.id, '!!! ERROR: ' + err.message);
				}
			}
			// Since module has been loaded succesfully, we now execute it according to the schedule
			if(oExecution.timer) oExecution.timer.clear();
			// Execute the trigger immediately so we don't have to wait for the first schedule occurence
			trigger();
			oExecution.timer = later.setInterval(trigger, schedule);
			send.loginfo('UP('+process.pid+') | Event Trigger "'+oSched.CodeModule.name+'" loaded for user "'+oSched.User.username+'"');
			send.logschedule(oSched.id, ' --> Event Trigger "'+oSched.CodeModule.name+'" (v'+oSched.CodeModule.version+') loaded');
			send.logworker('Event Trigger "'+oSched.CodeModule.name+'" loaded');
		})
		.catch((err) => {
			send.logerror(err.toString()+'\n'+err.stack);
			send.schedulefails(oSched.id, err.toString());
		})

}

