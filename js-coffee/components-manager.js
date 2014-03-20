// Generated by CoffeeScript 1.6.3
/*

Components Manager
==================
> The components manager takes care of the dynamic JS modules and the rules.
> Event Poller and Action Invoker modules are loaded as strings and stored in the database,
> then compiled into node modules and rules and used in the engine and event poller.
*/


(function() {
  var commandFunctions, db, dynmod, events, exports, fs, path, vm,
    _this = this;

  db = require('./persistence');

  dynmod = require('./dynamic-modules');

  fs = require('fs');

  vm = require('vm');

  path = require('path');

  events = require('events');

  /*
  Module call
  -----------
  Initializes the HTTP listener and its request handler.
  
  @param {Object} args
  */


  exports = module.exports = function(args) {
    _this.log = args.logger;
    _this.ee = new events.EventEmitter();
    db(args);
    dynmod(args);
    return module.exports;
  };

  exports.addListener = function(evt, eh) {
    _this.ee.addListener(evt, eh);
    return db.getRules(function(err, obj) {
      var id, rule, _results;
      _results = [];
      for (id in obj) {
        rule = obj[id];
        _results.push(_this.ee.emit('init', rule));
      }
      return _results;
    });
  };

  exports.processRequest = function(user, obj, cb) {
    var answ;
    if (commandFunctions[obj.command]) {
      return answ = commandFunctions[obj.command](user, obj, cb);
    } else {
      return cb({
        code: 404,
        message: 'Strange request!'
      });
    }
  };

  commandFunctions = {
    forge_event_poller: function(user, obj, cb) {
      var answ;
      answ = {
        code: 200
      };
      return db.getEventPoller(obj.id, function(err, mod) {
        var cm, id, name, src, _ref;
        if (mod) {
          answ.code = 409;
          answ.message = 'Event Poller module name already existing: ' + obj.id;
        } else {
          src = obj.data;
          cm = dynmod.compileString(src, obj.id, {}, obj.lang);
          answ = cm.answ;
          if (answ.code === 200) {
            events = [];
            _ref = cm.module;
            for (name in _ref) {
              id = _ref[name];
              events.push(name);
            }
            _this.log.info("CM | Storing new eventpoller with events " + events);
            answ.message = "Event Poller module successfully stored! Found following event(s): " + events;
            db.storeEventPoller(obj.id, user.username, {
              code: obj.data,
              lang: obj.lang,
              params: obj.params,
              events: events
            });
            if (obj["public"] === 'true') {
              db.publishEventPoller(obj.id);
            }
          }
        }
        return cb(answ);
      });
    },
    get_event_pollers: function(user, obj, cb) {
      return db.getAvailableEventPollerIds(user.username, function(err, obj) {
        var fGetEvents, id, oRes, sem, _i, _len, _results;
        oRes = {};
        sem = obj.length;
        fGetEvents = function(id) {
          return db.getEventPoller(id, function(err, obj) {
            oRes[id] = obj.events;
            if (--sem === 0) {
              return cb({
                code: 200,
                message: oRes
              });
            }
          });
        };
        _results = [];
        for (_i = 0, _len = obj.length; _i < _len; _i++) {
          id = obj[_i];
          _results.push(fGetEvents(id));
        }
        return _results;
      });
    },
    get_event_poller_params: function(user, obj, cb) {
      return db.getEventPollerRequiredParams(obj.id, function(err, obj) {
        return cb({
          code: 200,
          message: obj
        });
      });
    },
    get_action_invokers: function(user, obj, cb) {
      return db.getAvailableActionInvokerIds(user.username, function(err, obj) {
        var fGetActions, id, oRes, sem, _i, _len, _results;
        oRes = {};
        sem = obj.length;
        fGetActions = function(id) {
          return db.getActionInvoker(id, function(err, obj) {
            oRes[id] = obj.actions;
            if (--sem === 0) {
              return cb({
                code: 200,
                message: oRes
              });
            }
          });
        };
        _results = [];
        for (_i = 0, _len = obj.length; _i < _len; _i++) {
          id = obj[_i];
          _results.push(fGetActions(id));
        }
        return _results;
      });
    },
    get_action_invoker_params: function(user, obj, cb) {
      return db.getActionInvokerRequiredParams(obj.id, function(err, obj) {
        return cb({
          code: 200,
          message: obj
        });
      });
    },
    forge_action_invoker: function(user, obj, cb) {
      var answ;
      answ = {
        code: 200
      };
      return db.getActionInvoker(obj.id, function(err, mod) {
        var actions, cm, id, name, src, _ref;
        if (mod) {
          answ.code = 409;
          answ.message = 'Action Invoker module name already existing: ' + obj.id;
        } else {
          src = obj.data;
          cm = dynmod.compileString(src, obj.id, {}, obj.lang);
          answ = cm.answ;
          if (answ.code === 200) {
            actions = [];
            _ref = cm.module;
            for (name in _ref) {
              id = _ref[name];
              actions.push(name);
            }
            _this.log.info("CM | Storing new eventpoller with actions " + actions);
            answ.message = "Action Invoker module successfully stored! Found following action(s): " + actions;
            db.storeActionInvoker(obj.id, user.username, {
              code: obj.data,
              lang: obj.lang,
              params: obj.params,
              actions: actions
            });
            if (obj["public"] === 'true') {
              db.publishActionInvoker(obj.id);
            }
          }
        }
        return cb(answ);
      });
    },
    get_rules: function(user, obj, cb) {
      return console.log('CM | Implement get_rules');
    },
    forge_rule: function(user, obj, cb) {
      obj.event = JSON.parse(obj.event);
      return db.getRule(obj.id, function(err, objRule) {
        var answ, id, modules, params, rule;
        if (objRule !== null) {
          answ = {
            code: 409,
            message: 'Rule name already existing!'
          };
        } else {
          answ = {
            code: 200,
            message: 'Rule stored and activated!'
          };
          rule = {
            id: obj.id,
            event: "" + obj.event.module + " -> " + obj.event["function"],
            conditions: JSON.parse(obj.conditions),
            actions: JSON.parse(obj.actions)
          };
          modules = JSON.parse(obj.action_params);
          db.storeRule(rule.id, JSON.stringify(rule));
          db.linkRule(rule.id, user.username);
          db.activateRule(rule.id, user.username);
          db.storeEventUserParams(obj.event.module, user.username, obj.event_params);
          for (id in modules) {
            params = modules[id];
            db.storeActionUserParams(id, user.username, JSON.stringify(params));
          }
          _this.ee.emit('newRule', JSON.stringify(rule));
        }
        return cb(answ);
      });
    }
  };

}).call(this);
