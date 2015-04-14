###

Engine
==================
> The heart of the WebAPI ECA System. The engine loads action dispatcher modules
> corresponding to active rules actions and invokes them if an appropriate event
> is retrieved. 

TODO events should have: raising-time, reception-time and eventually sender-uri and recipient-uri 

###

# **Loads Modules:**

# - [Logging](logging.html)
log = require './logging'
# - [Persistence](persistence.html)
db = require './persistence'
# - [Dynamic Modules](dynamic-modules.html)
dynmod = require './dynamic-modules'

# - External Modules:
#   [js-select](https://github.com/harthur/js-select)
jsonQuery = require 'js-select'

###
This is ging to have a structure like:
An object of users with their active rules and the required action modules

		"user-1":
			"rule-1":
				"rule": oRule-1
				"actions":
					"action-1": oAction-1
					"action-2": oAction-2
			"rule-2":
				"rule": oRule-2
				"actions":
					"action-1": oAction-1
		"user-2":
			"rule-3":
				"rule": oRule-3
				"actions":
					"action-3": oAction-3
###

#TODO how often do we allow rules to be processed?
#it would make sense to implement a scheduler approach, which means to store the
#events in the DB and query for them if a rule is evaluated. Through this we would allow
#a CEP approach, rather than just ECA and could combine events/evaluate time constraints
listUserRules = {}
isRunning = false

###
Module call
-----------
Initializes the Engine and starts polling the event queue for new events.

@param {Object} args
###
exports = module.exports
exports.init = () =>
	if not isRunning
		setTimeout exports.startEngine, 10 # Very important, this forks a token for the poll task
		module.exports


###
This is a helper function for the unit tests so we can verify that action
modules are loaded correctly

@public getListUserRules ()
###
#TODO we should change this to functions returning true or false rather than returning
#the whole list
exports.getListUserRules = () ->
	listUserRules

# We need this so we can shut it down after the module unit tests
exports.startEngine = () ->
	if not isRunning
		isRunning = true
		pollQueue()

###
An event associated to rules happened and is captured here. Such events 
are basically CRUD on rules.

@public internalEvent ( *evt* )
@param {Object} evt
###
exports.internalEvent = ( evt ) =>
	if not listUserRules[ evt.user ] and evt.intevent isnt 'del'
		listUserRules[ evt.user ] = {}
		
	oUser = listUserRules[ evt.user ]
	oRule = evt.rule
	if evt.intevent is 'new' or ( evt.intevent is 'init' and not oUser[ oRule.id ] )
		oUser[ oRule.id ] = 
			rule: oRule
			actions: {}
		updateActionModules oRule.id

	if evt.intevent is 'del' and oUser
		delete oUser[ evt.ruleId ]

	# If a user is empty after all the updates above, we remove her from the list
	if JSON.stringify( oUser ) is "{}"
		delete listUserRules[ evt.user ]



###
As soon as changes were made to the rule set we need to ensure that the aprropriate action
dispatcher modules are loaded, updated or deleted.

@private updateActionModules ( *updatedRuleId* )
@param {Object} updatedRuleId
###
updateActionModules = ( updatedRuleId ) =>
	
	# Remove all action dispatcher modules that are not required anymore
	fRemoveNotRequired = ( oUser ) ->

		# Check whether the action is still existing in the rule
		fRequired = ( actionName ) ->
			for action in oUser[ updatedRuleId ].rule.actions
				# Since the event is in the format 'module -> function' we need to split the string
				if ( action.split ' -> ' )[ 0 ] is actionName
					return true
			false

		# Go thorugh all loaded action modules and check whether the action is still required
		if oUser[updatedRuleId]
			for action of oUser[updatedRuleId].rule.actions 
				delete oUser[updatedRuleId].actions[action] if not fRequired action

	fRemoveNotRequired oUser for name, oUser of listUserRules

	# Add action dispatcher modules that are not yet loaded
	fAddRequired = ( userName, oUser ) =>

		# Check whether the action is existing in a rule and load if not
		fCheckRules = ( oMyRule ) =>

			# Load the action dispatcher module if it was part of the updated rule or if it's new
			fAddIfNewOrNotExisting = ( actionName ) =>
				moduleName = (actionName.split ' -> ')[ 0 ]
				if not oMyRule.actions[moduleName] or oMyRule.rule.id is updatedRuleId
					db.actionDispatchers.getModule userName, moduleName, ( err, obj ) =>
						if obj
							# we compile the module and pass: 
							dynmod.compileString obj.data,  # code
								userName,                           # userId
								oMyRule.rule,                    	# oRule
								moduleName,                         # moduleId
								obj.lang,                           # script language
								"actiondispatcher",                    # module type
								db.actionDispatchers,                  # the DB interface
								( result ) =>
									if result.answ.code is 200
										log.info "EN | Module '#{ moduleName }' successfully loaded for userName
											'#{ userName }' in rule '#{ oMyRule.rule.id }'"
									else
										log.error "EN | Compilation of code failed! #{ userName },
											#{ oMyRule.rule.id }, #{ moduleName }: #{ result.answ.message }"
									oMyRule.actions[moduleName] = result
						else
							log.warn "EN | #{ moduleName } not found for #{ oMyRule.rule.id }!"

			fAddIfNewOrNotExisting action for action in oMyRule.rule.actions

		# Go thorugh all rules and check whether the action is still required
		fCheckRules oRl for nmRl, oRl of oUser

	# load all required modules for all users
	fAddRequired userName, oUser for userName, oUser of listUserRules

numExecutingFunctions = 1
pollQueue = () ->
	if isRunning
		db.popEvent ( err, obj ) ->
			if not err and obj
				processEvent obj
		setTimeout pollQueue, 20 * numExecutingFunctions #FIXME right way to adapt to load?

oOperators =
	'<': ( x, y ) -> x < y
	'<=': ( x, y ) -> x <= y
	'>': ( x, y ) -> x > y
	'>=': ( x, y ) -> x >= y
	'==': ( x, y ) -> x is y
	'!=': ( x, y ) -> x isnt y
	'instr': ( x, y ) -> x.indexOf( y ) > -1

###
Checks whether all conditions of the rule are met by the event.

@private validConditions ( *evt, rule* )
@param {Object} evt
@param {Object} rule
###
validConditions = ( evt, rule, userId, ruleId ) ->
	if rule.conditions.length is 0
		return true
	for cond in rule.conditions
		selectedProperty = jsonQuery( evt, cond.selector ).nodes()
		if selectedProperty.length is 0
			db.appendLog userId, ruleId, 'Condition', "Node not found in event: #{ cond.selector }"
			return false 

		op = oOperators[ cond.operator ]
		if not op
			db.appendLog userId, ruleId, 'Condition', "Unknown operator: #{ cond.operator }.
				Use one of #{ Object.keys( oOperators ).join ', ' }"
			return false

		try
			# maybe we should only allow certain ops for certain types
			if cond.type is 'string'
				val = selectedProperty[ 0 ]
			else if cond.type is 'bool'
				val = selectedProperty[ 0 ]
			else if cond.type is 'value'
				val = parseFloat( selectedProperty[ 0 ] ) || 0

			if not op val, cond.compare
				return false
		catch err
			db.appendLog userId, ruleId, 'Condition', "Error: Selector '#{ cond.selector }',
				Operator #{ cond.operator }, Compare: #{ cond.compare }"
			
	return true

###
Handles retrieved events.

@private processEvent ( *evt* )
@param {Object} evt
###
processEvent = ( evt ) =>
	fSearchAndInvokeAction = ( node, arrPath, funcName, evt, depth ) =>
		if not node
			log.error "EN | Didn't find property in user rule list: " + arrPath.join( ', ' ) + " at depth " + depth
			return
		if depth is arrPath.length
			try
				numExecutingFunctions++
				log.info "EN | #{ funcName } executes..."
				arrArgs = []
				if node.funcArgs[ funcName ]
					for oArg in node.funcArgs[ funcName ]
						arrSelectors = oArg.value.match /#\{(.*?)\}/g
						argument = oArg.value
						if arrSelectors
							for sel in arrSelectors
								selector = sel.substring 2, sel.length - 1
								data = jsonQuery( evt.body, selector ).nodes()[ 0 ]
								argument = argument.replace sel, data
								if oArg.value is sel
									argument = data # if the user wants to pass an object, we allow him to do so
						# if oArg.jsselector
						arrArgs.push argument #jsonQuery( evt.body, oArg.value ).nodes()[ 0 ]
						# else
						# 	arrArgs.push oArg.value
				else
					log.warn "EN | Weird! arguments not loaded for function '#{ funcName }'!"
					arrArgs.push null
				arrArgs.push evt
				node.module[ funcName ].apply this, arrArgs
				log.info "EN | #{ funcName } finished execution"
			catch err
				log.info "EN | ERROR IN ACTION INVOKER: " + err.message
				node.logger err.message
			if numExecutingFunctions-- % 100 is 0
				log.warn "EN | The system is producing too many tokens! Currently: #{ numExecutingFunctions }"
		else
			fSearchAndInvokeAction node[arrPath[depth]], arrPath, funcName, evt, depth + 1

	log.info 'EN | Processing event: ' + evt.eventname
	fCheckEventForUser = ( userName, oUser ) =>
		for ruleName, oMyRule of oUser

			ruleEvent = oMyRule.rule.eventname
			if oMyRule.rule.timestamp
				ruleEvent += '_created:' + oMyRule.rule.timestamp
			if evt.eventname is ruleEvent and validConditions evt, oMyRule.rule, userName, ruleName
				
				log.info 'EN | EVENT FIRED: ' + evt.eventname + ' for rule ' + ruleName
				
				for action in oMyRule.rule.actions
					arr = action.split ' -> '
					fSearchAndInvokeAction listUserRules, [ userName, ruleName, 'actions', arr[0]], arr[1], evt, 0

	# If the event is bound to a user, we only process it for him
	if evt.username
		fCheckEventForUser evt.username, listUserRules[ evt.username ]

	# Else we loop through all users
	else
		fCheckEventForUser userName, oUser for userName, oUser of listUserRules

exports.shutDown = () ->
	isRunning = false
	listUserRules = {}
	