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
  #TODO as soon as an event handler is added it needs to receive the
  #full list of existing and activated rules


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
    console.log obj
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
          event: "#{ obj.event.module } -> #{ obj.event.function }"
          conditions: JSON.parse obj.conditions
          actions: JSON.parse obj.actions
        console.log rule
        modules = JSON.parse obj.event.action_params
        console.log 'store rule'
        db.storeRule rule.id, JSON.stringify rule
        console.log 'link rule'
        db.linkRule rule.id, user.username
        console.log 'activate rule'
        db.activateRule rule.id, user.username
        console.log 'store event params'
        db.storeEventUserParams obj.event.module, user.username, obj.event_params
        console.log 'store action params'
        db.storeActionUserParams id, user.username, params for id, params of modules
        #TODO implement ID approach, check for existing

        @ee.emit 'newRule', rule
      cb answ

# exports.loadModule = function(directory, name, callback) {
#   try {
#     fs.readFile(path.resolve(__dirname, '..', directory, name, name + '.js'), 'utf8', function (err, data) {
#       if (err) {
#         log.error('LM', 'Loading module file!');
#         return;
#       }
#       var mod = exports.requireFromString(data, name, directory);
#       if(mod && fs.existsSync(path.resolve(__dirname, '..', directory, name, 'credentials.json'))) {
#         fs.readFile(path.resolve(__dirname, '..', directory, name, 'credentials.json'), 'utf8', function (err, auth) {
#           if (err) {
#             log.error('LM', 'Loading credentials file for "' + name + '"!');
#             callback(name, data, mod, null);
#             return;
#           }
#           if(mod.loadCredentials) mod.loadCredentials(JSON.parse(auth));
#           callback(name, data, mod, auth);
#         });
#       } else {
#         // Hand back the name, the string contents and the compiled module
#         callback(name, data, mod, null);
#       }
#     });
#   } catch(err) {
#     log.error('LM', 'Failed loading module "' + name + '"');
#   }
# };

# exports.loadModules = function(directory, callback) {
#   fs.readdir(path.resolve(__dirname, '..', directory), function (err, list) {
#     if (err) {
#       log.error('LM', 'loading modules directory: ' + err);
#       return;
#     }
#     log.info('LM', 'Loading ' + list.length + ' modules from "' + directory + '"');
#     list.forEach(function (file) {
#       fs.stat(path.resolve(__dirname, '..', directory, file), function (err, stat) {
#         if (stat && stat.isDirectory()) {
#           exports.loadModule(directory, file, callback);
#         }
#       });
#     });
#   });
# };
 

# exports.storeEventModule = function (objUser, obj, answHandler) {
#   try {
#     // TODO in the future we might want to link the modules close to the user
#     // and allow for e.g. private modules
#     // we need a child process to run this code and kill it after invocation
#     var m = exports.requireFromString(obj.data, obj.id);
#     obj.methods = Object.keys(m);
#     answHandler.answerSuccess('Thank you for the event module!');
#     db.storeEventModule(obj.id, obj);
#   } catch (err) {
#     answHandler.answerError(err.message);
#     console.error(err);
#   }
# };

# exports.getAllEventModules = function ( objUser, obj, answHandler ) {
#   db.getEventModules(function(err, obj) {
#     if(err) answHandler.answerError('Failed fetching event modules: ' + err.message);
#     else answHandler.answerSuccess(obj);
#   });
# };

# exports.storeActionModule = function (objUser, obj, answHandler) {
#   var m = exports.requireFromString(obj.data, obj.id);
#   obj.methods = Object.keys(m);
#   answHandler.answerSuccess('Thank you for the action module!');
#   db.storeActionModule(obj.id, obj);
# };

# exports.getAllActionModules = function ( objUser, obj, answHandler ) {
#   db.getActionModules(function(err, obj) {
#     if(err) answHandler.answerError('Failed fetching action modules: ' + err.message);
#     else answHandler.answerSuccess(obj);
#   });
# };

# exports.storeRule = function (objUser, obj, answHandler) {
#   //TODO fix, twice same logic
#   var cbEventModule = function (lstParams) {
#     return function(err, data) {
#       if(err) {
#         err.addInfo = 'fetching event module';
#         log.error('MM', err);
#       }
#       if(!err && data) {
#         if(data.params) {
#           lstParams.eventmodules[data.id] = data.params;
#         }
#       }
#       if(--semaphore === 0) answHandler.answerSuccess(lstParams);
#     };
#   };
#   var cbActionModule = function (lstParams) {
#     return function(err, data) {
#       if(err) {
#         err.addInfo = 'fetching action module';
#         log.error('MM', err);
#       }
#       if(!err && data) {
#         if(data.params) {
#           lstParams.actionmodules[data.id] = data.params;
#         }
#       }
#       if(--semaphore === 0) answHandler.answerSuccess(lstParams);
#     };
#   };
  
#   var semaphore = 1;
#   var lst = {
#     eventmodules: {},
#     actionmodules: {}
#   };
#   try {
#     var objRule = JSON.parse(obj.data);
#     for(var i = 0; i < objRule.actions.length; i++) {
#       semaphore++;
#       db.getActionModule(objRule.actions[i].module.split('->')[0], cbActionModule(lst));
#     }
#     db.getEventModule(objRule.event.split('->')[0], cbEventModule(lst));
#     db.storeRule(objRule.id, objUser.username, obj.data);
#     ee.emit('newRule', objRule);
#     // for( var i = 0; i < eventHandlers.length; i++ ) {
#     //   eventHandlers[i]( objRule );
#     // }
#   } catch(err) {
#     answHandler.answerError(err.message);
#     log.error('MM', err);
#   }

# };
