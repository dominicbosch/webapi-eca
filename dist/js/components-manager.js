
/*

Components Manager
==================
> The components manager takes care of the dynamic JS modules and the rules.
> Event Trigger and Action Dispatcher modules are loaded as strings and stored in the database,
> then compiled into node modules and rules and used in the engine and event Trigger.
 */
var commandFunctions, db, dynmod, encryption, eventEmitter, events, exports, express, forgeModule, fs, getModuleComment, getModuleParams, getModuleUserArguments, getModuleUserParams, getModules, hasRequiredParams, log, path, rh, storeModule, storeRule;

log = require('./logging');

db = require('./persistence');

dynmod = require('./dynamic-modules');

encryption = require('./encryption');

rh = require('./request-handler');

fs = require('fs');

path = require('path');

events = require('events');

express = require('express');

eventEmitter = new events.EventEmitter();

exports = module.exports;


/*
Add an event handler (eh) that listens for rules.

@public addRuleListener ( *eh* )
@param {function} eh
 */

exports.addRuleListener = (function(_this) {
  return function(eh) {
    eventEmitter.addListener('rule', eh);
    return db.getAllActivatedRuleIdsPerUser(function(err, objUsers) {
      var fGoThroughUsers, results, rules, user;
      fGoThroughUsers = function(user, rules) {
        var fFetchRule, i, len, results, rule;
        fFetchRule = function(rule) {
          return db.getRule(user, rule, function(err, strRule) {
            var eventInfo, oRule;
            try {
              oRule = JSON.parse(strRule);
              db.resetLog(user, oRule.id);
              eventInfo = '';
              if (oRule.eventstart) {
                eventInfo = "Starting at " + (new Date(oRule.eventstart)) + ", Interval set to " + oRule.eventinterval + " minutes";
                db.appendLog(user, oRule.id, "INIT", "Rule '" + oRule.id + "' initialized. " + eventInfo);
                return eventEmitter.emit('rule', {
                  intevent: 'init',
                  user: user,
                  rule: oRule
                });
              }
            } catch (_error) {
              err = _error;
              return log.warn("CM | There's an invalid rule in the system: " + strRule);
            }
          });
        };
        results = [];
        for (i = 0, len = rules.length; i < len; i++) {
          rule = rules[i];
          results.push(fFetchRule(rule));
        }
        return results;
      };
      results = [];
      for (user in objUsers) {
        rules = objUsers[user];
        results.push(fGoThroughUsers(user, rules));
      }
      return results;
    });
  };
})(this);


/*
Processes a user request coming through the request-handler.

	- `user` is the user object as it comes from the DB.
	- `oReq` is the request object that contains:
	- `command` as a string 
	- `body` an optional stringified JSON object 
The callback function `callback( obj )` will receive an object
containing the HTTP response code and a corresponding message.

@public processRequest ( *user, oReq, callback* )
 */

exports.processRequest = function(user, oReq, callback) {
  var dat, err;
  if (!oReq.body) {
    oReq.body = '{}';
  }
  try {
    dat = JSON.parse(oReq.body);
  } catch (_error) {
    err = _error;
    return callback({
      code: 404,
      message: 'You had a strange body in your request!'
    });
  }
  return commandFunctions[oReq.command](user, dat, callback);
};

exports.handleUserCommand = (function(_this) {
  return function(req, resp) {
    var body;
    if (req.session && req.session.user) {
      body = '';
      req.on('data', function(data) {
        return body += data;
      });
      return req.on('end', function() {
        var obj;
        obj = qs.parse(body);
        return _this.userRequestHandler(req.session.user, obj, function(obj) {
          return resp.send(obj.code, obj);
        });
      });
    } else {
      return resp.send(401, 'Login first!');
    }
  };
})(this);


/*
Checks whether all required parameters are present in the body.

@private hasRequiredParams ( *arrParams, oBody* )
@param {Array} arrParams
@param {Object} oBody
 */

hasRequiredParams = function(arrParams, oBody) {
  var answ, i, len, param;
  answ = {
    code: 400,
    message: "Your request didn't contain all necessary fields! Requires: " + (arrParams.join())
  };
  for (i = 0, len = arrParams.length; i < len; i++) {
    param = arrParams[i];
    if (!oBody[param]) {
      return answ;
    }
  }
  answ.code = 200;
  answ.message = 'All required properties found';
  return answ;
};


/*
Fetches all available modules and return them together with the available functions.

@private getModules ( *user, oBody, dbMod, callback* )
@param {Object} user
@param {Object} oBody
@param {Object} dbMod
@param {function} callback
 */

getModules = function(user, oBody, dbMod, callback) {
  var fProcessIds;
  fProcessIds = function(userName) {
    return function(err, arrNames) {
      var answReq, fGetFunctions, i, id, len, oRes, results, sem;
      oRes = {};
      answReq = function() {
        return callback({
          code: 200,
          message: JSON.stringify(oRes)
        });
      };
      sem = arrNames.length;
      if (sem === 0) {
        return answReq();
      } else {
        fGetFunctions = (function(_this) {
          return function(id) {
            return dbMod.getModule(userName, id, function(err, oModule) {
              if (oModule) {
                oRes[id] = JSON.parse(oModule.functions);
              }
              if (--sem === 0) {
                return answReq();
              }
            });
          };
        })(this);
        results = [];
        for (i = 0, len = arrNames.length; i < len; i++) {
          id = arrNames[i];
          results.push(fGetFunctions(id));
        }
        return results;
      }
    };
  };
  return dbMod.getAvailableModuleIds(user.username, fProcessIds(user.username));
};

getModuleParams = function(user, oBody, dbMod, callback) {
  var answ;
  answ = hasRequiredParams(['id'], oBody);
  if (answ.code !== 200) {
    return callback(answ);
  } else {
    return dbMod.getModuleField(user.username, oBody.id, 'params', function(err, oBody) {
      answ.message = oBody;
      return callback(answ);
    });
  }
};

getModuleComment = function(user, oBody, dbMod, callback) {
  var answ;
  answ = hasRequiredParams(['id'], oBody);
  if (answ.code !== 200) {
    return callback(answ);
  } else {
    return dbMod.getModuleField(user.username, oBody.id, 'comment', function(err, oBody) {
      answ.message = oBody;
      return callback(answ);
    });
  }
};

getModuleUserParams = function(user, oBody, dbMod, callback) {
  var answ;
  answ = hasRequiredParams(['id'], oBody);
  if (answ.code !== 200) {
    return callback(answ);
  } else {
    return dbMod.getUserParams(oBody.id, user.username, function(err, str) {
      var name, oParam, oParams;
      oParams = JSON.parse(str);
      for (name in oParams) {
        oParam = oParams[name];
        if (!oParam.shielded) {
          oParam.value = encryption.decrypt(oParam.value);
        }
      }
      answ.message = JSON.stringify(oParams);
      return callback(answ);
    });
  }
};

getModuleUserArguments = function(user, oBody, dbMod, callback) {
  var answ;
  answ = hasRequiredParams(['ruleId', 'moduleId'], oBody);
  if (answ.code !== 200) {
    return callback(answ);
  } else {
    return dbMod.getAllModuleUserArguments(user.username, oBody.ruleId, oBody.moduleId, function(err, oBody) {
      answ.message = oBody;
      return callback(answ);
    });
  }
};

forgeModule = (function(_this) {
  return function(user, oBody, modType, dbMod, callback) {
    var answ;
    answ = hasRequiredParams(['id', 'params', 'lang', 'data'], oBody);
    if (answ.code !== 200) {
      return callback(answ);
    } else {
      if (oBody.overwrite) {
        return storeModule(user, oBody, modType, dbMod, callback);
      } else {
        return dbMod.getModule(user.username, oBody.id, function(err, mod) {
          if (mod) {
            answ.code = 409;
            answ.message = 'Module name already existing: ' + oBody.id;
            return callback(answ);
          } else {
            return storeModule(user, oBody, modType, dbMod, callback);
          }
        });
      }
    }
  };
})(this);

storeModule = (function(_this) {
  return function(user, oBody, modType, dbMod, callback) {
    var src;
    src = oBody.data;
    return dynmod.compileString(src, user.username, {
      id: 'dummyRule'
    }, oBody.id, oBody.lang, modType, null, function(cm) {
      var answ, funcs, id, name, ref;
      answ = cm.answ;
      if (answ.code === 200) {
        funcs = [];
        ref = cm.module;
        for (name in ref) {
          id = ref[name];
          funcs.push(name);
        }
        log.info("CM | Storing new module with functions " + (funcs.join(', ')));
        answ.message = " Module " + oBody.id + " successfully stored! Found following function(s): " + funcs;
        oBody.functions = JSON.stringify(funcs);
        oBody.functionArgs = JSON.stringify(cm.funcParams);
        oBody.comment = cm.comment;
        dbMod.storeModule(user.username, oBody);
      }
      return callback(answ);
    });
  };
})(this);

storeRule = (function(_this) {
  return function(user, oBody, callback) {
    return db.getRule(oBody.id, user.username, function(oldRule) {
      var args, arr, epModId, eventInfo, id, oFuncArgs, oParams, params, rule, strRule;
      epModId = oldRule.eventname.split(' -> ')[0];
      db.deleteUserArguments(user.username, oBody.id, epModId);
      rule = {
        id: oBody.id,
        eventtype: oBody.eventtype,
        eventname: oBody.eventname,
        eventstart: oBody.eventstart,
        eventinterval: oBody.eventinterval,
        conditions: oBody.conditions,
        actions: oBody.actions
      };
      if (oBody.eventstart) {
        rule.timestamp = (new Date()).toISOString();
      }
      strRule = JSON.stringify(rule);
      db.storeRule(user.username, rule.id, strRule);
      if (oBody.eventparams) {
        epModId = rule.eventname.split(' -> ')[0];
        db.eventTriggers.storeUserParams(epModId, user.username, JSON.stringify(oBody.eventparams));
      } else {
        db.eventTriggers.deleteUserParams(epModId, user.username);
      }
      oFuncArgs = oBody.eventfunctions;
      db.eventTriggers.deleteUserArguments(user.username, rule.id, arr[0]);
      for (id in oFuncArgs) {
        args = oFuncArgs[id];
        arr = id.split(' -> ');
        db.eventTriggers.storeUserArguments(user.username, rule.id, arr[0], arr[1], JSON.stringify(args));
      }
      oParams = oBody.actionparams;
      for (id in oParams) {
        params = oParams[id];
        db.actionDispatchers.storeUserParams(id, user.username, JSON.stringify(params));
      }
      oFuncArgs = oBody.actionfunctions;
      for (id in oFuncArgs) {
        args = oFuncArgs[id];
        arr = id.split(' -> ');
        db.actionDispatchers.storeUserArguments(user.username, rule.id, arr[0], arr[1], JSON.stringify(args));
      }
      eventInfo = '';
      if (rule.eventstart) {
        eventInfo = "Starting at " + (new Date(rule.eventstart)) + ", Interval set to " + rule.eventinterval + " minutes";
      }
      db.resetLog(user.username, rule.id);
      db.appendLog(user.username, rule.id, "INIT", "Rule '" + rule.id + "' initialized. " + eventInfo);
      eventEmitter.emit('rule', {
        intevent: 'new',
        user: user.username,
        rule: rule
      });
      return callback({
        code: 200,
        message: "Rule '" + rule.id + "' stored and activated!"
      });
    });
  };
})(this);

commandFunctions = {
  get_event_triggers: function(user, oBody, callback) {
    return getModules(user, oBody, db.eventTriggers, callback);
  },
  get_full_event_trigger: function(user, oBody, callback) {
    return db.eventTriggers.getModule(user.username, oBody.id, function(err, obj) {
      return callback({
        code: 200,
        message: JSON.stringify(obj)
      });
    });
  },
  get_event_trigger_params: function(user, oBody, callback) {
    return getModuleParams(user, oBody, db.eventTriggers, callback);
  },
  get_event_trigger_comment: function(user, oBody, callback) {
    return getModuleComment(user, oBody, db.eventTriggers, callback);
  },
  get_event_trigger_user_params: function(user, oBody, callback) {
    return getModuleUserParams(user, oBody, db.eventTriggers, callback);
  },
  get_event_trigger_user_arguments: function(user, oBody, callback) {
    return getModuleUserArguments(user, oBody, db.eventTriggers, callback);
  },
  get_event_trigger_function_arguments: function(user, oBody, callback) {
    var answ;
    answ = hasRequiredParams(['id'], oBody);
    if (answ.code !== 200) {
      return callback(answ);
    } else {
      return db.eventTriggers.getModuleField(user.username, oBody.id, 'functionArgs', function(err, obj) {
        return callback({
          code: 200,
          message: obj
        });
      });
    }
  },
  forge_event_trigger: function(user, oBody, callback) {
    return forgeModule(user, oBody, "eventtrigger", db.eventTriggers, callback);
  },
  delete_event_trigger: function(user, oBody, callback) {
    var answ;
    answ = hasRequiredParams(['id'], oBody);
    if (answ.code !== 200) {
      return callback(answ);
    } else {
      db.eventTriggers.deleteModule(user.username, oBody.id);
      return callback({
        code: 200,
        message: 'OK!'
      });
    }
  },
  get_action_dispatchers: function(user, oBody, callback) {
    return getModules(user, oBody, db.actionDispatchers, callback);
  },
  get_full_action_dispatcher: function(user, oBody, callback) {
    var answ;
    answ = hasRequiredParams(['id'], oBody);
    if (answ.code !== 200) {
      return callback(answ);
    } else {
      return db.actionDispatchers.getModule(user.username, oBody.id, function(err, obj) {
        return callback({
          code: 200,
          message: JSON.stringify(obj)
        });
      });
    }
  },
  get_action_dispatcher_params: function(user, oBody, callback) {
    return getModuleParams(user, oBody, db.actionDispatchers, callback);
  },
  get_action_dispatcher_comment: function(user, oBody, callback) {
    return getModuleComment(user, oBody, db.actionDispatchers, callback);
  },
  get_action_dispatcher_user_params: function(user, oBody, callback) {
    return getModuleUserParams(user, oBody, db.actionDispatchers, callback);
  },
  get_action_dispatcher_user_arguments: function(user, oBody, callback) {
    return getModuleUserArguments(user, oBody, db.actionDispatchers, callback);
  },
  get_action_dispatcher_function_arguments: function(user, oBody, callback) {
    var answ;
    answ = hasRequiredParams(['id'], oBody);
    if (answ.code !== 200) {
      return callback(answ);
    } else {
      return db.actionDispatchers.getModuleField(user.username, oBody.id, 'functionArgs', function(err, obj) {
        return callback({
          code: 200,
          message: obj
        });
      });
    }
  },
  forge_action_dispatcher: function(user, oBody, callback) {
    return forgeModule(user, oBody, "actiondispatcher", db.actionDispatchers, callback);
  },
  delete_action_dispatcher: function(user, oBody, callback) {
    var answ;
    answ = hasRequiredParams(['id'], oBody);
    if (answ.code !== 200) {
      return callback(answ);
    } else {
      db.actionDispatchers.deleteModule(user.username, oBody.id);
      return callback({
        code: 200,
        message: 'OK!'
      });
    }
  },
  get_rules: function(user, oBody, callback) {
    return db.getRuleIds(user.username, function(err, obj) {
      return callback({
        code: 200,
        message: obj
      });
    });
  },
  get_rule: function(user, oBody, callback) {
    var answ;
    answ = hasRequiredParams(['id'], oBody);
    if (answ.code !== 200) {
      return callback(answ);
    } else {
      return db.getRule(user.username, oBody.id, function(err, obj) {
        return callback({
          code: 200,
          message: obj
        });
      });
    }
  },
  get_rule_log: function(user, oBody, callback) {
    var answ;
    answ = hasRequiredParams(['id'], oBody);
    if (answ.code !== 200) {
      return callback(answ);
    } else {
      return db.getLog(user.username, oBody.id, function(err, obj) {
        return callback({
          code: 200,
          message: obj
        });
      });
    }
  },
  forge_rule: function(user, oBody, callback) {
    var answ;
    answ = hasRequiredParams(['id', 'eventname', 'conditions', 'actions'], oBody);
    if (answ.code !== 200) {
      return callback(answ);
    } else {
      if (oBody.overwrite) {
        return storeRule(user, oBody, callback);
      } else {
        return db.getRule(user.username, oBody.id, (function(_this) {
          return function(err, mod) {
            if (mod) {
              answ.code = 409;
              answ.message = 'Rule name already existing: ' + oBody.id;
              return callback(answ);
            } else {
              return storeRule(user, oBody, callback);
            }
          };
        })(this));
      }
    }
  },
  delete_rule: function(user, oBody, callback) {
    var answ;
    answ = hasRequiredParams(['id'], oBody);
    if (answ.code !== 200) {
      return callback(answ);
    } else {
      db.deleteRule(user.username, oBody.id);
      eventEmitter.emit('rule', {
        intevent: 'del',
        user: user.username,
        rule: null,
        ruleId: oBody.id
      });
      return callback({
        code: 200,
        message: 'OK!'
      });
    }
  },
  get_all_webhooks: function(user, oBody, callback) {
    return db.getAllUserWebhookNames(user.username, function(err, data) {
      if (err) {
        return callback({
          code: 400,
          message: "We didn't like your request!"
        });
      } else {
        data = JSON.stringify(data) || null;
        return callback({
          code: 200,
          message: data
        });
      }
    });
  },
  delete_webhook: function(user, oBody, callback) {
    var answ;
    answ = hasRequiredParams(['hookid'], oBody);
    if (answ.code !== 200) {
      return callback(answ);
    } else {
      rh.deactivateWebhook(oBody.hookid);
      db.deleteWebhook(user.username, oBody.hookid);
      return callback({
        code: 200,
        message: 'OK!'
      });
    }
  }
};
