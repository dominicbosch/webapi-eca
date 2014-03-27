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


# callback ( answ ) where answ is an object and contains at least the HTTP response code and a message
# obj has a command parameter and an optional payload which is a stringified JSON object
exports.processRequest = ( user, obj, callback ) =>
  if commandFunctions[obj.command]
    try
      oPayload = JSON.parse obj.payload
      commandFunctions[obj.command] user, oPayload, callback
    catch err
      callback
        code: 400
        message: 'Nice try...'
  else
    callback
      code: 404
      message: 'What do you want from me?'

commandFunctions =
  forge_event_poller: ( user, obj, callback ) =>
    answ = 
      code: 200
    if not obj.id or not obj.params
      answ.code = 400
      answ.message = "Your request didn't contain all necessary fields! id and params required"
    else    
      db.eventPollers.getModule obj.id, ( err, mod ) =>
        if mod
          answ.code = 409
          answ.message = 'Event Poller module name already existing: ' + obj.id
        else
          src = obj.data
          cm = dynmod.compileString src, obj.id, {}, obj.lang
          answ = cm.answ
          if answ.code is 200
            events = []
            events.push name for name, id of cm.module
            @log.info "CM | Storing new eventpoller with events #{ events }"
            answ.message = 
              "Event Poller module successfully stored! Found following event(s): #{ events }"
            obj.events = JSON.stringify events
            db.eventPollers.storeModule obj.id, user.username, obj
            if obj.public is 'true'
              db.eventPollers.publish obj.id
      callback answ
  
  get_event_pollers: ( user, obj, callback ) ->
    db.eventPollers.getAvailableModuleIds user.username, ( err, obj ) ->
      oRes = {}
      sem = obj.length
      fGetEvents = ( id ) ->
        db.eventPollers.getModule id, ( err, obj ) ->
          oRes[id] = obj.events
          if --sem is 0
            callback 
              code: 200
              message: oRes
      fGetEvents id for id in obj
  
  get_event_poller_params: ( user, obj, callback ) ->
    db.eventPollers.getModuleParams obj.id, ( err, obj ) ->
      callback
        code: 200
        message: obj

  get_action_invokers: ( user, obj, callback ) ->
    db.actionInvokers.getAvailableModuleIds user.username, ( err, obj ) ->
      oRes = {}
      sem = obj.length
      fGetActions = ( id ) ->
        db.actionInvokers.getModule id, ( err, obj ) ->
          oRes[id] = obj.actions
          if --sem is 0
            callback 
              code: 200
              message: oRes
      fGetActions id for id in obj

  get_action_invoker_params: ( user, obj, callback ) ->
    db.actionInvokers.getModuleParams obj.id, ( err, obj ) ->
      callback
        code: 200
        message: obj

  forge_action_invoker: ( user, obj, callback ) =>
    answ = 
      code: 200

    db.actionInvokers.getModule obj.id, ( err, mod ) =>
      if mod
        answ.code = 409
        answ.message = 'Action Invoker module name already existing: ' + obj.id

      else
        src = obj.data
        cm = dynmod.compileString src, obj.id, {}, obj.lang
        answ = cm.answ
        if answ.code is 200
          if not obj.id or not obj.params
            answ.code = 400
            answ.message = "Your request didn't contain all necessary fields! id and params required"
          else
            actions = []
            actions.push name for name, id of cm.module
            @log.info "CM | Storing new eventpoller with actions #{ actions }"
            answ.message = 
              "Action Invoker module successfully stored! Found following action(s): #{ actions }"
            obj.actions = JSON.stringify actions
            db.actionInvokers.storeModule obj.id, user.username, obj
            if obj.public is 'true'
              db.actionInvokers.publish obj.id
      callback answ

  get_rules: ( user, obj, callback ) ->
    console.log 'CM | Implement get_rules'

  # A rule needs to be in following format:
  # - id
  # - event
  # - conditions
  # - actions
  forge_rule: ( user, obj, callback ) =>
    obj = JSON.parse obj
    if not obj.id or not obj.event or 
        not obj.conditions or not obj.actions
      answ =
        code: 400
        message: 'Missing properties in rule!'
    else
      db.getRule obj.id, ( err, oExisting ) =>
        try
          if oExisting isnt null
            answ =
              code: 409
              message: 'Rule name already existing!'
          else
            rule =
              id: obj.id
              event: obj.event
              conditions: JSON.parse obj.conditions
              actions: JSON.parse obj.actions
            strRule = JSON.stringify rule
            db.storeRule rule.id, strRule
            db.linkRule rule.id, user.username
            db.activateRule rule.id, user.username
            if obj.event_params
              db.eventPollers.storeUserParams ep.module, user.username, obj.event_params
            arrParams = JSON.parse obj.action_params
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
        callback answ
