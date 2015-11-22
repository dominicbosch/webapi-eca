'use strict';

// Engine
// ==================
// > The heart of the WebAPI ECA System. The engine loads action dispatcher modules
// > corresponding to active rules actions and invokes them if an appropriate event
// > is retrieved. 

var db = global.db
	, geb = global.eventBackbone
	, oWebhooks = {}
	// oWebhooks are rules stored under their respective webhook id for fast access

	// **Loads Modules:**

	// - [Logging](logging.html)
	, log = require('./logging')

	// - External Modules:
	//   [js-select](https://github.com/harthur/js-select)
	, jsonQuery = require('js-select')
	;


// Engine got new rule {"id":12,
// "name":"qweg",
// "conditions":[],
// "actions":[{"id":3,
// "globals":{},
// "functions":{"sayHelloWorld":{}}}],
// "UserId":2,
// "WebhookId":1}
geb.addListener('rule:new', (oRule) => {
	let hid = oRule.WebhookId;
	console.log('Engine got new rule', JSON.stringify(oRule));
	if(!oWebhooks[hid]) {
		oWebhooks[hid] = {};
	}
	oWebhooks[hid][oRule.id] = oRule;
});
// geb.addListener 'rule', ( evt ) =>
// 	if not listUserRules[ evt.user ] and evt.intevent isnt 'del'
// 		listUserRules[ evt.user ] = {}
		
// 	oUser = listUserRules[ evt.user ]
// 	oRule = evt.rule
// 	if evt.intevent is 'new' or ( evt.intevent is 'init' and not oUser[ oRule.id ] )
// 		oUser[ oRule.id ] = 
// 			rule: oRule
// 			actions: {}
// 		updateActionModules oRule.id

// 	if evt.intevent is 'del' and oUser
// 		delete oUser[ evt.ruleId ]

// 	# If a user is empty after all the updates above, we remove her from the list
// 	if JSON.stringify( oUser ) is "{}"
// 		delete listUserRules[ evt.user ]


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
function validConditions(evt, rule) {
	if(rule.conditions.length === 0) return true;

	for(let i = 0; i < rule.conditions.length; i++) {	
		// FIXME Implement logs! userID and ruleId not in scope here
		let cond = rule.conditions[i];
		let selectedProperty = jsonQuery(evt, cond.selector).nodes();
		if(selectedProperty.length === 0) {	
			// db.appendLog(userId, ruleId, 'Condition', "Node not found in event: #{ cond.selector }")
			return false;
		}

		let op = oOperators[cond.operator];
		if(!op) {	
			// db.appendLog userId, ruleId, 'Condition', "Unknown operator: #{ cond.operator }. Use one of #{ Object.keys( oOperators ).join ', ' }"
			return false;
		}

		try {
			if(cond.type==='string') val = selectedProperty[0];
			else if(cond.type==='bool') val = selectedProperty[0];
			else if(cond.type==='value') val = parseFloat(selectedProperty[0]) || 0

			if(!op(val, cond.compare)) return false
		} catch(err) {
			// db.appendLog userId, ruleId, 'Condition', "Error: Selector '#{ cond.selector }',
			// 	Operator #{ cond.operator }, Compare: #{ cond.compare }"
			return false;
		}
	}
			
	return true
}

// Engine got new event {
// 	"hookid":1,
// 	"eventname":"as",
// 	"body":{"clickername":"d",
// 	"engineReceivedTime":1448200462047,
	// "origin":"::1"}}
geb.addListener('webhook:event', (oEvt) => {
	console.log('Engine got new event', oEvt);
	let oHooks = oWebhooks[oEvt.hookid];
	for(let el in oHooks) {
		let oRule = oHooks[el];
		console.log('Evaluating Rule for '+oEvt.hookname, oRule)
		if(validConditions(oEvt, oRule)) {
			log.info('EN | Conditions valid: EVENT FIRED! '
				+oEvt.hookname+' for rule '+oRule.name);
			console.log('going through actions', Object.keys(oRule.actions))
			for(let action in oRule.actions) {
				// arr = action.split(' -> ')
				// fSearchAndInvokeAction listUserRules, [ userName, ruleName, 'actions', arr[0]], arr[1], evt, 0
			}
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

});
