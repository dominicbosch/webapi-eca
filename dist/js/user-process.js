'use strict';

// Code Executor
// =============
// > A dedicated process instance for each user with limited memory use

// **Loads Modules:**
	// and [Process Logger](process-logger.html)
var pl = require('./process-logger')
	// and [Dynamic Modules](dynamic-modules.html)
	, dynmod = require('./dynamic-modules')

	, oActions = {}
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
	rule: (msg) => sendLog('rule', msg)
};

process.on('uncaughtException', (err) => {
	console.log('Your Code Executor produced an error!');
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
			let oFuncs = oActArgs[oMsg.evt.rid][oMsg.evt.aid];
			for(let el in oFuncs) {
				oActions[oMsg.evt.aid][el].apply(this, oFuncs[el]);
			}
		break; 
		default: console.log('unknown command on child', oMsg)
	}
});
function runModule(id, rid, oAct) {
	let opts = {
		globals: oAct.globals,
		logger: (msg) => log.rule({ rid: rid, msg: msg })
	};
	return dynmod.runStringAsModule(oAct.code, oAct.lang, oAct.User.username, opts)
		.then((answ) => {
			log.info('Module "'+oAct.name+'" loaded for user '+oAct.User.username);
			oActions[id] = answ.module;
		})
		.catch((err) => log.error(err))
}

function newRule(oRule) {
	if(!oActArgs[oRule.id]) oActArgs[oRule.id] = {};
	for(let id in oRule.actionModules) {
		let oam = oRule.actionModules[id];
		let oArgs = oam.functions; // the functions in the rules
		let oFuncArgs = oRule.actions.filter((o) => o.id === oam.id)[0].functions;
		// Here we store the arguments in the internal data structure:
		let oAct = oActArgs[oRule.id][oam.id] = {};
		for(let af in oArgs) {
			oAct[af] = [];
			for (var i = 0; i < oArgs[af].length; i++) {
				oAct[af].push(oFuncArgs[af][oArgs[af][i]]);
			}
		}
		runModule(id, oRule.id, oam);
	}
}


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



// TODO decrypting of user parameters has to happen before we runstringasmodule
// // Decrypt encrypted user parameters to ensure some level of security when it comes down to storing passwords on our server.
// for(let prop in opt.globals) {
// 	log.info('DM | Loading user defined global variable '+prop);
// 	// Eventually we only have a list of globals without values for a dry run when storing a new module. Thus we 
// 	// expect the '.value' property not to be set on these elements. we add an empty string as value in these cases
// 	opt.globals[prop] = encryption.decrypt(opt.globals[prop].value || '');
// }


// {
//     "id": 2,
//     "name": "45",
//     "conditions": [],
//     "actions": [
//         {
//             "id": 1,
//             "globals": {},
//             "functions": {
//                 "sayHelloWorld": {}
//             }
//         }
//     ],
//     "UserId": 1,
//     "WebhookId": 1,
//     "Webhook": {
//         "id": 1,
//         "hookid": "9a0da8f495cae8c1c554819fa8ec022e",
//         "hookname": "123456789",
//         "isPublic": false,
//         "UserId": 1
//     },
//     "actionModules": {
//         "1": {
//             "id": 1,
//             "name": "Hello World",
//             "lang": "CoffeeScript",
//             "code": "\n# A simple Hello World code block\nexports.sayHelloWorld = () ->\n\tlog 'Hello Worlddd!'\n\t",
//             "comment": "A simple Hello World code block\n",
//             "functions": {
//                 "sayHelloWorld": []
//             },
//             "published": false,
//             "globals": {},
//             "UserId": 1,
//             "User": {
//                 "username": "admin"
//             }
//         }
//     }
// }
