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
Add an event handler (eh) that listens for rules.

@public addRuleListener ( *eh* )
@param {function} eh
###

exports.internalEvent = ( evt ) =>
  if not listUserRules[evt.user]
    listUserRules[evt.user] =
      rules: {}
      actions: {}

  oUser = listUserRules[evt.user]
  oRule = evt.rule
  if evt.event is 'new' or ( evt.event is 'init' and not oUser.rules[oRule.id] )
    oUser.rules[oRule.id] = oRule
    updateActionModules oRule

updateActionModules = ( oNewRule ) ->
  
  # Remove all action invoker modules that are not required anymore
  fRemoveNotRequired = ( oUser ) ->

    # Check whether the action is still existing in a rule
    fRequired = ( actionName ) ->
      return true for nmRl, oRl of oUser.rules when actionName in oRl.actions
      return false

    # Go thorugh all actions and check whether the action is still required
    delete oUser.actions[action] for action of oUser.actions when not fRequired action

  fRemoveNotRequired oUser for name, oUser of listUserRules

  # Add action invoker modules that are not yet loaded
  fAddRequired = ( userName, oUser ) ->

    # Check whether the action is existing in a rule and load if not
    fCheckRules = ( oRule ) ->

      # Load the action invoker module if it was part of the updated rule or if it's new
      fAddIfNewOrNotExisting = ( actionName ) ->
        moduleName = (actionName.split ' -> ')[0]
        if not oUser.actions[moduleName] or oRule.id is oNewRule.id
          db.actionInvokers.getModule moduleName, ( err, obj ) ->
            params = {}
            res = dynmod.compileString obj.data, userName, moduleName, params, obj.lang
            oUser.actions[moduleName] = res.module

      fAddIfNewOrNotExisting action for action in oRule.actions

    # Go thorugh all actions and check whether the action is still required
    fCheckRules oRl for nmRl, oRl of oUser.rules

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
  conds = rule.conditions
  return false for prop of conds when not evt[prop] or evt[prop] isnt conds[prop]
  return true

###
Handles retrieved events.

@private processEvent ( *evt* )
@param {Object} evt
###
processEvent = ( evt ) ->
  @log.info('EN | processing event: ' + evt.event + '(' + evt.eventid + ')');
  # var actions = checkEvent(evt);
  # console.log('found actions to invoke:');
  # console.log(actions);
  # for(var user in actions) {
  #   for(var module in actions[user]) {
  #     for(var i = 0; i < actions[user][module]['functions'].length; i++) {
  #       var act = {
  #         module: module,
  #         function: actions[user][module]['functions'][i]
  #       }
  #       invokeAction(evt, user, act);
 
#  */
# function checkEvent(evt) {
#   var actions = {}, tEvt;
#   for(var user in listRules) {
#     actions[user] = {};
#     for(var rule in listRules[user]) {
#     //TODO this needs to get depth safe, not only data but eventually also
#     // on one level above (eventid and other meta)
#       tEvt = listRules[user][rule].event;
#       if(tEvt.module + ' -> ' + tEvt.function === evt.event && validConditions(evt.payload, listRules[user][rule])) {
#         log.info('EN', 'Rule "' + rule + '" fired');
#         var oAct = listRules[user][rule].actions;
#         console.log (oAct);
#         for(var module in oAct) {
#           if(!actions[user][module]) {
#             actions[user][module] = {
#               functions: []
#             };
#           }
#           for(var i = 0; i < oAct[module]['functions'].length; i++ ){
#             console.log ('processing action ' + i + ', ' + oAct[module]['functions'][i]);
#             actions[user][module]['functions'].push(oAct[module]['functions'][i]);
#             // if(actions[user].indexOf(arrAct[i]) === -1) actions[user].push(arrAct[i]);
#           }
#         }
#       }
#     }
#   }
#   return actions;
# }

# /**
#  * Invoke an action according to its type.
#  * @param {Object} evt The event that invoked the action
#  * @param {Object} action The action to be invoked
#  */
# function invokeAction( evt, user, action ) {
#   console.log('invoking action');
#   var actionargs = {};
#       //FIXME internal events, such as loopback ha sno arrow
#       //TODO this requires change. the module property will be the identifier
#       // in the actions object (or shall we allow several times the same action?)
#   console.log(action.module);
#   console.log(listActionModules);
#   var srvc = listActionModules[user][action.module];
#   console.log(srvc);
#   if(srvc && srvc[action.function]) {
#     //FIXME preprocessing not only on data
#     //FIXME no preprocessing at all, why don't we just pass the whole event to the action?'
#     // preprocessActionArguments(evt.payload, action.arguments, actionargs);
#     try {
#       if(srvc[action.function]) srvc[action.function](evt.payload);
#     } catch(err) {
#       log.error('EN', 'during action execution: ' + err);
#     }
#   }
#   else log.info('EN', 'No api interface found for: ' + action.module);
# }

exports.shutDown = () ->
  isRunning = false