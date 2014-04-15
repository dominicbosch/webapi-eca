###

Engine
==================
> The heart of the WebAPI ECA System. The engine loads action invoker modules
> corresponding to active rules actions and invokes them if an appropriate event
> is retrieved. 

###

# **Loads Modules:**

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
exports = module.exports = ( args ) =>
  if not isRunning
    @log = args.logger
    db args
    dynmod args
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
  if not listUserRules[evt.user] and evt.event isnt 'del'
    listUserRules[evt.user] = {}

  oUser = listUserRules[evt.user]
  oRule = evt.rule
  if evt.event is 'new' or ( evt.event is 'init' and not oUser[oRule.id] )
    oUser[oRule.id] = 
      rule: oRule
      actions: {}
    updateActionModules oRule.id

  if evt.event is 'del' and oUser
    delete oUser[evt.ruleId]

  # If a user is empty after all the updates above, we remove her from the list
  if JSON.stringify( oUser ) is "{}"
    delete listUserRules[evt.user]



###
As soon as changes were made to the rule set we need to ensure that the aprropriate action
invoker modules are loaded, updated or deleted.

@private updateActionModules ( *updatedRuleId* )
@param {Object} updatedRuleId
###
updateActionModules = ( updatedRuleId ) ->
  
  # Remove all action invoker modules that are not required anymore
  fRemoveNotRequired = ( oUser ) ->

    # Check whether the action is still existing in the rule
    fRequired = ( actionName ) ->
      for action in oUser[updatedRuleId].rule.actions
        # Since the event is in the format 'module -> function' we need to split the string
        if (action.split ' -> ')[0] is actionName
          return true
      false

    # Go thorugh all loaded action modules and check whether the action is still required
    for action of oUser[updatedRuleId].rule.actions 
      delete oUser[updatedRuleId].actions[action] if not fRequired action

  fRemoveNotRequired oUser for name, oUser of listUserRules

  # Add action invoker modules that are not yet loaded
  fAddRequired = ( userName, oUser ) ->

    # Check whether the action is existing in a rule and load if not
    fCheckRules = ( oMyRule ) ->

      # Load the action invoker module if it was part of the updated rule or if it's new
      fAddIfNewOrNotExisting = ( actionName ) ->
        moduleName = (actionName.split ' -> ')[0]
        if not oMyRule.actions[moduleName] or oMyRule.rule.id is updatedRuleId
          db.actionInvokers.getModule moduleName, ( err, obj ) ->
            # we compile the module and pass: 
            dynmod.compileString obj.data,  # code
              userName,                           # userId
              oMyRule.rule.id,                    # ruleId
              moduleName,                         # moduleId
              obj.lang,                           # script language
              db.actionInvokers,                   # the DB interface
              ( result ) ->
                if not result.answ is 200
                  @log.error "EN | Compilation of code failed! #{ userName },
                    #{ oMyRule.rule.id }, #{ moduleName }"
                oMyRule.actions[moduleName] = result.module

      fAddIfNewOrNotExisting action for action in oMyRule.rule.actions

    # Go thorugh all rules and check whether the action is still required
    fCheckRules oRl for nmRl, oRl of oUser

  # load all required modules for all users
  fAddRequired userName, oUser for userName, oUser of listUserRules

semaphore = 0
pollQueue = () ->
  if isRunning
    db.popEvent ( err, obj ) ->
      if not err and obj
        processEvent obj
      semaphore--
    setTimeout pollQueue, 20 * semaphore #FIXME right wayx to adapt to load?

###
Checks whether all conditions of the rule are met by the event.

@private validConditions ( *evt, rule* )
@param {Object} evt
@param {Object} rule
###
validConditions = ( evt, rule ) ->
  if rule.conditions.length is 0
    return true
  for prop in rule.conditions
    return false if jsonQuery( evt, prop ).nodes().length is 0
  return true

semaphore = 0
###
Handles retrieved events.

@private processEvent ( *evt* )
@param {Object} evt
###
processEvent = ( evt ) =>
  fSearchAndInvokeAction = ( node, arrPath, funcName, evt, depth ) ->
    if not node
      @log.error "EN | Didn't find property in user rule list: " + arrPath.join ', ' + " at depth " + depth
      return
    if depth is arrPath.length
      try
        semaphore++
        node[funcName] evt.payload
      catch err
        @log.info "EN | ERROR IN ACTION INVOKER: " + err.message
        node.logger err.message
      if semaphore-- % 100 is 0
        @log.warn "EN | The system is producing too many tokens! Currently: #{ semaphore }"
    else
      fSearchAndInvokeAction node[arrPath[depth]], arrPath, funcName, evt, depth + 1

  @log.info 'EN | processing event: ' + evt.event + '(' + evt.eventid + ')'
  for userName, oUser of listUserRules
    for ruleName, oMyRule of oUser
      if evt.event is oMyRule.rule.event and validConditions evt, oMyRule.rule
        @log.info 'EN | EVENT FIRED: ' + evt.event + '(' + evt.eventid + ') for rule ' + ruleName
        for action in oMyRule.rule.actions
          arr = action.split ' -> '
          fSearchAndInvokeAction listUserRules, [ userName, ruleName, 'actions', arr[0]], arr[1], evt, 0

exports.shutDown = () ->
  isRunning = false