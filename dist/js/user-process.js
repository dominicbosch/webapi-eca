'use strict';

// Code Executor
// =============
// > A dedicated process instance for each user with limited memory use

// **Loads Modules:**
	// and [Process Logger](process-logger.html)
var pl = require('./process-logger')
	// and [Dynamic Modules](dynamic-modules.html)
	, dynmod = require('./dynamic-modules')

	, listUserModules = {}
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
	error: (msg) => sendLog('error', msg)
};

process.on('uncaughtException', (err) => {
	console.log('Your Code Executor produced an error!');
	console.log(err);
});
process.on('disconnect', () => {
	console.log('TP | Shutting down Code Executor');
	process.exit();
});
process.on('message', (oMsg) => {
	switch(oMsg.cmd) {
		case 'init':
			pl(sendToParent, oMsg.startIndex);
			log.debug('Starting up with initial stats log index ' + oMsg.startIndex);
		break;
		case 'rule:new':
			log.info('Got new rule');
		break; 
		default: console.log('unknown command on child', oMsg)
	}
});

// 	# A initialization notification or a new rule
// 	if msg.intevent is 'new' or msg.intevent is 'init'
// 		requestModule msg
// 		# We fetch the module also if the rule was updated

// # TODO if server restarts we would have to start modules in the interval
// # that they were initially meant to (do not wait 24 hours until starting again)

// 	# A rule was deleted
// 	if msg.intevent is 'del'
// 		delete listUserModules[msg.user][msg.ruleId]
// 		if JSON.stringify( listUserModules[msg.user] ) is "{}"
// 			delete listUserModules[msg.user]

// # Loads a module if required
// requestModule = ( msg ) ->
// 	arrName = msg.rule.eventname.split ' -> '
// 	if msg.intevent is 'new' or
// 			not listUserModules[ msg.user ] or 
// 			not listUserModules[ msg.user ][ msg.rule.id ]
// 				# // FIXME This needs to be message passing to the mother process
// 		process.send
// 			command: 'get-ep'
// 			user: msg.user
// 			module: arrName[0]
// 		db.eventTriggers.getModule msg.user, arrName[ 0 ], ( err, obj ) ->
// 			if not obj
// 				log.info "TP | No module retrieved for #{ arrName[ 0 ] }, must be a custom event or Webhook"
// 			else
// 				 # we compile the module and pass:
// 				args =
// 					src: obj.data,					# code
// 					lang: obj.lang,					# script language
// 					userId: msg.user,				# userId
// 					modId: arrName[0],				# moduleId
// 					modType: 'eventtrigger'		# module type
// 					oRule: msg.rule,			# oRule
// 				dynmod.runStringAsModule args, ( result ) ->
// 						if not result.answ is 200
// 							log.error "TP | Compilation of code failed! #{ msg.user },
// 								#{ msg.rule.id }, #{ arrName[ 0 ] }"

// 						# If user is not yet stored, we open a new object
// 						if not listUserModules[ msg.user ]
// 							listUserModules[ msg.user ] = {}

// 						oUser = listUserModules[ msg.user ]
// 						# We open up a new object for the rule it
// 						oUser[ msg.rule.id ] =
// 							id: msg.rule.eventname
// 							timestamp: msg.rule.timestamp
// 							pollfunc: arrName[ 1 ]
// 							funcArgs: result.funcArgs
// 							eventinterval: msg.rule.eventinterval * 60 * 1000
// 							module: result.module
// 							logger: result.logger

// 						if msg.rule.eventstart
// 							start = new Date msg.rule.eventstart
// 						else
// 							start = new Date msg.rule.timestamp
// 						nd = new Date()
// 						now = new Date()
// 						if start < nd
// 							# If the engine restarts start could be from last year even 
// 							nd.setMilliseconds 0
// 							nd.setSeconds start.getSeconds()
// 							nd.setMinutes start.getMinutes()
// 							nd.setHours start.getHours()
// 							# if it's still smaller we add one day
// 							if nd < now
// 								log.info 'SETTING NEW INTERVAL: ' + (nd.getDate() + 1)
// 								nd.setDate nd.getDate() + 1
// 						else
// 							nd = start
								
// 						log.info "TP | New event module '#{ arrName[ 0 ] }' loaded for user #{ msg.user },
// 							in rule #{ msg.rule.id }, registered at UTC|#{ msg.rule.timestamp },
// 							starting at UTC|#{ start.toISOString() } ( which is in #{ ( nd - now ) / 1000 / 60 } minutes )
// 							and polling every #{ msg.rule.eventinterval } minutes"
// 						if msg.rule.eventstart
// 							setTimeout fCheckAndRun( msg.user, msg.rule.id, msg.rule.timestamp ), nd - now
// 						else
// 							fCheckAndRun msg.user, msg.rule.id, msg.rule.timestamp


// fCheckAndRun = ( userId, ruleId, timestamp ) ->
// 	() ->
// 		log.info "TP | Check and run user #{ userId }, rule #{ ruleId }"
// 		if isRunning and 
// 				listUserModules[ userId ] and 
// 				listUserModules[ userId ][ ruleId ]
// 			# If there was a rule update we only continue the latest setTimeout execution
// 			if listUserModules[ userId ][ ruleId ].timestamp is timestamp	
// 				oRule = listUserModules[ userId ][ ruleId ]
// 				try
// 					fCallFunction userId, ruleId, oRule
// 				catch e
// 					log.error 'Error during execution of poller'
				
// 				setTimeout fCheckAndRun( userId, ruleId, timestamp ), oRule.eventinterval
// 			else
// 				log.info "TP | We found a newer polling interval and discontinue this one which
// 						was created at UTC|#{ timestamp }"

// # We have to register the poll function in belows anonymous function
// # because we're fast iterating through the listUserModules and references will
// # eventually not be what they are expected to be
// fCallFunction = ( userId, ruleId, oRule ) ->
// 	try
// 		arrArgs = []
// 		if oRule.funcArgs and oRule.funcArgs[ oRule.pollfunc ]
// 			for oArg in oRule.funcArgs[ oRule.pollfunc ]
// 				arrArgs.push oArg.value
// 		@currentState =
// 			rule: ruleId
// 			func: oRule.pollfunc
// 			user: userId
// 		oRule.module[ oRule.pollfunc ].apply this, arrArgs
// 	catch err
// 		log.info "TP | ERROR in module when polled: #{ oRule.id } #{ userId }: #{err.message}"
// 		throw err
// 		oRule.logger err.message
// ###
// This function will loop infinitely every 10 seconds until isRunning is set to false

// @private pollLoop()
// ###
// console.log 'Do we really need a poll loop in the trigger poller?'
// pollLoop = () ->
//   # We only loop if we're running
//   if isRunning
//   	#FIXME CHECK IF ALREADY RUNNING!

//   	#FIXME a scheduler should go here because we are limited in setTimeout
//   	# to an integer value -> ~24 days at maximum!


//     # # Go through all users
//     # for userName, oRules of listUserModules

//     #   # Go through each of the users modules
//     #   for ruleName, myRule of oRules

//     #     # Call the event Trigger poller module function
//     #     fCallFunction myRule, ruleName, userName

//     setTimeout pollLoop, 10000


// # Finally if everything initialized we start polling for new events
// pollLoop()







// // ###
// // As soon as changes were made to the rule set we need to ensure that the aprropriate action
// // dispatcher modules are loaded, updated or deleted.

// // @private updateActionModules ( *updatedRuleId* )
// // @param {Object} updatedRuleId
// // ###
// // updateActionModules = ( updatedRuleId ) =>
	
// // 	# Remove all action dispatcher modules that are not required anymore
// // 	for name, oUser of listUserRules

// // 		# Check whether the action is still existing in the rule
// // 		fRequired = ( actionName ) ->
// // 			for action in oUser[ updatedRuleId ].rule.actions
// // 				# Since the event is in the format 'module -> function' we need to split the string
// // 				if ( action.split ' -> ' )[ 0 ] is actionName
// // 					return true
// // 			false

// // 		# Go thorugh all loaded action modules and check whether the action is still required
// // 		if oUser[updatedRuleId]
// // 			for action of oUser[updatedRuleId].rule.actions 
// // 				delete oUser[updatedRuleId].actions[action] if not fRequired action


// // 	# load all required modules for all users
// // 	# Add action dispatcher modules that are not yet loaded
// // 	for userName, oUser of listUserRules

// // 		# Check whether the action is existing in a rule and load if not
// // 		# Go thorugh all rules and check whether the action is still required
// // 		for nmRl, oMyRule of oUser
// // 			for action in oMyRule.rule.actions
// // 			# Load the action dispatcher module if it was part of the updated rule or if it's new
// // 				moduleName = (action.split ' -> ')[ 0 ]
// // 				if not oMyRule.actions[moduleName] or oMyRule.rule.id is updatedRuleId
// // 					db.actionDispatchers.getModule userName, moduleName, ( err, obj ) =>
// // 						if obj
// // 							# we compile the module and pass: 
// // 							args =
// // 								src: obj.data,					# code
// // 								lang: obj.lang,					# script language
// // 								userId: userName,				# userId
// // 								modId: moduleName,				# moduleId
// // 								modType: 'actiondispatcher'		# module type
// // 								oRule: oMyRule.rule,			# oRule
// // 							dynmod.runStringAsModule args, ( result ) =>
// // 									if result.answ.code is 200
// // 										log.info "EN | Module '#{ moduleName }' successfully loaded for userName
// // 											'#{ userName }' in rule '#{ oMyRule.rule.id }'"
// // 									else
// // 										log.error "EN | Compilation of code failed! #{ userName },
// // 											#{ oMyRule.rule.id }, #{ moduleName }: #{ result.answ.message }"
// // 									oMyRule.actions[moduleName] = result
// // 						else
// // 							log.warn "EN | #{ moduleName } not found for #{ oMyRule.rule.id }!"

