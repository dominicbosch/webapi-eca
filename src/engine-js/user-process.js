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
	, oRules = {}
	, oActArgs = {}
	;

function sendToParent(obj) {
	try {
		process.send(obj);
	} catch(err) {
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
	}),
	data: (rid, msg) => sendLog('ruledata', {
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
		case 'action':
			let oe = oMsg.evt;
			let oFuncs = oActArgs[oe.rid][oe.aid];
			for(let el in oFuncs) {
				try {
					oRules[oe.rid][oe.aid][el].apply(this, oFuncs[el]);
				} catch(err) {
					log.rule(oe.rid, err.toString());
				}
			}
		break; 
		default: console.log('unknown command on child', oMsg)
	}
});

function newRule(oRule) {
	var oPers = oRule.ModPersists;

	if(!oRules[oRule.id]) oRules[oRule.id] = {};
	if(!oActArgs[oRule.id]) oActArgs[oRule.id] = {};

	log.rule(oRule.id, 'Rule "'+oRule.name+'" initializes modules ');
	log.debug('UP | Rule "'+oRule.name+'" initializes modules: ');
	console.log(JSON.stringify(oRule, null, 2));
	for(let i = 0; i < oRule.actions.length; i++) {
		let oAction = oRule.actions[i];
		let oModule = oRule.actionModules[oAction.id];
		console.log('UP | Rule "'+oRule.name+'" initializes module -> '+oModule.name);
		// log.debug('UP | Rule "'+oRule.name+'" initializes module -> '+oModule.name);

		for(let j = 0; j < oAction.functions.length; j++) {
			let oActFunc = oAction.functions[j];
			console.log('UP | Rule "'+oRule.name+'" initializes module function -> '+oActFunc.name);
			let arrRequiredArguments = oModule.functions[oActFunc.name];
			console.log(arrRequiredArguments);
			for(let k = 0; k < arrRequiredArguments.length; k++) {
				let val = oActFunc.args[arrRequiredArguments[k]];
				if(val===undefined) console.warn('UP | Missing argument: ' + arrRequiredArguments[k])
				else {
					console.log('attaching', arrRequiredArguments[k], val);
				}
			}
		}


		// let requiredFunctions = requiredModule.functions; // the functions in the rules
		// let oFuncArgs = oRule.actions.filter((o) => o.id === requiredModule.id)[0].functions;
		// // Here we store the arguments in the internal data structure:
		// let oAct = oActArgs[oRule.id][requiredModule.id] = {};
		// for(let af in requiredFunctions) {
		// 	oAct[af] = [];
		// 	for (var i = 0; i < requiredFunctions[af].length; i++) {
		// 		oAct[af].push(oFuncArgs[af][requiredFunctions[af][i]]);
		// 	}
		// }


		// Attach persistent data if it exists
		let pers;
		if(oPers !== undefined) {
			for (let i = 0; i < oPers.length; i++) {
				if(oPers[i].moduleId === oModule.id) pers = oPers[i].data;
			}
		}
		if(pers === undefined) pers = {};
		runModule(null, oRule.id, oModule, oAction.globals, pers, oRules[oRule.id]);
	}
	// for(let id in oRule.actionModules) {
	// 	let requiredModule = oRule.actionModules[id];
	// 	log.debug('UP | Rule "'+oRule.name+'" initializes module -> '+requiredModule.name);

	// 	let requiredFunctions = requiredModule.functions; // the functions in the rules
	// 	let oFuncArgs = oRule.actions.filter((o) => o.id === requiredModule.id)[0].functions;
	// 	// Here we store the arguments in the internal data structure:
	// 	let oAct = oActArgs[oRule.id][requiredModule.id] = {};
	// 	for(let af in requiredFunctions) {
	// 		oAct[af] = [];
	// 		for (var i = 0; i < requiredFunctions[af].length; i++) {
	// 			oAct[af].push(oFuncArgs[af][requiredFunctions[af][i]]);
	// 		}
	// 	}

	// 	// Attach persistent data if it exists
	// 	let pers;
	// 	if(oPers !== undefined) {
	// 		for (let i = 0; i < oPers.length; i++) {
	// 			if(oPers[i].moduleId === requiredModule.id) pers = oPers[i].data;
	// 		}
	// 	}
	// 	if(pers === undefined) pers = {};
	// 	runModule(id, oRule.id, requiredModule, pers, oRules[oRule.id]);
	// }
}

function runModule(id, rid, oMod, globals, persistence, oStore) {
	let opts = {
		globals: globals || {},
		modules: oMod.modules,
		persistence: persistence,
		logger: (msg) => {
			try {
				log.debug('trying to log');
				log.debug(msg);
				log.rule(rid, msg.toString().substring(0, 200));
			} catch(err) {
				log.debug(err.toString());
				log.rule(rid, 'It seems you didn\'t log a string. Only strings are allowed for the function log(msg)');
			}
		},
		datalogger: (msg) => log.data(rid, msg),
		persist: (data) => sendToParent({
			cmd: 'persist',
			data: {	
				rid: rid, 
				cid: oMod.id, 
				data: data
			}
		})
	};

	console.log('Running Globals', opts.globals);
	let name = (oStore === oEventTriggers) ? 'Event Trigger' : 'Action Dispatcher';
	log.rule(rid, ' --> Loading '+name+' "'+oMod.name+'"...');
	return dynmod.runStringAsModule(oMod.code, oMod.lang, oMod.User.username, opts)
		.then((answ) => {
			log.rule(rid, ' --> '+name+' "'+oMod.name+'" (v'+oMod.version+') loaded');
			log.info('UP | '+name+' "'+oMod.name+'" loaded for user '+oMod.User.username);
			oStore[id] = answ.module;
		})
		.catch((err) => log.error(err))
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


