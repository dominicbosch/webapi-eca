'use strict';

// Engine
// ==================
// > Once the heart of the WebAPI ECA System. This logic might as well be placed
// > in the user processes in the future as it shrinked a lot since the last update.
// > It mostly remains here in order to only incurr message traffic for the rules that
// > that really receive an action instead of broadcasting the event to all 


// **Loads Modules:**
// [Dynamic Modules](dynamic-modules.html)
let dynmod = require('./dynamic-modules')
	
	// - External Modules:
	//   [js-select](https://github.com/harthur/js-select)
	, jsonQuery = require('js-select')

	, oRules = {} //The actual exectuable functions stored under their rules (results in duplicates)
	, oActArgs = {} // The storage for the action arguments
	, send
	;
 
// oActArgs has:
// 	for each rule
// 		for each action module
//			for each action (action modules can be selected several times, thus also executed several times)
// 				function name as string
//				function arguments as array

// Hacky... but alright I guess
exports.setSend = (sender) => send = sender;


function prepareArgumentFunctions(arrRequired, oAvailable, rid) {
	let arrReturn = [];
	for(let k = 0; k < arrRequired.length; k++) {
		let val = oAvailable[arrRequired[k]];
		if(val===undefined) send.logrule(rid, 'Missing argument: ' + arrRequired[k]);
		else {

			// Attention! This is magic and needs your full attention ;)

			// We attach event handlers as arguments which expect the event to be handed over in
			// order to find an answer to the query whenever an event arrives. This is preprocessing to
			// process events as fast as possible
			let arg = val.trim();
			let arrSelectors = arg.match(/#\{(.*?)\}/g);
			// Only substitute selectors with data if there are any
			if(!arrSelectors) {
				arrReturn.push(() => val);
			} else {
				let sel = arrSelectors[0];
				// If the selector is the only argument that is passed, a selector array will be passed
				// which can be reused in the action dispatcher
				if(arrSelectors.length===1 && sel===arg) {
					let selector = sel.substring(2, sel.length-1);
					// If only one selector is used in a field, the whole resulting object is attached
					// This is a callback function which will be executed as soon as an event arrives
					arrReturn.push((evt) => jsonQuery(evt, selector).nodes());

				// If there was more then just a selector in the argument we will pass a string
				// and substitute all selectors beforehand
				} else {
					arrReturn.push((evt) => {
						let answer = val.trim();
						for(let k = 0; k < arrSelectors.length; k++) {
							let sel = arrSelectors[k];
							let selector = sel.substring(2, sel.length-1);
							let data = jsonQuery(evt, selector).nodes();
							if(data.length === 0) data = '[selector "'+arrSelectors[k]+'" did not select any data]';
							answer = answer.replace(new RegExp(sel, 'g'), data.toString());
						}
						return answer;
					});

				}
			}
		}
	}
	return arrReturn;
}

// The parent process does not only send the rule but in it also execution data such as
// persistence data, function arguments and the action modules required to execute the action
exports.newRule = (oRule) => {
	if(!oActArgs[oRule.id]) oActArgs[oRule.id] = {}; // New rule
	if(!oRules[oRule.id]) {
		oRules[oRule.id] = {
			rule: oRule,
			modules: {}
		}
	}; // New rule
	// We don't need any already existing actions for this module anymore because we got fresh ones
	// Since we can't remove the modules that have been 'required' by the previous modules, this
	// will likely lead to a filling of the memory and require a restart of the user process from time to time
	for(let el in oRules[oRule.id].modules) {
		send.loginfo('UP('+process.pid+') | EN | Removing module "'+el+'" from rule #'+oRule.id);
		delete oRules[oRule.id].modules[el];
	}

	send.logrule(oRule.id, 'Rule "'+oRule.name+'" initializes modules ');
	send.loginfo('UP('+process.pid+') | EN | Rule "'+oRule.name+'" initializes modules: ');

	// For each action in the rule we find arguments and the required module (both provided here in the rule)
	for(let i = 0; i < oRule.actions.length; i++) {
		let oAction = oRule.actions[i];
		let oModule = oRule.actionModules[oAction.id];
		// This is where we actually store all actions:
		let actFuncs = [];
		oActArgs[oRule.id][oAction.id] = actFuncs;

		// We use this action function for the first time in this rule (might not be the case if it's an update)

		send.loginfo('UP('+process.pid+') | EN | Rule "'+oRule.name+'" initializes module -> '+oModule.name);
		// Got through all action functions
		for(let j = 0; j < oAction.functions.length; j++) {
			let oActFunc = oAction.functions[j];
			let arrRequiredArguments = oModule.functions[oActFunc.name];
			let oFunc = { name: oActFunc.name };
			// This preprocesses all arguments and checks whether the arguments contain placeholders
			// which are going to be functions of the arriving events, e.g. #{ .root }, which will
			// pass the whole event as an argument to the action dispatcher
			oFunc.args = prepareArgumentFunctions(arrRequiredArguments, oActFunc.args, oRule.id);
			actFuncs.push(oFunc);
		}

		// Attach persistent data if it exists
		let pers;
		let oPers = oRule.ModPersists;
		if(oPers !== undefined) {
			for (let i = 0; i < oPers.length; i++) {
				if(oPers[i].moduleId === oModule.id) pers = oPers[i].data;
			}
		}
		if(pers === undefined) pers = {};

		send.logrule(oRule.id, ' --> Loading Action Dispatcher "'+oModule.name+'"...');
		let store = {
			log: (msg) => {
				try {
					send.logrule(oRule.id, msg.toString().substring(0, 200));
				} catch(err) {
					send.loginfo(err.toString());
					send.logrule(oRule.id, 'It seems you didn\'t log a string. Only strings are allowed for the function log(msg)');
				}
			},
			data: (dat) => {
				try {
					JSON.stringify(dat);
					send.ruledatalog({ rid: oRule.id, msg: dat });
				} catch(err) {
					send.logrule(oRule.id, '!!! Error logging your data: '+err.message);
				}
			},
			persist: (data) => send.rulepersist({ rid: oRule.id, cid: oModule.id, persistence: data }),
			event: (evt) => send.event(evt)
		};
		dynmod.runModule(store, oModule, oAction.globals, pers, oModule.User.username)
			.then((oMod) => oRules[oRule.id].modules[oModule.id] = oMod)
			.then(() => {
				let msg = 'Action Dispatcher "'+oModule.name+'" (v'+oModule.version+') loaded for rule "'+oRule.name+'"';
				send.logrule(oRule.id, ' --> '+msg);
				send.logworker(msg);
				send.loginfo('UP('+process.pid+') | EN | '+msg+' for user '+oModule.User.username);
			})
			.catch((err) => send.logerror(err.toString()+'\n'+err.stack))
	}
}


// The possible operators used in the conditions part of a rule in order to
// compare fields of an event against defined values
let oOperators = {	
	'<':  (x, y) => { return (x < y) },
	'<=': (x, y) => { return (x <= y) },
	'>':  (x, y) => { return (x > y) },
	'>=': (x, y) => { return (x >= y) },
	'==': (x, y) => { return (x === y) },
	'!=': (x, y) => { return (x !== y) },
	'instr': (x, y) => { return (x.indexOf(y)>-1) }
}

// Checks whether all conditions of the rule are met by the event.
function validConditions(evt, rule, uid) {
	if(rule.conditions.length === 0) return true;

	for(let i = 0; i < rule.conditions.length; i++) {	
		let cond = rule.conditions[i];
		let selectedProperty = jsonQuery(evt, cond.selector).nodes();
		if(selectedProperty.length === 0) {
			// send.logrule(rule.id, 'Error in Rule "'+rule.name+'" Condition not found in event: '+cond.selector);
			return false;
		}

		let op = oOperators[cond.operator];
		if(!op) {
			send.logrule(rule.id, 'Error: Unknown operator: "'+cond.operator+'"');
			return false;
		}

		try {
			let val;
			if(cond.type==='string') val = selectedProperty[0];
			else if(cond.type==='bool') val = selectedProperty[0];
			else if(cond.type==='value') val = parseFloat(selectedProperty[0]) || 0;
			else  send.logrule(rule.id, 'Error: Unknown type: "'+cond.type+'"!');

			if(!op(val, cond.compare)) return false
		} catch(err) {
			send.logrule(rule.id, 'Unhandled Error: "'+err.message+'"');
			return false;
		}
	}
			
	return true;
}

exports.processEvent = (oEvt) => {
	for(let el in oRules) {
		let oRule = oRules[el].rule;
		if(oRule.WebhookId === oEvt.hookid) {
			if(validConditions(oEvt, oRule)) {
				send.loginfo('EN | Conditions valid: EVENT FIRED! Hook URL "'
					+oEvt.hookurl+'" for rule "'+oRule.name+'"');
				for(let i = 0; i < oRule.actions.length; i++) {
					executeAction(oRule.id, oRule.UserId, oRule.actions[i].id, oEvt)
				}
			}
		}
	}
};

function executeAction(rid, uid, aid, evt) {
	let arrFuncs = oActArgs[rid][aid];
	if(!arrFuncs) {
		send.logrule(rid, 'No action (ActionID #'+aid+') functions exist for execution!');
		return;
	}
	// Go through all functions that need to be executed
	for(let i = 0; i < arrFuncs.length; i++) {	
		let func = arrFuncs[i];
		// We can't work on the existing data structure or we will alter it until the next event:
		let arrPassingArgs = [];

		// Evaluate all function arguments with the event and eventually pass data from the event as argument
		for(let j = 0; j < func.args.length; j++) {
			arrPassingArgs.push(func.args[j](evt));
		}

		try {
			send.loginfo('Executing function "'+func.name+'" in action #'+aid);
			oRules[rid].modules[aid][func.name].apply(this, arrPassingArgs);
		} catch(err) {
			send.logrule(rid, err.toString());
			send.loginfo(err.toString());
		}
	}
}


exports.deleteRule = function(rid) {
	send.loginfo('UP('+process.pid+') | EN | Deleting Rule #'+rid+' "'+oRules[rid].rule.name+'"!');
	for(let el in oRules[rid].modules) {
		let name = oRules[rid].rule.actionModules[el].name;
		send.loginfo('UP('+process.pid+') | EN | Removing Action Dispatcher #'+el
			+' "'+name+'" from rule #'+rid+' and purging its arguments');
		delete oActArgs[rid][el];
		delete oRules[rid].modules[el];
	}

};
