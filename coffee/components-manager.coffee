###

Components Manager
==================
> The components manager takes care of the dynamic JS modules and the rules.
> Event Poller and Action Invoker modules are loaded as strings and stored in the database,
> then compiled into node modules and rules and used in the engine and event poller.

###

# **Loads Modules:**

# - [Persistence](persistence.html)
db = require './persistence'
# - [Dynamic Modules](dynamic-modules.html)
dynmod = require './dynamic-modules'
# - [Encryption](encryption.html)
encryption = require './encryption'

# - Node.js Modules: [fs](http://nodejs.org/api/fs.html),
#   [path](http://nodejs.org/api/path.html) and
#   [events](http://nodejs.org/api/events.html)
fs = require 'fs'
path = require 'path'
events = require 'events'
eventEmitter = new events.EventEmitter()

###
Module call
-----------
Initializes the Components Manager and constructs a new Event Emitter.

@param {Object} args
###
exports = module.exports = ( args ) =>
	@log = args.logger
	db args
	dynmod args
	module.exports


###
Add an event handler (eh) that listens for rules.

@public addRuleListener ( *eh* )
@param {function} eh
###

exports.addRuleListener = ( eh ) =>
	eventEmitter.addListener 'rule', eh

	# Fetch all active rules per user
	db.getAllActivatedRuleIdsPerUser ( err, objUsers ) =>

		# Go through all rules of each user
		fGoThroughUsers = ( user, rules ) =>

			# Fetch the rules object for each rule in each user
			fFetchRule = ( userName ) =>
				( rule ) =>
					db.getRule rule, ( err, strRule ) =>
						try 
							oRule = JSON.parse strRule
							db.resetLog userName, oRule.id
							db.appendLog userName, oRule.id, "INIT", "Rule '#{ oRule.id }' initialized.
								Interval set to #{ oRule.event_interval } minutes"

							eventEmitter.emit 'rule',
								event: 'init'
								user: userName
								rule: oRule
						catch err
							@log.warn "CM | There's an invalid rule in the system: #{ strRule }"

			# Go through all rules for each user
			fFetchRule( user ) rule for rule in rules
					
		# Go through each user
		fGoThroughUsers user, rules for user, rules of objUsers

###
Processes a user request coming through the request-handler.

- `user` is the user object as it comes from the DB.
- `oReq` is the request object that contains:

	- `command` as a string 
	- `payload` an optional stringified JSON object 
The callback function `callback( obj )` will receive an object
containing the HTTP response code and a corresponding message.

@public processRequest ( *user, oReq, callback* )
###
exports.processRequest = ( user, oReq, callback ) ->
	if not oReq.payload
		oReq.payload = '{}'
	try
		dat = JSON.parse oReq.payload
	catch err
		return callback
			code: 404
			message: 'You had a strange payload in your request!'
	if commandFunctions[oReq.command]

		# If the command function was registered we invoke it
		commandFunctions[oReq.command] user, dat, callback
	else
		callback
			code: 404
			message: 'What do you want from me?'

###
Checks whether all required parameters are present in the payload.

@private hasRequiredParams ( *arrParams, oPayload* )
@param {Array} arrParams
@param {Object} oPayload
###
hasRequiredParams = ( arrParams, oPayload ) ->
	answ =
		code: 400
		message: "Your request didn't contain all necessary fields! Requires: #{ arrParams.join() }"
	return answ for param in arrParams when not oPayload[param]
	answ.code = 200
	answ.message = 'All required properties found'
	answ

###
Fetches all available modules and return them together with the available functions.

@private getModules ( *user, oPayload, dbMod, callback* )
@param {Object} user
@param {Object} oPayload
@param {Object} dbMod
@param {function} callback
###
getModules = ( user, oPayload, dbMod, callback ) ->
	fProcessIds = ( userName ) ->
		( err, arrNames ) ->
			oRes = {}
			answReq = () ->
				callback
					code: 200
					message: JSON.stringify oRes
			sem = arrNames.length
			if sem is 0
				answReq()
			else
				fGetFunctions = ( id ) =>
					dbMod.getModule userName, id, ( err, oModule ) =>
						if oModule
							oRes[id] = JSON.parse oModule.functions
						if --sem is 0
							answReq()
				fGetFunctions id for id in arrNames

	dbMod.getAvailableModuleIds user.username, fProcessIds user.username

getModuleParams = ( user, oPayload, dbMod, callback ) ->
	answ = hasRequiredParams [ 'id' ], oPayload
	if answ.code isnt 200
		callback answ
	else
		dbMod.getModuleField user.username, oPayload.id, "params", ( err, oPayload ) ->
			answ.message = oPayload
			callback answ

getModuleUserParams = ( user, oPayload, dbMod, callback ) ->
	answ = hasRequiredParams [ 'id' ], oPayload
	if answ.code isnt 200
		callback answ
	else
		dbMod.getUserParams oPayload.id, user.username, ( err, str ) ->
			oParams = JSON.parse str
			for name, oParam of oParams
				if not oParam.shielded
					oParam.value = encryption.decrypt oParam.value
			answ.message = JSON.stringify oParams
			callback answ

getModuleUserArguments = ( user, oPayload, dbMod, callback ) ->
	answ = hasRequiredParams [ 'ruleId' ,'moduleId' ], oPayload
	if answ.code isnt 200
		callback answ
	else
		dbMod.getAllModuleUserArguments user.username, oPayload.ruleId, oPayload.moduleId, ( err, oPayload ) ->
			answ.message = oPayload
			callback answ

forgeModule = ( user, oPayload, dbMod, callback ) =>
	answ = hasRequiredParams [ 'id', 'params', 'lang', 'data' ], oPayload
	if answ.code isnt 200
		callback answ
	else
		if oPayload.overwrite
			storeModule user, oPayload, dbMod, callback
		else
			dbMod.getModule user.username, oPayload.id, ( err, mod ) =>
				if mod
					answ.code = 409
					answ.message = 'Module name already existing: ' + oPayload.id
					callback answ
				else
					storeModule user, oPayload, dbMod, callback

storeModule = ( user, oPayload, dbMod, callback ) =>
	src = oPayload.data
	dynmod.compileString src, user.username, 'dummyRule', oPayload.id, oPayload.lang, null, ( cm ) =>
		answ = cm.answ
		if answ.code is 200
			funcs = []
			funcs.push name for name, id of cm.module
			@log.info "CM | Storing new module with functions #{ funcs.join( ', ' ) }"
			answ.message = 
				" Module #{ oPayload.id } successfully stored! Found following function(s): #{ funcs }"
			oPayload.functions = JSON.stringify funcs
			oPayload.functionArgs = JSON.stringify cm.funcParams
			dbMod.storeModule user.username, oPayload
			# if oPayload.public is 'true'
			# 	dbMod.publish oPayload.id
		callback answ

storeRule = ( user, oPayload, callback ) =>
	# This is how a rule is stored in the database
		rule =
			id: oPayload.id
			event: oPayload.event
			event_interval: oPayload.event_interval
			conditions: oPayload.conditions
			actions: oPayload.actions
		strRule = JSON.stringify rule
		# store the rule
		db.storeRule rule.id, strRule
		# link the rule to the user
		db.linkRule rule.id, user.username
		# activate the rule
		db.activateRule rule.id, user.username
		# if event module parameters were send, store them
		if oPayload.event_params
			epModId = rule.event.split( ' -> ' )[ 0 ]
			db.eventPollers.storeUserParams epModId, user.username, JSON.stringify oPayload.event_params
		oFuncArgs = oPayload.event_functions
		# if event function arguments were send, store them
		for id, args of oFuncArgs
			arr = id.split ' -> '
			db.eventPollers.storeUserArguments user.username, rule.id, arr[ 0 ], arr[ 1 ], JSON.stringify args 
		
		# if action module params were send, store them
		oParams = oPayload.action_params
		for id, params of oParams
			db.actionInvokers.storeUserParams id, user.username, JSON.stringify params
		oFuncArgs = oPayload.action_functions
		# if action function arguments were send, store them
		for id, args of oFuncArgs
			arr = id.split ' -> '
			db.actionInvokers.storeUserArguments user.username, rule.id, arr[ 0 ], arr[ 1 ], JSON.stringify args 
		
		# Initialize the rule log
		db.resetLog user.username, rule.id
		db.appendLog user.username, rule.id, "INIT",
			"Rule '#{ rule.id }' initialized. Interval set to #{ rule.event_interval } minutes"
		
		# Inform everbody about the new rule
		eventEmitter.emit 'rule',
			event: 'new'
			user: user.username
			rule: rule
		callback
			code: 200
			message: "Rule '#{ rule.id }' stored and activated!"

commandFunctions =
	get_public_key: ( user, oPayload, callback ) ->
		callback
			code: 200
			message: encryption.getPublicKey()

# EVENT POLLERS
# -------------
	get_event_pollers: ( user, oPayload, callback ) ->
		getModules  user, oPayload, db.eventPollers, callback
	
	get_full_event_poller: ( user, oPayload, callback ) ->
		db.eventPollers.getModule user.username, oPayload.id, ( err, obj ) ->
			callback
				code: 200
				message: JSON.stringify obj
	
	get_event_poller_params: ( user, oPayload, callback ) ->
		getModuleParams user, oPayload, db.eventPollers, callback

	get_event_poller_user_params: ( user, oPayload, callback ) ->
		getModuleUserParams user, oPayload, db.eventPollers, callback

	get_event_poller_user_arguments: ( user, oPayload, callback ) ->
		getModuleUserArguments user, oPayload, db.eventPollers, callback

	get_event_poller_function_arguments: ( user, oPayload, callback ) ->
		answ = hasRequiredParams [ 'id' ], oPayload
		if answ.code isnt 200
			callback answ
		else
			db.eventPollers.getModuleField user.username, oPayload.id, 'functionArgs', ( err, obj ) ->
				callback
					code: 200
					message: obj
	
	forge_event_poller: ( user, oPayload, callback ) ->
		forgeModule user, oPayload, db.eventPollers, callback
 
	delete_event_poller: ( user, oPayload, callback ) ->
		answ = hasRequiredParams [ 'id' ], oPayload
		if answ.code isnt 200
			callback answ
		else
			db.eventPollers.deleteModule user.username, oPayload.id
			callback
				code: 200
				message: 'OK!'

# ACTION INVOKERS
# ---------------
	get_action_invokers: ( user, oPayload, callback ) ->
		getModules  user, oPayload, db.actionInvokers, callback
	
	get_full_action_invoker: ( user, oPayload, callback ) ->
		answ = hasRequiredParams [ 'id' ], oPayload
		if answ.code isnt 200
			callback answ
		else
			db.actionInvokers.getModule user.username, oPayload.id, ( err, obj ) ->
				callback
					code: 200
					message: JSON.stringify obj

	get_action_invoker_params: ( user, oPayload, callback ) ->
		getModuleParams user, oPayload, db.actionInvokers, callback

	get_action_invoker_user_params: ( user, oPayload, callback ) ->
		getModuleUserParams user, oPayload, db.actionInvokers, callback

	get_action_invoker_user_arguments: ( user, oPayload, callback ) ->
		getModuleUserArguments user, oPayload, db.actionInvokers, callback

	get_action_invoker_function_arguments: ( user, oPayload, callback ) ->
		answ = hasRequiredParams [ 'id' ], oPayload
		if answ.code isnt 200
			callback answ
		else
			db.actionInvokers.getModuleField user.username, oPayload.id, 'functionArgs', ( err, obj ) ->
				callback
					code: 200
					message: obj
	
	forge_action_invoker: ( user, oPayload, callback ) ->
		forgeModule user, oPayload, db.actionInvokers, callback

	delete_action_invoker: ( user, oPayload, callback ) ->
		answ = hasRequiredParams [ 'id' ], oPayload
		if answ.code isnt 200
			callback answ
		else
			db.actionInvokers.deleteModule user.username, oPayload.id
			callback
				code: 200
				message: 'OK!'

# RULES
# -----
	get_rules: ( user, oPayload, callback ) ->
		db.getUserLinkedRules user.username, ( err, obj ) ->
			callback
				code: 200
				message: obj

	get_rule: ( user, oPayload, callback ) ->
		answ = hasRequiredParams [ 'id' ], oPayload
		if answ.code isnt 200
			callback answ
		else
			db.getRule oPayload.id, ( err, obj ) ->
				callback
					code: 200
					message: obj

	get_rule_log: ( user, oPayload, callback ) ->
		answ = hasRequiredParams [ 'id' ], oPayload
		if answ.code isnt 200
			callback answ
		else
			db.getLog user.username, oPayload.id, ( err, obj ) ->
				callback
					code: 200
					message: obj

	# A rule needs to be in following format:
	
	# - id
	# - event
	# - conditions
	# - actions
	forge_rule: ( user, oPayload, callback ) ->
		answ = hasRequiredParams [ 'id', 'event', 'conditions', 'actions' ], oPayload
		if answ.code isnt 200
			callback answ
		else
			if oPayload.overwrite
				storeRule user, oPayload, callback
			else
				db.getRule oPayload.id, ( err, mod ) =>
					if mod
						answ.code = 409
						answ.message = 'Rule name already existing: ' + oPayload.id
						callback answ
					else
						storeRule user, oPayload, callback

	delete_rule: ( user, oPayload, callback ) ->
		answ = hasRequiredParams [ 'id' ], oPayload
		if answ.code isnt 200
			callback answ
		else
			db.deleteRule oPayload.id
			eventEmitter.emit 'rule',
				event: 'del'
				user: user.username
				rule: null
				ruleId: oPayload.id
			callback
				code: 200
				message: 'OK!'
