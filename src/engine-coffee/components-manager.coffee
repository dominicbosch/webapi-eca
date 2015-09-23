
###

Components Manager
==================
> The components manager takes care of the dynamic JS modules and the rules.
> Event Trigger and Action Dispatcher modules are loaded as strings and stored in the database,
> then compiled into node modules and rules and used in the engine and event Trigger.

###

exports = module.exports
geb = global.eventBackbone
db = global.db
# **Loads Modules:**

# - [Logging](logging.html)
log = require './logging'
# - [Encryption](encryption.html)
encryption = require './encryption'

# - Node.js Modules: [fs](http://nodejs.org/api/fs.html),
#   [path](http://nodejs.org/api/path.html) and
#   [events](http://nodejs.org/api/events.html)
fs = require 'fs'
path = require 'path'
# - External Modules: [express](http://expressjs.com/api.html)
express = require 'express'

###
Add an event handler (eh) that listens for rules.

@public addRuleListener ( *eh* )
@param {function} eh
###
exports.addRuleListener = ( eh ) =>
	geb.addListener 'rule', eh

	# Fetch all active rules per user
	db.getAllActivatedRuleIdsPerUser ( err, objUsers ) =>
		
		# Go through all rules of each user
		fGoThroughUsers = ( user, rules ) =>

			# Fetch the rules object for each rule in each user
			fFetchRule = ( rule ) =>
				db.getRule user, rule, ( err, strRule ) =>
					try 
						oRule = JSON.parse strRule
						db.resetLog user, oRule.id
						eventInfo = ''
						if oRule.eventstart
							eventInfo = "Starting at #{ new Date( oRule.eventstart ) }, Interval set to #{ oRule.eventinterval } minutes"
							db.appendLog user, oRule.id, "INIT", "Rule '#{ oRule.id }' initialized. #{ eventInfo }"

							geb.emit 'rule',
								intevent: 'init'
								user: user
								rule: oRule
					catch err
						log.warn "CM | There's an invalid rule in the system: #{ strRule }"

			# Go through all rules for each user
			fFetchRule rule for rule in rules
					
		# Go through each user
		fGoThroughUsers user, rules for user, rules of objUsers


###
Fetches all available modules and return them together with the available functions.

@private getModules ( *user, oBody, dbMod, callback* )
@param {Object} user
@param {Object} oBody
@param {Object} dbMod
@param {function} callback
###
getModules = ( user, oBody, dbMod, callback ) ->
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
				for id in arrNames
					dbMod.getModule userName, id, ( err, oModule ) =>
						if oModule
							oRes[id] = JSON.parse oModule.functions
						if --sem is 0
							answReq()

	dbMod.getAvailableModuleIds user.username, fProcessIds user.username

getModuleParams = ( user, oBody, dbMod, callback ) ->
	answ = hasRequiredParams [ 'id' ], oBody
	if answ.code isnt 200
		callback answ
	else
		dbMod.getModuleField user.username, oBody.id, 'params', ( err, oBody ) ->
			answ.message = oBody
			callback answ

getModuleComment = ( user, oBody, dbMod, callback ) ->
	answ = hasRequiredParams [ 'id' ], oBody
	if answ.code isnt 200
		callback answ
	else
		dbMod.getModuleField user.username, oBody.id, 'comment', ( err, oBody ) ->
			answ.message = oBody
			callback answ

getModuleUserParams = ( user, oBody, dbMod, callback ) ->
	answ = hasRequiredParams [ 'id' ], oBody
	if answ.code isnt 200
		callback answ
	else
		dbMod.getUserParams oBody.id, user.username, ( err, str ) ->
			oParams = JSON.parse str
			for name, oParam of oParams
				if not oParam.shielded
					oParam.value = encryption.decrypt oParam.value
			answ.message = JSON.stringify oParams
			callback answ

getModuleUserArguments = ( user, oBody, dbMod, callback ) ->
	answ = hasRequiredParams [ 'ruleId' ,'moduleId' ], oBody
	if answ.code isnt 200
		callback answ
	else
		dbMod.getAllModuleUserArguments user.username, oBody.ruleId, oBody.moduleId, ( err, oBody ) ->
			answ.message = oBody
			callback answ


# Store a rule and inform everybody about it
# ------------------------------------------
storeRule = ( user, oBody, callback ) =>
	# This is how a rule is stored in the database
	# FIXME this is all clutered up! we only need id, eventname, conditions and actions as rules! everything else is eventTrigger related
	db.getRule oBody.id, user.username, ( oldRule ) ->
		epModId = oldRule.eventname.split( ' -> ' )[ 0 ]
		db.deleteUserArguments user.username, oBody.id, epModId
		rule =
			id: oBody.id
			eventtype: oBody.eventtype
			eventname: oBody.eventname
			eventstart: oBody.eventstart
			eventinterval: oBody.eventinterval
			conditions: oBody.conditions
			actions: oBody.actions
		if oBody.eventstart
			rule.timestamp = (new Date()).toISOString()
		strRule = JSON.stringify rule
		# store the rule
		db.storeRule user.username, rule.id, strRule
		# if event module parameters were sent, store them
		if oBody.eventparams
			epModId = rule.eventname.split( ' -> ' )[ 0 ]
			db.eventTriggers.storeUserParams epModId, user.username, JSON.stringify oBody.eventparams
		else
			db.eventTriggers.deleteUserParams epModId, user.username

		oFuncArgs = oBody.eventfunctions
		# if event function arguments were sent, store them

		db.eventTriggers.deleteUserArguments user.username, rule.id, arr[ 0 ]
		for id, args of oFuncArgs
			arr = id.split ' -> '
			db.eventTriggers.storeUserArguments user.username, rule.id, arr[ 0 ], arr[ 1 ], JSON.stringify args 
		
		# if action module params were sent, store them
		oParams = oBody.actionparams
		for id, params of oParams
			db.actionDispatchers.storeUserParams id, user.username, JSON.stringify params
		oFuncArgs = oBody.actionfunctions
		# if action function arguments were sent, store them
		for id, args of oFuncArgs
			arr = id.split ' -> '
			db.actionDispatchers.storeUserArguments user.username, rule.id, arr[ 0 ], arr[ 1 ], JSON.stringify args 
		
		eventInfo = ''
		if rule.eventstart
			eventInfo = "Starting at #{ new Date( rule.eventstart ) }, Interval set to #{ rule.eventinterval } minutes"
		# Initialize the rule log
		db.resetLog user.username, rule.id
		db.appendLog user.username, rule.id, "INIT", "Rule '#{ rule.id }' initialized. #{ eventInfo }"
		
		# Inform everbody about the new rule
		geb.emit 'rule',
			intevent: 'new'
			user: user.username
			rule: rule
		callback
			code: 200
			message: "Rule '#{ rule.id }' stored and activated!"


#
# COMMAND FUNCTIONS
# =================
#
# Those are the answers to user requests.

commandFunctions =

# EVENT TRIGGERS
# -------------
	get_event_triggers: ( user, oBody, callback ) ->
		getModules  user, oBody, db.eventTriggers, callback
	
	get_full_event_trigger: ( user, oBody, callback ) ->
		db.eventTriggers.getModule user.username, oBody.id, ( err, obj ) ->
			callback
				code: 200
				message: JSON.stringify obj
	
	get_event_trigger_params: ( user, oBody, callback ) ->
		getModuleParams user, oBody, db.eventTriggers, callback

	get_event_trigger_comment: ( user, oBody, callback ) ->
		getModuleComment user, oBody, db.eventTriggers, callback

	get_event_trigger_user_params: ( user, oBody, callback ) ->
		getModuleUserParams user, oBody, db.eventTriggers, callback

	get_event_trigger_user_arguments: ( user, oBody, callback ) ->
		getModuleUserArguments user, oBody, db.eventTriggers, callback

	get_event_trigger_function_arguments: ( user, oBody, callback ) ->
		answ = hasRequiredParams [ 'id' ], oBody
		if answ.code isnt 200
			callback answ
		else
			db.eventTriggers.getModuleField user.username, oBody.id, 'functionArgs', ( err, obj ) ->
				callback
					code: 200
					message: obj
	
	forge_event_trigger: ( user, oBody, callback ) ->
		forgeModule user, oBody, "eventtrigger", db.eventTriggers, callback
 
	delete_event_trigger: ( user, oBody, callback ) ->
		answ = hasRequiredParams [ 'id' ], oBody
		if answ.code isnt 200
			callback answ
		else
			db.eventTriggers.deleteModule user.username, oBody.id
			callback
				code: 200
				message: 'OK!'

# ACTION DISPATCHERS
# ------------------
	get_action_dispatchers: ( user, oBody, callback ) ->
		getModules  user, oBody, db.actionDispatchers, callback
	
	get_full_action_dispatcher: ( user, oBody, callback ) ->
		answ = hasRequiredParams [ 'id' ], oBody
		if answ.code isnt 200
			callback answ
		else
			db.actionDispatchers.getModule user.username, oBody.id, ( err, obj ) ->
				callback
					code: 200
					message: JSON.stringify obj

	get_action_dispatcher_params: ( user, oBody, callback ) ->
		getModuleParams user, oBody, db.actionDispatchers, callback

	get_action_dispatcher_comment: ( user, oBody, callback ) ->
		getModuleComment user, oBody, db.actionDispatchers, callback

	get_action_dispatcher_user_params: ( user, oBody, callback ) ->
		getModuleUserParams user, oBody, db.actionDispatchers, callback

	get_action_dispatcher_user_arguments: ( user, oBody, callback ) ->
		getModuleUserArguments user, oBody, db.actionDispatchers, callback

	get_action_dispatcher_function_arguments: ( user, oBody, callback ) ->
		answ = hasRequiredParams [ 'id' ], oBody
		if answ.code isnt 200
			callback answ
		else
			db.actionDispatchers.getModuleField user.username, oBody.id, 'functionArgs', ( err, obj ) ->
				callback
					code: 200
					message: obj
	
	forge_action_dispatcher: ( user, oBody, callback ) ->
		forgeModule user, oBody, "actiondispatcher", db.actionDispatchers, callback

	delete_action_dispatcher: ( user, oBody, callback ) ->
		answ = hasRequiredParams [ 'id' ], oBody
		if answ.code isnt 200
			callback answ
		else
			db.actionDispatchers.deleteModule user.username, oBody.id
			callback
				code: 200
				message: 'OK!'

# RULES
# -----
	get_rules: ( user, oBody, callback ) ->
		db.getRuleIds user.username, ( err, obj ) ->
			callback
				code: 200
				message: obj

	get_rule: ( user, oBody, callback ) ->
		answ = hasRequiredParams [ 'id' ], oBody
		if answ.code isnt 200
			callback answ
		else
			db.getRule user.username, oBody.id, ( err, obj ) ->
				callback
					code: 200
					message: obj

	get_rule_log: ( user, oBody, callback ) ->
		answ = hasRequiredParams [ 'id' ], oBody
		if answ.code isnt 200
			callback answ
		else
			db.getLog user.username, oBody.id, ( err, obj ) ->
				callback
					code: 200
					message: obj

	# A rule needs to be in following format:
	
	# - id
	# - event
	# - conditions
	# - actions
	forge_rule: ( user, oBody, callback ) ->
		answ = hasRequiredParams [ 'id', 'eventname', 'conditions', 'actions' ], oBody
		if answ.code isnt 200
			callback answ
		else
			if oBody.overwrite
				storeRule user, oBody, callback
			else
				db.getRule user.username, oBody.id, ( err, mod ) =>
					if mod
						answ.code = 409
						answ.message = 'Rule name already existing: ' + oBody.id
						callback answ
					else
						storeRule user, oBody, callback

	delete_rule: ( user, oBody, callback ) ->
		answ = hasRequiredParams [ 'id' ], oBody
		if answ.code isnt 200
			callback answ
		else
			db.deleteRule user.username, oBody.id
			geb.emit 'rule',
				intevent: 'del'
				user: user.username
				rule: null
				ruleId: oBody.id
			callback
				code: 200
				message: 'OK!'

