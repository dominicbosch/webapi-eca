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

exports.addListener = ( evt, eh ) =>
  @ee.addListener evt, eh
  db.getRules ( err, obj ) =>
    @ee.emit 'init', rule for id, rule of obj


# cb ( obj ) where obj should contain at least the HTTP response code and a message
exports.processRequest = ( user, obj, cb ) =>
  if commandFunctions[obj.command]
    answ = commandFunctions[obj.command] user, obj, cb
  else
    cb
      code: 404
      message: 'Strange request!'

commandFunctions =
  forge_event_poller: ( user, obj, cb ) =>
    answ = 
      code: 200

    db.getEventPoller obj.id, ( err, mod ) =>
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
          db.storeEventPoller obj.id, user.username,
            code: obj.data
            lang: obj.lang
            params: obj.params
            events: events
          if obj.public is 'true'
            db.publishEventPoller obj.id
      cb answ
  
  get_event_pollers: ( user, obj, cb ) ->
    db.getAvailableEventPollerIds user.username, ( err, obj ) ->
      oRes = {}
      sem = obj.length
      fGetEvents = ( id ) ->
        db.getEventPoller id, ( err, obj ) ->
          oRes[id] = obj.events
          if --sem is 0
            cb 
              code: 200
              message: oRes
      fGetEvents id for id in obj
  
  get_event_poller_params: ( user, obj, cb ) ->
    db.getEventPollerRequiredParams obj.id, ( err, obj ) ->
      cb
        code: 200
        message: obj

  get_action_invokers: ( user, obj, cb ) ->
    db.getAvailableActionInvokerIds user.username, ( err, obj ) ->
      oRes = {}
      sem = obj.length
      fGetActions = ( id ) ->
        db.getActionInvoker id, ( err, obj ) ->
          oRes[id] = obj.actions
          if --sem is 0
            cb 
              code: 200
              message: oRes
      fGetActions id for id in obj

  get_action_invoker_params: ( user, obj, cb ) ->
    db.getActionInvokerRequiredParams obj.id, ( err, obj ) ->
      cb
        code: 200
        message: obj

  forge_action_invoker: ( user, obj, cb ) =>
    answ = 
      code: 200

    db.getActionInvoker obj.id, ( err, mod ) =>
      if mod
        answ.code = 409
        answ.message = 'Action Invoker module name already existing: ' + obj.id

      else
        src = obj.data
        cm = dynmod.compileString src, obj.id, {}, obj.lang
        answ = cm.answ
        if answ.code is 200
          actions = []
          actions.push name for name, id of cm.module
          @log.info "CM | Storing new eventpoller with actions #{ actions }"
          answ.message = 
            "Action Invoker module successfully stored! Found following action(s): #{ actions }"
          db.storeActionInvoker obj.id, user.username,
            code: obj.data
            lang: obj.lang
            params: obj.params
            actions: actions
          if obj.public is 'true'
            db.publishActionInvoker obj.id
      cb answ

  get_rules: ( user, obj, cb ) ->
    console.log 'CM | Implement get_rules'

  forge_rule: ( user, obj, cb ) =>
    obj.event = JSON.parse obj.event
    db.getRule obj.id, ( err, objRule ) =>
      if objRule isnt null
        answ =
          code: 409
          message: 'Rule name already existing!'
      else
        answ =
          code: 200
          message: 'Rule stored and activated!'
        rule =
          id: obj.id
          # users: [ user.username ] # This should be fetched from the db in each listener
          event: "#{ obj.event.module } -> #{ obj.event.function }"
          conditions: JSON.parse obj.conditions
          actions: JSON.parse obj.actions
        modules = JSON.parse obj.action_params
        db.storeRule rule.id, JSON.stringify rule
        db.linkRule rule.id, user.username
        db.activateRule rule.id, user.username
        db.storeEventUserParams obj.event.module, user.username, obj.event_params
        db.storeActionUserParams id, user.username, JSON.stringify params for id, params of modules
        @ee.emit 'newRule', JSON.stringify rule
      cb answ
