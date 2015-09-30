###

Engine
==================
> The heart of the WebAPI ECA System. The engine loads action dispatcher modules
> corresponding to active rules actions and invokes them if an appropriate event
> is retrieved. 

TODO events should have: raising-time, reception-time and eventually sender-uri and recipient-uri 

###

db = global.db
geb = global.eventBackbone

# **Loads Modules:**

# - [Logging](logging.html)
log = require './logging'
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

###
This is a helper function for the unit tests so we can verify that action
modules are loaded correctly

@public getListUserRules ()
###
#TODO we should change this to functions returning true or false rather than returning
#the whole list
exports.getListUserRules = () ->
	listUserRules

geb.addListener 'rule', ( evt ) =>
# Fetch all active rules per user
db.getAllActivatedRuleIdsPerUser ( err, objUsers ) =>
	

	# FIXME Using let instead of var int hose loops below we will be able to save ourselves from the scope problem!
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
An event associated to rules happened and is captured here. Such events 
are basically CRUD on rules.

@public internalEvent ( *evt* )
@param {Object} evt
###


geb.addListener 'rule', ( evt ) =>
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
	for name, oUser of listUserRules

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


	# load all required modules for all users
	# Add action dispatcher modules that are not yet loaded
	for userName, oUser of listUserRules

		# Check whether the action is existing in a rule and load if not
		# Go thorugh all rules and check whether the action is still required
		for nmRl, oMyRule of oUser
			for action in oMyRule.rule.actions
			# Load the action dispatcher module if it was part of the updated rule or if it's new
				moduleName = (action.split ' -> ')[ 0 ]
				if not oMyRule.actions[moduleName] or oMyRule.rule.id is updatedRuleId
					db.actionDispatchers.getModule userName, moduleName, ( err, obj ) =>
						if obj
							# we compile the module and pass: 
							args =
								src: obj.data,					# code
								lang: obj.lang,					# script language
								userId: userName,				# userId
								modId: moduleName,				# moduleId
								modType: 'actiondispatcher'		# module type
								oRule: oMyRule.rule,			# oRule
							dynmod.compileString args, ( result ) =>
									if result.answ.code is 200
										log.info "EN | Module '#{ moduleName }' successfully loaded for userName
											'#{ userName }' in rule '#{ oMyRule.rule.id }'"
									else
										log.error "EN | Compilation of code failed! #{ userName },
											#{ oMyRule.rule.id }, #{ moduleName }: #{ result.answ.message }"
									oMyRule.actions[moduleName] = result
						else
							log.warn "EN | #{ moduleName } not found for #{ oMyRule.rule.id }!"



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

@public processEvent ( *evt* )
@param {Object} evt
###
exports.processEvent = ( evt ) =>
	fSearchAndInvokeAction = ( node, arrPath, funcName, evt, depth ) =>
		if not node
			log.error "EN | Didn't find property in user rule list: " + arrPath.join( ', ' ) + " at depth " + depth
			return
		if depth is arrPath.length
			try
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
		else
			fSearchAndInvokeAction node[arrPath[depth]], arrPath, funcName, evt, depth + 1

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

	log.info 'EN | Processing event: ' + evt.eventname
	# If the event is bound to a user, we only process it for him
	if evt.username
		fCheckEventForUser evt.username, listUserRules[ evt.username ]

	# Else we loop through all users
	else
		fCheckEventForUser userName, oUser for userName, oUser of listUserRules

exports.shutDown = () ->
	listUserRules = {}
	