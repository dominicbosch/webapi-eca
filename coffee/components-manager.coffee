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
dynmod = require './dynamic-modules' #TODO Rename to code-loader 

# - Node.js Modules: [fs](http://nodejs.org/api/fs.html),
#   [vm](http://nodejs.org/api/vm.html) and
#   [path](http://nodejs.org/api/path.html),
#   [events](http://nodejs.org/api/events.html)
fs = require 'fs'
vm = require 'vm'
path = require 'path'
events = require 'events'

###
Module call
-----------
Initializes the Components Manager and constructs a new Event Emitter.

@param {Object} args
###
exports = module.exports = ( args ) =>
  @log = args.logger
  @ee = new events.EventEmitter()
  db args
  dynmod args
  module.exports


###
Add an event handler (eh) for a certain event (evt).
Current events are:

- init: as soon as an event handler is added, the init events are emitted for all existing rules.
- newRule: If a new rule is activated, the newRule event is emitted

@public addListener ( *evt, eh* )
@param {String} evt
@param {function} eh
###

exports.addListener = ( evt, eh ) =>
  @ee.addListener evt, eh
  if evt is 'init'
    db.getRules ( err, obj ) =>
      @ee.emit 'init', rule for id, rule of obj

###
Processes a user request coming through the request-handler.
- `user` is the user object as it comes from the DB.
- `oReq` is the request object that contains:
  - `command` as a string 
  - `payload` an optional stringified JSON object 
The callback function `callback( obj )` will receive an object
containing the HTTP response code and a corresponding message.

@public processRequest ( *user, oReq, callback* )
@param {Object} user
@param {Object} oReq
@param {function} callback
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
    commandFunctions[oReq.command] user, dat, callback
  else
    callback
      code: 404
      message: 'What do you want from me?'

hasRequiredParams = ( arrParams, oPayload ) ->
  answ =
    code: 400
    message: "Your request didn't contain all necessary fields! id and params required"
  return answ for param in arrParams when not oPayload[param]
  answ.code = 200
  answ.message = 'All required properties found'
  answ

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
        answ.message = 'Event Poller module name already existing: ' + oPayload.id
      else
        src = oPayload.data
        cm = dynmod.compileString src, user.username, oPayload.id, {}, oPayload.lang
        answ = cm.answ
        if answ.code is 200
          funcs = []
          funcs.push name for name, id of cm.module
          @log.info "CM | Storing new module with functions #{ funcs.join() }"
          answ.message = 
            "Event Poller module successfully stored! Found following function(s): #{ funcs }"
          oPayload.functions = JSON.stringify funcs
          dbMod.storeModule user.username, oPayload
          if oPayload.public is 'true'
            dbMod.publish oPayload.id
      callback answ

commandFunctions =
  get_event_pollers: ( user, oPayload, callback ) ->
    getModules  user, oPayload, db.eventPollers, callback
  
  get_action_invokers: ( user, oPayload, callback ) ->
    getModules  user, oPayload, db.actionInvokers, callback
  
  get_event_poller_params: ( user, oPayload, callback ) ->
    getModuleParams  user, oPayload, db.eventPollers, callback
  
  get_action_invoker_params: ( user, oPayload, callback ) ->
    getModuleParams  user, oPayload, db.actionInvokers, callback
  
  forge_event_poller: ( user, oPayload, callback ) ->
    forgeModule  user, oPayload, db.eventPollers, callback
  
  forge_action_invoker: ( user, oPayload, callback ) ->
    forgeModule  user, oPayload, db.actionInvokers, callback

  get_rules: ( user, oPayload, callback ) ->
    console.log 'CM | Implement get_rules'

  # A rule needs to be in following format:
  # - id
  # - event
  # - conditions
  # - actions
  forge_rule: ( user, oPayload, callback ) =>
    answ = hasRequiredParams [ 'id', 'event', 'conditions', 'actions' ], oPayload
    if answ.code isnt 200
      callback answ
    else
      db.getRule oPayload.id, ( err, oExisting ) =>
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
            db.eventPollers.storeUserParams ep.module, user.username, oPayload.event_params
          arrParams = oPayload.action_params
          db.actionInvokers.storeUserParams id, user.username, JSON.stringify params for id, params of arrParams
          @ee.emit 'newRule', strRule
          answ =
            code: 200
            message: 'Rule stored and activated!'
        callback answ