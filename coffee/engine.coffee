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
#   [js-select](https://www.npmjs.org/package/js-select)
jsonQuery = require 'js-select'

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
    isRunning = true
    @log = args.logger
    db args
    dynmod args
    pollQueue()
    module.exports


###
This is a helper function for the unit tests so we can verify that action
modules are loaded correctly
#TODO we should change this to functions returning true or false rather than returning
#the whole list
@public getListUserRules ()
###
exports.getListUserRules = () ->
  listUserRules


###
An event associated to rules happened and is captured here. Such events 
are basically CRUD on rules.

@public internalEvent ( *evt* )
@param {Object} evt
###
exports.internalEvent = ( evt ) =>
  if not listUserRules[evt.user] and evt.event isnt 'del'
    listUserRules[evt.user] =
      rules: {}
      actions: {}

  oUser = listUserRules[evt.user]
  oRule = evt.rule
  if evt.event is 'new' or ( evt.event is 'init' and not oUser.rules[oRule.id] )
    oUser.rules[oRule.id] = oRule
    updateActionModules oRule, false

  if evt.event is 'del' and oUser
    delete oUser.rules[oRule.id]
    updateActionModules oRule, true


###
As soon as changes were made to the rule set we need to ensure that the aprropriate action
invoker modules are loaded, updated or deleted.

@private updateActionModules ( *oNewRule* )
@param {Object} oNewRule
###
updateActionModules = ( oNewRule, isDeleteOp ) ->
  
  # Remove all action invoker modules that are not required anymore
  fRemoveNotRequired = ( oUser ) ->

    # Check whether the action is still existing in a rule
    fRequired = ( actionName ) ->
      # return true for nmRl, oRl of oUser.rules when actionName in oRl.actions
      for nmRl, oRl of oUser.rules
        for action in oRl.actions
          mod = (action.split ' -> ')[0]
          if mod is actionName
            return true
      false


    # Go thorugh all actions and check whether the action is still required
    for action of oUser.actions 
      req = fRequired action
      if not req
        delete oUser.actions[action]
    # delete oUser.actions[action] for action of oUser.actions when not fRequired action

  fRemoveNotRequired oUser for name, oUser of listUserRules

  # Add action invoker modules that are not yet loaded
  fAddRequired = ( userName, oUser ) ->

    # Check whether the action is existing in a rule and load if not
    fCheckRules = ( oRule ) ->

      # Load the action invoker module if it was part of the updated rule or if it's new
      fAddIfNewOrNotExisting = ( actionName ) ->
        moduleName = (actionName.split ' -> ')[0]
        if not isDeleteOp and ( not oUser.actions[moduleName] or oRule.id is oNewRule.id )
          db.actionInvokers.getModule moduleName, ( err, obj ) ->
            params = {}
            res = dynmod.compileString obj.data, userName, moduleName, params, obj.lang
            oUser.actions[moduleName] = res.module

      fAddIfNewOrNotExisting action for action in oRule.actions

    # Go thorugh all actions and check whether the action is still required
    fCheckRules oRl for nmRl, oRl of oUser.rules
    if JSON.stringify( oUser.rules ) is "{}" # TODO check whether this is really doing what it is supposed to do
      delete listUserRules[userName]

  fAddRequired userName, oUser for userName, oUser of listUserRules

pollQueue = () ->
  if isRunning
    db.popEvent ( err, obj ) ->
      if not err and obj
        processEvent obj
      setTimeout pollQueue, 50 #TODO adapt to load

###
Checks whether all conditions of the rule are met by the event.

@private validConditions ( *evt, rule* )
@param {Object} evt
@param {Object} rule
###
validConditions = ( evt, rule ) ->
  for prop in rule.conditions
    return false if jsonQuery( evt, prop ).nodes().length is 0
  return true

###
Handles retrieved events.

@private processEvent ( *evt* )
@param {Object} evt
###
processEvent = ( evt ) =>
  @log.info 'EN | processing event: ' + evt.event + '(' + evt.eventid + ')'
  for userName, oUser of listUserRules
    for ruleName, oRule of oUser.rules
      if evt.event is oRule.event and validConditions evt, oRule
        @log.info 'EN | EVENT FIRED: ' + evt.event + '(' + evt.eventid + ') for rule ' + ruleName
        # fStoreAction userName, action for action in oRule.actions
        for action in oRule.actions
          arr = action.split ' -> '
          listUserRules[userName]['actions'][arr[0]][arr[1]] evt

exports.shutDown = () ->
  isRunning = false