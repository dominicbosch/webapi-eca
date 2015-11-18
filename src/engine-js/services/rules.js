'use strict';

// Serve Rules
// ===========
// > Answers rule requests from the user

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),
	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),
	db = global.db;

var router = module.exports = express.Router();

router.post('/get', (req, res) => {
	log.info('SRVC | RULES | Fetching all Rules');
	db.getAllRules(req.session.pub.id, (err, arr) => {
		if(err) {
			log.error(err);
			res.status(500).send('Fetching all rules failed');
		}
		else res.send(arr);
	});
})


// # Store a rule and inform everybody about it
// # ------------------------------------------
// storeRule = ( user, oBody, callback ) =>
// 	# This is how a rule is stored in the database
// 	# FIXME this is all clutered up! we only need id, eventname, conditions and actions as rules! everything else is eventTrigger related
// 	db.getRule oBody.id, user.username, ( oldRule ) ->
// 		epModId = oldRule.eventname.split( ' -> ' )[ 0 ]
// 		db.deleteUserArguments user.username, oBody.id, epModId
// 		rule =
// 			id: oBody.id
// 			eventtype: oBody.eventtype
// 			eventname: oBody.eventname
// 			eventstart: oBody.eventstart
// 			eventinterval: oBody.eventinterval
// 			conditions: oBody.conditions
// 			actions: oBody.actions
// 		if oBody.eventstart
// 			rule.timestamp = (new Date()).toISOString()
// 		strRule = JSON.stringify rule
// 		# store the rule
// 		db.storeRule user.username, rule.id, strRule
// 		# if event module parameters were sent, store them
// 		if oBody.eventparams
// 			epModId = rule.eventname.split( ' -> ' )[ 0 ]
// 			db.eventTriggers.storeUserParams epModId, user.username, JSON.stringify oBody.eventparams
// 		else
// 			db.eventTriggers.deleteUserParams epModId, user.username

// 		oFuncArgs = oBody.eventfunctions
// 		# if event function arguments were sent, store them

// 		db.eventTriggers.deleteUserArguments user.username, rule.id, arr[ 0 ]
// 		for id, args of oFuncArgs
// 			arr = id.split ' -> '
// 			db.eventTriggers.storeUserArguments user.username, rule.id, arr[ 0 ], arr[ 1 ], JSON.stringify args 
		
// 		# if action module params were sent, store them
// 		oParams = oBody.actionparams
// 		for id, params of oParams
// 			db.actionDispatchers.storeUserParams id, user.username, JSON.stringify params
// 		oFuncArgs = oBody.actionfunctions
// 		# if action function arguments were sent, store them
// 		for id, args of oFuncArgs
// 			arr = id.split ' -> '
// 			db.actionDispatchers.storeUserArguments user.username, rule.id, arr[ 0 ], arr[ 1 ], JSON.stringify args 
		
// 		eventInfo = ''
// 		if rule.eventstart
// 			eventInfo = "Starting at #{ new Date( rule.eventstart ) }, Interval set to #{ rule.eventinterval } minutes"
// 		# Initialize the rule log
// 		db.resetLog user.username, rule.id
// 		db.appendLog user.username, rule.id, "INIT", "Rule '#{ rule.id }' initialized. #{ eventInfo }"
		
// 		# Inform everbody about the new rule
// 		geb.emit 'rule',
// 			intevent: 'new'
// 			user: user.username
// 			rule: rule
// 		callback
// 			code: 200
// 			message: "Rule '#{ rule.id }' stored and activated!"


	// forge_rule: ( user, oBody, callback ) ->
	// 	answ = hasRequiredParams [ 'id', 'eventname', 'conditions', 'actions' ], oBody
	// 	if answ.code isnt 200
	// 		callback answ
	// 	else
	// 		if oBody.overwrite
	// 			storeRule user, oBody, callback
	// 		else
	// 			db.getRule user.username, oBody.id, ( err, mod ) =>
	// 				if mod
	// 					answ.code = 409
	// 					answ.message = 'Rule name already existing: ' + oBody.id
	// 					callback answ
	// 				else
	// 					storeRule user, oBody, callback

	// delete_rule: ( user, oBody, callback ) ->
	// 	answ = hasRequiredParams [ 'id' ], oBody
	// 	if answ.code isnt 200
	// 		callback answ
	// 	else
	// 		db.deleteRule user.username, oBody.id
	// 		geb.emit 'rule',
	// 			intevent: 'del'
	// 			user: user.username
	// 			rule: null
	// 			ruleId: oBody.id
	// 		callback
	// 			code: 200
	// 			message: 'OK!'