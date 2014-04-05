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
  db.getAllActivatedRuleIdsPerUser ( err, objUsers ) ->

    # Go through all rules of each user
    fGoThroughUsers = ( user, rules ) ->

      # Fetch the rules object for each rule in each user
      fFetchRule = ( userName ) ->
        ( rule ) ->
          db.getRule rule, ( err, strRule ) =>
            try 
              oRule = JSON.parse strRule
              db.resetLog userName, oRule.id
              db.appendLog userName, oRule.id, "INIT", "Rule '#{ oRule.id }' initialized"

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
  dbMod.getAvailableModuleIds user.username, ( err, arrNames ) ->
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
        dbMod.getModule id, ( err, oModule ) =>
          if oModule
            oRes[id] = JSON.parse oModule.functions
          if --sem is 0
            answReq()
      fGetFunctions id for id in arrNames

getModuleParams = ( user, oPayload, dbMod, callback ) ->
  answ = hasRequiredParams [ 'id' ], oPayload
  if answ.code isnt 200
    callback answ
  else
    dbMod.getModuleParams oPayload.id, ( err, oPayload ) ->
      answ.message = oPayload
      callback answ


forgeModule = ( user, oPayload, dbMod, callback ) =>
  answ = hasRequiredParams [ 'id', 'params', 'lang', 'data' ], oPayload
  if answ.code isnt 200
    callback answ
  else
    dbMod.getModule oPayload.id, ( err, mod ) =>
      if mod
        answ.code = 409
        answ.message = 'Module name already existing: ' + oPayload.id
        callback answ
      else
        src = oPayload.data
        dynmod.compileString src, user.username, 'dummyRule', oPayload.id, oPayload.lang, null, ( cm ) =>
          answ = cm.answ
          if answ.code is 200
            funcs = []
            funcs.push name for name, id of cm.module
            @log.info "CM | Storing new module with functions #{ funcs.join() }"
            answ.message = 
              " Module #{ oPayload.id } successfully stored! Found following function(s): #{ funcs }"
            oPayload.functions = JSON.stringify funcs
            dbMod.storeModule user.username, oPayload
            if oPayload.public is 'true'
              dbMod.publish oPayload.id
          callback answ

commandFunctions =
  get_public_key: ( user, oPayload, callback ) ->
    callback
      code: 200
      message: dynmod.getPublicKey()

# EVENT POLLERS
# -------------
  get_event_pollers: ( user, oPayload, callback ) ->
    getModules  user, oPayload, db.eventPollers, callback
  
  get_full_event_poller: ( user, oPayload, callback ) ->
    db.eventPollers.getModule oPayload.id, ( err, obj ) ->
      callback
        code: 200
        message: JSON.stringify obj
  
  get_event_poller_params: ( user, oPayload, callback ) ->
    getModuleParams user, oPayload, db.eventPollers, callback

  forge_event_poller: ( user, oPayload, callback ) ->
    forgeModule user, oPayload, db.eventPollers, callback
 
  delete_event_poller: ( user, oPayload, callback ) ->
    answ = hasRequiredParams [ 'id' ], oPayload
    if answ.code isnt 200
      callback answ
    else
      db.eventPollers.deleteModule oPayload.id
      callback
        code: 200
        message: 'OK!'

# ACTION INVOKERS
# ---------------
  get_action_invokers: ( user, oPayload, callback ) ->
    getModules  user, oPayload, db.actionInvokers, callback
  
  get_full_action_invoker: ( user, oPayload, callback ) ->
    db.actionInvokers.getModule oPayload.id, ( err, obj ) ->
      callback
        code: 200
        message: JSON.stringify obj

  get_action_invoker_params: ( user, oPayload, callback ) ->
    getModuleParams user, oPayload, db.actionInvokers, callback
  
  forge_action_invoker: ( user, oPayload, callback ) ->
    forgeModule user, oPayload, db.actionInvokers, callback

  delete_action_invoker: ( user, oPayload, callback ) ->
    answ = hasRequiredParams [ 'id' ], oPayload
    if answ.code isnt 200
      callback answ
    else
      db.actionInvokers.deleteModule oPayload.id
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
      db.getRule oPayload.id, ( err, oExisting ) ->
        if oExisting isnt null
          answ =
            code: 409
            message: 'Rule name already existing!'
        else
          rule =
            id: oPayload.id
            event: oPayload.event
            conditions: oPayload.conditions
            actions: oPayload.actions
          strRule = JSON.stringify rule
          db.storeRule rule.id, strRule
          db.linkRule rule.id, user.username
          db.activateRule rule.id, user.username
          if oPayload.event_params
            epModId = rule.event.split( ' -> ' )[0]
            db.eventPollers.storeUserParams epModId, user.username, oPayload.event_params
          arrParams = oPayload.action_params
          db.actionInvokers.storeUserParams id, user.username, JSON.stringify params for id, params of arrParams
          db.resetLog user.username, rule.id
          db.appendLog user.username, rule.id, "INIT", "Rule '#{ rule.id }' initialized"
          eventEmitter.emit 'rule',
            event: 'new'
            user: user.username
            rule: rule
          answ =
            code: 200
            message: "Rule '#{ rule.id }' stored and activated!"
        callback answ

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
