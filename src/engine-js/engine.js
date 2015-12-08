'use strict';

// Engine
// ==================
// > Once the heart of the WebAPI ECA System. This logic might as well be placed
// > in the user processes in the future as it shrinked a lot since the last update.

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

function addRule(oRule) {
	log.info('EN | --> Adding Rule "'+oRule.name+'"');
	let hurl = oRule.Webhook.hookurl;
	if(!oWebhooks[hurl]) {
		oWebhooks[hurl] = {};
	}
	oWebhooks[hurl][oRule.id] = oRule;
}

geb.addListener('system:init', () => {
	// FIXME Implement CRUD on Webhooks
	log.warn('EN | Implement CRUD on Webhooks');
	log.info('EN | Loading existing Rules');
	db.getAllRules()
		.then((arr) => {
			for(var i = 0; i < arr.length; i++) addRule(arr[i])
		})
		.catch((err) => log.error(err));
});
geb.addListener('rule:new', addRule);

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
			db.logWorker(uid, 'Error in Rule "'+rule.name
				+'" Condition not found in event: '+cond.selector);
			return false;
		}

		let op = oOperators[cond.operator];
		if(!op) {	
			db.logWorker(uid, 'Error in Rule "'+rule.name+'": Unknown operator: "'+cond.operator
				+'" use one of ['+Object.keys(oOperators).join('|')+']');
			return false;
		}

		try {
			if(cond.type==='string') val = selectedProperty[0];
			else if(cond.type==='bool') val = selectedProperty[0];
			else if(cond.type==='value') val = parseFloat(selectedProperty[0]) || 0

			if(!op(val, cond.compare)) return false
		} catch(err) {
			db.logWorker(uid, 'Unhandled Error in Rule "'+rule.name+'": Selector "'+cond.selector
				+'", Operator "'+cond.operator+'", Compare "'+cond.compare+'"');
			return false;
		}
	}
			
	return true
}

geb.addListener('webhook:event', (oEvt) => {
	let oHooks = oWebhooks[oEvt.hookurl];
	for(let el in oHooks) {
		let oRule = oHooks[el];
		if(validConditions(oEvt, oRule)) {
			log.info('EN | Conditions valid: EVENT FIRED! Hook URL "'
				+oEvt.hookurl+'" for rule "'+oRule.name+'"');
			for(let i = 0; i < oRule.actions.length; i++) {
				geb.emit('action', {
					rid: oRule.id,
					uid: oRule.UserId,
					aid: oRule.actions[i].id,
					evt: oEvt
				})
			}
		}
	}
});
