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
Initializes the HTTP listener and its request handler.

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
The callback function `cb( obj )` will receive an object containing the HTTP
response code and a corresponding message.

@public processRequest ( *user, oReq, cb* )
@param {Object} user
@param {Object} oReq
@param {function} cb
###

exports.processRequest = ( user, oReq, cb ) =>
  if not oReq.payload
    oReq.payload = '{}'
  try
    dat = JSON.parse oReq.payload
  catch err
    return cb
      code: 404
      message: 'You had a strange payload in your request!'
  if commandFunctions[oReq.command]
    commandFunctions[oReq.command] user, dat, cb
  else
    cb
      code: 404
      message: 'Strange request!'

hasRequiredParams = ( arrParams, oReq ) ->
  answ =
    code: 400
    message: "Your request didn't contain all necessary fields! id and params required"
  return answ for param in arrParams when not oReq[param]
  answ.code = 200
  answ.message = 'All required properties found'
  answ

commandFunctions =
  forge_event_poller: ( user, oReq, cb ) =>
    answ = hasRequiredParams [ 'id', 'params', 'lang', 'data' ], oReq
    if answ.code isnt 200
      cb answ
    else
      db.eventPollers.getModule oReq.id, ( err, mod ) =>
        if mod
          answ.code = 409
          answ.message = 'Event Poller module name already existing: ' + oReq.id
        else
          src = oReq.data
          cm = dynmod.compileString src, oReq.id, {}, oReq.lang
          answ = cm.answ
          if answ.code is 200
            events = []
            events.push name for name, id of cm.module
            @log.info "CM | Storing new eventpoller with events #{ events }"
            answ.message = 
              "Event Poller module successfully stored! Found following event(s): #{ events }"
            oReq.events = JSON.stringify events
            db.eventPollers.storeModule oReq.id, user.username, oReq
            if oReq.public is 'true'
              db.eventPollers.publish oReq.id
        cb answ
  
  get_event_pollers: ( user, oReq, cb ) ->
    db.eventPollers.getAvailableModuleIds user.username, ( err, arrNames ) ->
      oRes = {}
      answReq = () ->
        cb
          code: 200
          message: oRes
      sem = arrNames.length
      if sem is 0
        answReq()
      else
        fGetEvents = ( id ) ->
          db.eventPollers.getModule id, ( err, oModule ) ->
            oRes[id] = oModule.events
            if --sem is 0
              answReq()
        fGetEvents id for id in arrNames
  
  get_event_poller_params: ( user, oReq, cb ) ->
    answ = hasRequiredParams [ 'id' ], oReq
    if answ.code isnt 200
      cb answ
    else
      db.eventPollers.getModuleParams oReq.id, ( err, oReq ) ->
        answ.message = oReq
        cb answ

  get_action_invokers: ( user, oReq, cb ) ->
    db.actionInvokers.getAvailableModuleIds user.username, ( err, arrNames ) ->
      oRes = {}
      answReq = () ->
        cb
          code: 200
          message: oRes
      sem = arrNames.length
      if sem is 0
        answReq()
      else
        fGetActions = ( id ) ->
          db.actionInvokers.getModule id, ( err, oModule ) ->
            oRes[id] = oModule.actions
            if --sem is 0
              answReq()
        fGetActions id for id in arrNames

  get_action_invoker_params: ( user, oReq, cb ) ->
    answ = hasRequiredParams [ 'id' ], oReq
    if answ.code isnt 200
      cb answ
    else
      db.actionInvokers.getModuleParams oReq.id, ( err, oReq ) ->
        answ.message = oReq
        cb answ

  forge_action_invoker: ( user, oReq, cb ) =>
    answ = hasRequiredParams [ 'id', 'params', 'lang', 'data' ], oReq
    if answ.code isnt 200
      cb answ
    else
      db.actionInvokers.getModule oReq.id, ( err, mod ) =>
        if mod
          answ.code = 409
          answ.message = 'Action Invoker module name already existing: ' + oReq.id
        else
          src = oReq.data
          cm = dynmod.compileString src, oReq.id, {}, oReq.lang
          answ = cm.answ
          if answ.code is 200
            actions = []
            actions.push name for name, id of cm.module
            @log.info "CM | Storing new eventpoller with actions #{ actions }"
            answ.message = 
              "Action Invoker module successfully stored! Found following action(s): #{ actions }"
            oReq.actions = JSON.stringify actions
            db.actionInvokers.storeModule oReq.id, user.username, oReq
            if oReq.public is 'true'
              db.actionInvokers.publish oReq.id
        cb answ

  get_rules: ( user, oReq, cb ) ->
    console.log 'CM | Implement get_rules'

  # A rule needs to be in following format:
  # - id
  # - event
  # - conditions
  # - actions
  forge_rule: ( user, oReq, cb ) =>
    console.log oReq
    db.getRule oReq.id, ( err, oExisting ) =>
      if oExisting isnt null
        answ =
          code: 409
          message: 'Rule name already existing!'
      else
        if not oReq.id or not oReq.event or 
            not oReq.conditions or not oReq.actions
          answ =
            code: 400
            message: 'Missing properties in rule!'
        else
          try
            rule =
              id: oReq.id
              event: oReq.event
              conditions: JSON.parse oReq.conditions
              actions: JSON.parse oReq.actions
            strRule = JSON.stringify rule
            db.storeRule rule.id, strRule
            db.linkRule rule.id, user.username
            db.activateRule rule.id, user.username
            if oReq.event_params
              db.eventPollers.storeUserParams ep.module, user.username, oReq.event_params
            arrParams = JSON.parse oReq.action_params
            db.actionInvokers.storeUserParams id, user.username, JSON.stringify params for id, params of arrParams
            @ee.emit 'newRule', strRule
            answ =
              code: 200
              message: 'Rule stored and activated!'
          catch err
            answ =
              code: 400
              message: 'bad bad request...'
            console.log err
      cb answ
