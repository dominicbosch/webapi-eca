'use strict';

// Code Executor
// =============
// > A dedicated process instance for each user with limited memory use

// **Loads Modules:**
	// and [Process Logger](process-logger.html)
var pl = require('./process-logger')
	// and [Dynamic Modules](dynamic-modules.html)
	, dynmod = require('./dynamic-modules')
	, encryption = require('./encryption')

	, oEventTriggers = {}
	, oRuleModules = {} //The actual exectuable functions stored under their rules (results in duplicates)
	, oActArgs = {} // The storage for the action arguments
	;
// oActArgs has:
// 	for each rule
// 		for each action module
//			for each action (action modules can be selected several times, thus also executed several times)
// 				function arguments

function sendToParent(obj) {
	try {
		process.send(obj);
	} catch(err) {
		// Actually we should die here, right?
		console.error(err);
	}
}

function sendLog(level, msg) {
	sendToParent({
		cmd: 'log:'+level,
		data: msg
	});
}

var log = {
	debug: (msg) => sendLog('debug', msg),
	info: (msg) => sendLog('info', msg),
	warn: (msg) => sendLog('warn', msg),
	error: (msg) => sendLog('error', msg),
	rule: (rid, msg) => sendLog('rule', {
		rid: rid, 
		msg: msg
	})
};

process.on('uncaughtException', (err) => {
	console.log('Your user process produced an error!');
	console.log(err);
});
process.on('disconnect', () => {
	console.log('UP | Shutting down Code Executor');
	process.exit();
});
process.on('message', (oMsg) => {
	switch(oMsg.cmd) {
		case 'init':
			pl(sendToParent, oMsg.startIndex);
			log.debug('Starting up with initial stats log index ' + oMsg.startIndex);
		break;
		case 'modules:list':
			dynmod.newAllowedModuleList(oMsg.arr);
		break;
		case 'rule:new':
			newRule(oMsg.rule);
		break;
		case 'rule:delete':
			deleteRule(oMsg.id);
		break;
		case 'action':
			let oe = oMsg.evt;
			let arrFuncs = oActArgs[oe.rid][oe.aid];
			for(let i = 0; i < arrFuncs.length; i++) {
				let func = arrFuncs[i];
				try {
					log.debug('Executing function '+func.name+' in action #'+oe.aid);
					oRuleModules[oe.rid][oe.aid][func.name].apply(this, func.args);
				} catch(err) {
					log.rule(oe.rid, err.toString());
				}
			}
		break; 
		default: console.log('unknown command on child', oMsg)
	}
});

// The parent process does not only send the rule but in it also execution data such as
// persistence data, function arguments and the action modules required to execute the action
function newRule(oRule) {
	var oPers = oRule.ModPersists;

	if(!oActArgs[oRule.id]) oActArgs[oRule.id] = {}; // New rule
	if(!oRuleModules[oRule.id]) oRuleModules[oRule.id] = {}; // New rule
	// We don't need any already existing actions for this module anymore because we got fresh ones
	// Since we can't remove the modules that have been 'required' by the previous modules, this
	// will likely lead to a filling of the memory and require a restart of the user process from time to time
	for(let el in oRuleModules[oRule.id]) {
		log.debug('UP | Removing module "'+el+'" from rule #'+oRule.id);
		delete oRuleModules[oRule.id][el];
	}

	log.rule(oRule.id, 'Rule "'+oRule.name+'" initializes modules ');
	log.debug('UP | Rule "'+oRule.name+'" initializes modules: ');

	// For each action in the rule we find arguments and the required module (both provided here in the rule)
	for(let i = 0; i < oRule.actions.length; i++) {
		let oAction = oRule.actions[i];
		let oModule = oRule.actionModules[oAction.id];
		// This is where we actually store all actions:
		let actFuncs = [];
		if(!oActArgs[oRule.id][oAction.id]) oActArgs[oRule.id][oAction.id] = actFuncs;

		// We use this action function for the first time in this rule (might not be the case if it's an update)

		log.debug('UP | Rule "'+oRule.name+'" initializes module -> '+oModule.name);
		// // Got through all action functions
		for(let j = 0; j < oAction.functions.length; j++) {
			let oActFunc = oAction.functions[j];
			let arrRequiredArguments = oModule.functions[oActFunc.name];
			let oFunc = {
				name: oActFunc.name,
				args: []
			};
			for(let k = 0; k < arrRequiredArguments.length; k++) {
				let val = oActFunc.args[arrRequiredArguments[k]];
				if(val===undefined) log.rule('Missing argument: ' + arrRequiredArguments[k]);
				else oFunc.args.push(val);
			}
			actFuncs.push(oFunc);
		}

		// Attach persistent data if it exists
		let pers;
		if(oPers !== undefined) {
			for (let i = 0; i < oPers.length; i++) {
				if(oPers[i].moduleId === oModule.id) pers = oPers[i].data;
			}
		}
		if(pers === undefined) pers = {};
		runModule(oModule.id, oRule.id, oModule, oAction.globals, pers, oRuleModules[oRule.id]);
	}
}

function deleteRule(id) {
	console.log('TODO: UP | Implement delete Rule');
}


function runModule(id, rid, oMod, globals, persistence, oStore) {
	let opts = {
		globals: globals || {},
		modules: oMod.modules,
		persistence: persistence,
		logger: (msg) => {
			try {
				log.rule(rid, msg.toString().substring(0, 200));
			} catch(err) {
				log.debug(err.toString());
				log.rule(rid, 'It seems you didn\'t log a string. Only strings are allowed for the function log(msg)');
			}
		},
		datalogger: (msg) =>  sendToParent({
			cmd: 'datalog',
			data: {	
				rid: rid, 
				msg: msg
			}
		}),
		persist: (data) => sendToParent({
			cmd: 'persist',
			data: {	
				rid: rid, 
				cid: oMod.id, 
				persistence: data
			}
		})
	};

	let name = (oStore === oEventTriggers) ? 'Event Trigger' : 'Action Dispatcher';
	log.rule(rid, ' --> Loading '+name+' "'+oMod.name+'"...');
	return dynmod.runStringAsModule(oMod.code, oMod.lang, oMod.User.username, opts)
		.then((answ) => {
			log.rule(rid, ' --> '+name+' "'+oMod.name+'" (v'+oMod.version+') loaded');
			log.info('UP | '+name+' "'+oMod.name+'" loaded for user '+oMod.User.username);
			oStore[id] = answ.module;
		})
		.catch((err) => log.error(err.toString()+'\n'+err.stack))
}

// TODO list all modules the worker process has loaded and tell from which module it was required

// 	fSearchAndInvokeAction = ( node, arrPath, funcName, evt, depth ) =>
// 		if not node
// 			log.error "EN | Didn't find property in user rule list: "+arrPath.join( ', ' )+" at depth "+depth
// 			return
// 		if depth is arrPath.length
// 			try
// 				log.info "EN | #{ funcName } executes..."
// 				arrArgs = []
// 				if node.funcArgs[ funcName ]
// 					# TODO do this on initiaisation and not each time an event is received
// 					for oArg in node.funcArgs[ funcName ]
// 						"// arrSelectors = oArg.value.match /#\{(.*?)\}/g"
// 						argument = oArg.value
// 						if arrSelectors
// 							for sel in arrSelectors
// 								selector = sel.substring 2, sel.length - 1
// 								data = jsonQuery( evt.body, selector ).nodes()[0]
// 								argument = argument.replace sel, data
// 								if oArg.value is sel
// 									argument = data # if the user wants to pass an object, we allow him to do so
// 						# if oArg.jsselector
// 						arrArgs.push argument #jsonQuery( evt.body, oArg.value ).nodes()[ 0 ]
// 						# else
// 						# 	arrArgs.push oArg.value
// 				else
// 					log.warn "EN | Weird! arguments not loaded for function '#{ funcName }'!"
// 					arrArgs.push null
// 				arrArgs.push evt
// 				node.module[ funcName ].apply this, arrArgs
// 				log.info "EN | #{ funcName } finished execution"
// 			catch err
// 				log.info "EN | ERROR IN ACTION INVOKER: "+err.message
// 				node.logger err.message
// 		else
// 			fSearchAndInvokeAction node[arrPath[depth]], arrPath, funcName, evt, depth+1

// TODO Maintain what happens when a rule was deleted
// 	oRule.module[ oRule.pollfunc ].apply this, arrArgs
// 	for action of oUser[updatedRuleId].rule.actions 
// 		delete oUser[updatedRuleId].actions[action] if not fRequired action


