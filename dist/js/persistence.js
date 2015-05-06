
/*

Persistence
============
> Handles the connection to the database and provides functionalities for event triggers,
> action dispatchers, rules and the (hopefully encrypted) storing of user-specific parameters
> per module.
> General functionality as a wrapper for the module holds initialization,
> the retrieval of modules and shut down.
> 
> The general structure for linked data is that the key is stored in a set.
> By fetching all set entries we can then fetch all elements, which is
> automated in this function.
> For example, modules of the same group, e.g. action dispatchers are registered in an
> unordered set in the database, from where they can be retrieved again. For example
> a new action dispatcher has its ID (e.g 'probinder') first registered in the set
> 'action-dispatchers' and then stored in the db with the key 'action-dispatcher:' + ID
> (e.g. action-dispatcher:probinder). 
>
 */
var IndexedModules, exports, getSetRecords, log, redis, replyHandler,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

log = require('./logging');

redis = require('redis');


/*
Module call
-----------
Initializes the DB connection with the given `db-port` property in the `args` object.

@param {Object} args
 */

exports = module.exports;

exports.init = (function(_this) {
  return function(dbPort) {
    log.info('INIT DB');
    if (!_this.db) {
      exports.eventTriggers = new IndexedModules('event-trigger', log);
      exports.actionDispatchers = new IndexedModules('action-dispatcher', log);
      return exports.initPort(dbPort);
    }
  };
})(this);

exports.initPort = (function(_this) {
  return function(port) {
    var ref;
    _this.connRefused = false;
    if ((ref = _this.db) != null) {
      ref.quit();
    }
    _this.db = redis.createClient(port, 'localhost', {
      connect_timeout: 2000
    });
    _this.db.on('error', function(err) {
      if (err.message.indexOf('ECONNREFUSED') > -1) {
        _this.connRefused = true;
        return log.warn('DB | Wrong port?');
      } else {
        return log.error(err);
      }
    });
    exports.eventTriggers.setDB(_this.db);
    return exports.actionDispatchers.setDB(_this.db);
  };
})(this);

exports.selectDatabase = (function(_this) {
  return function(id) {
    return _this.db.select(id);
  };
})(this);


/*
Checks whether the db is connected and passes either an error on failure after
ten attempts within five seconds, or nothing on success to the callback(err).

@public isConnected( *cb* )
@param {function} cb
 */

exports.isConnected = (function(_this) {
  return function(cb) {
    var fCheckConnection, numAttempts;
    if (!_this.db) {
      return cb(new Error('DB | DB initialization did not occur or failed miserably!'));
    } else {
      if (_this.db.connected) {
        return cb();
      } else {
        numAttempts = 0;
        fCheckConnection = function() {
          var ref;
          if (_this.connRefused) {
            if ((ref = _this.db) != null) {
              ref.quit();
            }
            return cb(new Error('DB | Connection refused! Wrong port?'));
          } else {
            if (_this.db.connected) {
              log.info('DB | Successfully connected to DB!');
              return cb();
            } else if (numAttempts++ < 10) {
              return setTimeout(fCheckConnection, 100);
            } else {
              return cb(new Error('DB | Connection to DB failed!'));
            }
          }
        };
        return setTimeout(fCheckConnection, 100);
      }
    }
  };
})(this);


/*
Abstracts logging for simple action replies from the DB.

@private replyHandler( *action* )
@param {String} action
 */

replyHandler = (function(_this) {
  return function(action) {
    return function(err, reply) {
      if (err) {
        return log.warn(err, "during '" + action + "'");
      } else {
        return log.info("DB | " + action + ": " + reply);
      }
    };
  };
})(this);


/*
Push an event into the event queue.

@public pushEvent( *oEvent* )
@param {Object} oEvent
 */

exports.pushEvent = (function(_this) {
  return function(oEvent) {
    if (oEvent) {
      log.info("DB | Event pushed into the queue: '" + oEvent.eventname + "'");
      return _this.db.rpush('event_queue', JSON.stringify(oEvent));
    } else {
      return log.warn('DB | Why would you give me an empty event...');
    }
  };
})(this);


/*
Pop an event from the event queue and pass it to cb(err, obj).

@public popEvent( *cb* )
@param {function} cb
 */

exports.popEvent = (function(_this) {
  return function(cb) {
    var makeObj;
    makeObj = function(pcb) {
      return function(err, obj) {
        var er, oEvt;
        try {
          oEvt = JSON.parse(obj);
          return pcb(err, oEvt);
        } catch (_error) {
          er = _error;
          return pcb(er);
        }
      };
    };
    return _this.db.lpop('event_queue', makeObj(cb));
  };
})(this);


/*
Purge the event queue.

@public purgeEventQueue()
 */

exports.purgeEventQueue = (function(_this) {
  return function() {
    return _this.db.del('event_queue', replyHandler('purging event queue'));
  };
})(this);


/*
Fetches all linked data set keys from a linking set, fetches the single
data objects via the provided function and returns the results to cb(err, obj).

@private getSetRecords( *set, fSingle, cb* )
@param {String} set the set name how it is stored in the DB
@param {function} fSingle a function to retrieve a single data element
			per set entry
@param {function} cb the callback(err, obj) function that receives all
			the retrieved data or an error
 */

getSetRecords = (function(_this) {
  return function(set, fSingle, cb) {
    log.info("DB | Fetching set records: '" + set + "'");
    return _this.db.smembers(set, function(err, arrReply) {
      var fCallback, i, len, objReplies, reply, results, semaphore;
      if (err) {
        log.warn(err, "DB | fetching '" + set + "'");
        return cb(err);
      } else if (arrReply.length === 0) {
        return cb();
      } else {
        semaphore = arrReply.length;
        objReplies = {};
        setTimeout(function() {
          if (semaphore > 0) {
            return cb(new Error("Timeout fetching '" + set + "'"));
          }
        }, 2000);
        fCallback = function(prop) {
          return function(err, data) {
            --semaphore;
            if (err) {
              log.warn(err, "DB | fetching single element: '" + prop + "'");
            } else if (!data) {
              log.warn(new Error("Empty key in DB: '" + prop + "'"));
            } else {
              objReplies[prop] = data;
            }
            if (semaphore === 0) {
              return cb(null, objReplies);
            }
          };
        };
        results = [];
        for (i = 0, len = arrReply.length; i < len; i++) {
          reply = arrReply[i];
          results.push(fSingle(reply, fCallback(reply)));
        }
        return results;
      }
    });
  };
})(this);

IndexedModules = (function() {
  function IndexedModules(setname, log) {
    this.setname = setname;
    this.deleteUserArguments = bind(this.deleteUserArguments, this);
    this.getUserArguments = bind(this.getUserArguments, this);
    this.getAllModuleUserArguments = bind(this.getAllModuleUserArguments, this);
    this.getUserArgumentsFunctions = bind(this.getUserArgumentsFunctions, this);
    this.storeUserArguments = bind(this.storeUserArguments, this);
    this.deleteUserParams = bind(this.deleteUserParams, this);
    this.getUserParamsIds = bind(this.getUserParamsIds, this);
    this.getUserParams = bind(this.getUserParams, this);
    this.storeUserParams = bind(this.storeUserParams, this);
    this.deleteModule = bind(this.deleteModule, this);
    this.getModuleIds = bind(this.getModuleIds, this);
    this.getAvailableModuleIds = bind(this.getAvailableModuleIds, this);
    this.getModuleField = bind(this.getModuleField, this);
    this.getModule = bind(this.getModule, this);
    this.storeModule = bind(this.storeModule, this);
    log.info("DB | (IdxedMods) Instantiated indexed modules for '" + this.setname + "'");
  }

  IndexedModules.prototype.setDB = function(db) {
    this.db = db;
    return log.info("DB | (IdxedMods) Registered new DB connection for '" + this.setname + "'");
  };


  /*
  	Stores a module and links it to the user.
  	
  	@private storeModule( *userId, oModule* )
  	@param {String} userId
  	@param {object} oModule
   */

  IndexedModules.prototype.storeModule = function(userId, oModule) {
    log.info("DB | (IdxedMods) " + this.setname + ".storeModule( " + userId + ", oModule )");
    this.db.sadd(this.setname + "s", oModule.id, replyHandler("sadd '" + this.setname + "s' -> " + oModule.id));
    return this.db.hmset(this.setname + ":" + oModule.id, oModule, replyHandler("hmset '" + this.setname + ":" + oModule.id + "' -> [oModule]"));
  };

  IndexedModules.prototype.getModule = function(userId, mId, cb) {
    log.info("DB | (IdxedMods) " + this.setname + ".getModule( " + userId + ", " + mId + " )");
    log.info("hgetall " + this.setname + ":" + mId);
    return this.db.hgetall(this.setname + ":" + mId, cb);
  };

  IndexedModules.prototype.getModuleField = function(userId, mId, field, cb) {
    log.info("DB | (IdxedMods) " + this.setname + ".getModuleField( " + userId + ", " + mId + ", " + field + " )");
    return this.db.hget(this.setname + ":" + mId, field, cb);
  };

  IndexedModules.prototype.getAvailableModuleIds = function(userId, cb) {
    log.info("DB | (IdxedMods) " + this.setname + ".getAvailableModuleIds( " + userId + " )");
    return this.db.sunion("public-" + this.setname + "s", this.setname + "s", cb);
  };

  IndexedModules.prototype.getModuleIds = function(userId, cb) {
    log.info("DB | (IdxedMods) " + this.setname + ".getModuleIds()");
    return this.db.smembers(this.setname + "s", cb);
  };

  IndexedModules.prototype.deleteModule = function(userId, mId) {
    log.info("DB | (IdxedMods) " + this.setname + ".deleteModule( " + userId + ", " + mId + " )");
    this.db.srem(this.setname + "s", mId, replyHandler("srem '" + this.setname + "s' -> '" + mId + "'"));
    this.db.del(this.setname + ":" + mId, replyHandler("del '" + this.setname + ":" + mId + "'"));
    this.deleteUserParams(mId, userId);
    return exports.getRuleIds(userId, (function(_this) {
      return function(err, obj) {
        var i, len, results, rule;
        results = [];
        for (i = 0, len = obj.length; i < len; i++) {
          rule = obj[i];
          results.push(_this.getUserArgumentsFunctions(userId, rule, mId, function(err, obj) {
            return _this.deleteUserArguments(userId, rule, mId);
          }));
        }
        return results;
      };
    })(this));
  };


  /*
  	Stores user params for a module. They are expected to be RSA encrypted with helps of
  	the provided cryptico JS library and will only be decrypted right before the module is loaded!
  	
  	@private storeUserParams( *mId, userId, encData* )
  	@param {String} mId
  	@param {String} userId
  	@param {object} encData
   */

  IndexedModules.prototype.storeUserParams = function(mId, userId, encData) {
    log.info("DB | (IdxedMods) " + this.setname + ".storeUserParams( " + mId + ", " + userId + ", encData )");
    this.db.sadd(this.setname + "-params", mId + ":" + userId, replyHandler("sadd '" + this.setname + "-params' -> '" + mId + ":" + userId + "'"));
    return this.db.set(this.setname + "-params:" + mId + ":" + userId, encData, replyHandler("set '" + this.setname + "-params:" + mId + ":" + userId + "' -> [encData]"));
  };

  IndexedModules.prototype.getUserParams = function(mId, userId, cb) {
    log.info("DB | (IdxedMods) " + this.setname + ".getUserParams( " + mId + ", " + userId + " )");
    return this.db.get(this.setname + "-params:" + mId + ":" + userId, cb);
  };

  IndexedModules.prototype.getUserParamsIds = function(cb) {
    log.info("DB | (IdxedMods) " + this.setname + ".getUserParamsIds()");
    return this.db.smembers(this.setname + "-params", cb);
  };

  IndexedModules.prototype.deleteUserParams = function(mId, userId) {
    log.info("DB | (IdxedMods) " + this.setname + ".deleteUserParams( " + mId + ", " + userId + " )");
    this.db.srem(this.setname + "-params", mId + ":" + userId, replyHandler("srem '" + this.setname + "-params' -> '" + mId + ":" + userId + "'"));
    return this.db.del(this.setname + "-params:" + mId + ":" + userId, replyHandler("del '" + this.setname + "-params:" + mId + ":" + userId + "'"));
  };


  /*
  	Stores user arguments for a function within a module. They are expected to be RSA encrypted with helps of
  	the provided cryptico JS library and will only be decrypted right before the module is loaded!
  	
  	@private storeUserArguments( *userId, ruleId, mId, funcId, encData* )
   */

  IndexedModules.prototype.storeUserArguments = function(userId, ruleId, mId, funcId, encData) {
    log.info("DB | (IdxedMods) " + this.setname + ".storeUserArguments( " + userId + ", " + ruleId + ", " + mId + ", " + funcId + ", encData )");
    this.db.sadd(this.setname + ":" + userId + ":" + ruleId + ":" + mId + ":functions", funcId, replyHandler("sadd '" + this.setname + ":" + userId + ":" + ruleId + ":" + mId + ":functions' -> '" + funcId + "'"));
    return this.db.set(this.setname + ":" + userId + ":" + ruleId + ":" + mId + ":function:" + funcId, encData, replyHandler("set '" + this.setname + ":" + userId + ":" + ruleId + ":" + mId + ":function:" + funcId + "' -> [encData]"));
  };

  IndexedModules.prototype.getUserArgumentsFunctions = function(userId, ruleId, mId, cb) {
    log.info("DB | (IdxedMods) " + this.setname + ".getUserArgumentsFunctions( " + userId + ", " + ruleId + ", " + mId + " )");
    return this.db.get(this.setname + ":" + userId + ":" + ruleId + ":" + mId + ":functions", cb);
  };

  IndexedModules.prototype.getAllModuleUserArguments = function(userId, ruleId, mId, cb) {
    log.info("DB | (IdxedMods) " + this.setname + ".getAllModuleUserArguments( " + userId + ", " + ruleId + ", " + mId + " )");
    return this.db.smembers(this.setname + ":" + userId + ":" + ruleId + ":" + mId + ":functions", (function(_this) {
      return function(err, obj) {
        var fRegisterFunction, func, i, len, oAnswer, results, sem;
        sem = obj.length;
        oAnswer = {};
        if (sem === 0) {
          return cb(null, oAnswer);
        } else {
          results = [];
          for (i = 0, len = obj.length; i < len; i++) {
            func = obj[i];
            fRegisterFunction = function(func) {
              return function(err, obj) {
                if (obj) {
                  oAnswer[func] = obj;
                }
                if (--sem === 0) {
                  return cb(null, oAnswer);
                }
              };
            };
            results.push(_this.db.get(_this.setname + ":" + userId + ":" + ruleId + ":" + mId + ":function:" + func, fRegisterFunction(func)));
          }
          return results;
        }
      };
    })(this));
  };

  IndexedModules.prototype.getUserArguments = function(userId, ruleId, mId, funcId, cb) {
    log.info("DB | (IdxedMods) " + this.setname + ".getUserArguments( " + userId + ", " + ruleId + ", " + mId + ", " + funcId + " )");
    return this.db.get(this.setname + ":" + userId + ":" + ruleId + ":" + mId + ":function:" + funcId, cb);
  };

  IndexedModules.prototype.deleteUserArguments = function(userId, ruleId, mId) {
    log.info("DB | (IdxedMods) " + this.setname + ".deleteUserArguments( " + userId + ", " + ruleId + ", " + mId + " )");
    return this.db.smembers(this.setname + ":" + userId + ":" + ruleId + ":" + mId + ":functions", (function(_this) {
      return function(err, obj) {
        var func, i, len, results;
        results = [];
        for (i = 0, len = obj.length; i < len; i++) {
          func = obj[i];
          results.push(_this.db.del(_this.setname + ":" + userId + ":" + ruleId + ":" + mId + ":function:" + func, replyHandler("del '" + _this.setname + ":" + userId + ":" + ruleId + ":" + mId + ":function:" + func + "'")));
        }
        return results;
      };
    })(this));
  };

  return IndexedModules;

})();


/*
## Rules
 */


/*
Appends a log entry.

@public log( *userId, ruleId, moduleId, message* )
 */

exports.appendLog = (function(_this) {
  return function(userId, ruleId, moduleId, message) {
    return _this.db.append(userId + ":" + ruleId + ":log", "[UTC|" + ((new Date()).toISOString()) + "] {" + moduleId + "} " + (message.substring(0, 1000)) + "\n");
  };
})(this);


/*
Retrieves a log entry.

@public getLog( *userId, ruleId, cb* )
 */

exports.getLog = (function(_this) {
  return function(userId, ruleId, cb) {
    return _this.db.get(userId + ":" + ruleId + ":log", cb);
  };
})(this);


/*
Resets a log entry.
 */

exports.resetLog = (function(_this) {
  return function(userId, ruleId) {
    return _this.db.del(userId + ":" + ruleId + ":log", replyHandler("del '" + userId + ":" + ruleId + ":log'"));
  };
})(this);


/*
Query the DB for a rule and pass it to cb(err, obj).
 */

exports.getRule = (function(_this) {
  return function(userId, ruleId, cb) {
    log.info("DB | getRule( '" + userId + "', '" + ruleId + "' )");
    return _this.db.get("user:" + userId + ":rule:" + ruleId, cb);
  };
})(this);


/*
Store a string representation of a rule in the DB.
 */

exports.storeRule = (function(_this) {
  return function(userId, ruleId, data) {
    log.info("DB | storeRule( '" + userId + "', '" + ruleId + "' )");
    _this.db.sadd("user:" + userId + ":rules", "" + ruleId, replyHandler("sadd 'user:" + userId + ":rules' -> '" + ruleId + "'"));
    return _this.db.set("user:" + userId + ":rule:" + ruleId, data, replyHandler("set 'user:" + userId + ":rule:" + ruleId + "' -> [data]"));
  };
})(this);


/*
Returns all existing rule ID's for a user
 */

exports.getRuleIds = (function(_this) {
  return function(userId, cb) {
    log.info("DB | getRuleIds( '" + userId + "' )");
    return _this.db.smembers("user:" + userId + ":rules", cb);
  };
})(this);


/*
Delete a string representation of a rule.
 */

exports.deleteRule = (function(_this) {
  return function(userId, ruleId) {
    log.info("DB | deleteRule( '" + userId + "', '" + ruleId + "' )");
    _this.db.srem("user:" + userId + ":rules", ruleId, replyHandler("srem 'user:" + userId + ":rules' -> '" + ruleId + "'"));
    return _this.db.del("user:" + userId + ":rule:" + ruleId, replyHandler("del 'user:" + userId + ":rule:" + ruleId + "'"));
  };
})(this);


/*
Fetch all active ruleIds and pass them to cb(err, obj).

@public getAllActivatedRuleIds( *cb* )
@param {function} cb
 */

exports.getAllActivatedRuleIdsPerUser = (function(_this) {
  return function(cb) {
    log.info("DB | Fetching all active rules");
    return _this.db.smembers('users', function(err, obj) {
      var fProcessAnswer, i, len, result, results, semaphore, user;
      result = {};
      if (obj.length === 0) {
        return cb(null, result);
      } else {
        semaphore = obj.length;
        results = [];
        for (i = 0, len = obj.length; i < len; i++) {
          user = obj[i];
          fProcessAnswer = function(user) {
            return (function(_this) {
              return function(err, obj) {
                if (obj.length > 0) {
                  result[user] = obj;
                }
                if (--semaphore === 0) {
                  return cb(null, result);
                }
              };
            })(this);
          };
          results.push(_this.db.smembers("user:" + user + ":rules", fProcessAnswer(user)));
        }
        return results;
      }
    });
  };
})(this);


/*
## Users
 */


/*
Store a user object (needs to be a flat structure).
The password should be hashed before it is passed to this function.

@public storeUser( *objUser* )
 */

exports.storeUser = (function(_this) {
  return function(objUser) {
    log.info("DB | storeUser: '" + objUser.username + "'");
    if (objUser && objUser.username && objUser.password) {
      _this.db.sadd('users', objUser.username, replyHandler("sadd 'users' -> '" + objUser.username + "'"));
      return _this.db.hmset("user:" + objUser.username, objUser, replyHandler("hmset 'user:" + objUser.username + "' -> [objUser]"));
    } else {
      return log.warn(new Error('DB | username or password was missing'));
    }
  };
})(this);


/*
Fetch all user IDs and pass them to cb(err, obj).

@public getUserIds( *cb* )
 */

exports.getUserIds = (function(_this) {
  return function(cb) {
    log.info("DB | getUserIds");
    return _this.db.smembers("users", cb);
  };
})(this);


/*
Fetch a user by id and pass it to cb(err, obj).

@public getUser( *userId, cb* )
 */

exports.getUser = (function(_this) {
  return function(userId, cb) {
    log.info("DB | getUser: '" + userId + "'");
    return _this.db.hgetall("user:" + userId, cb);
  };
})(this);


/*
Deletes a user and all his associated linked and active rules.

@public deleteUser( *userId* )
 */

exports.deleteUser = (function(_this) {
  return function(userId) {
    log.info("DB | deleteUser: '" + userId + "'");
    _this.db.srem("users", userId, replyHandler("srem 'users' -> '" + userId + "'"));
    _this.db.del("user:" + userId, replyHandler("del 'user:" + userId + "'"));
    _this.db.smembers("user:" + userId + ":rules", function(err, obj) {
      var delLinkedRuleUser, i, id, len, results;
      delLinkedRuleUser = function(ruleId) {
        return _this.db.srem("rule:" + ruleId + ":users", userId, replyHandler("srem 'rule:" + ruleId + ":users' -> '" + userId + "'"));
      };
      results = [];
      for (i = 0, len = obj.length; i < len; i++) {
        id = obj[i];
        results.push(delLinkedRuleUser(id));
      }
      return results;
    });
    _this.db.del("user:" + userId + ":rules", replyHandler("del 'user:" + userId + ":rules'"));
    _this.db.smembers("user:" + userId + ":active-rules", function(err, obj) {
      var delActivatedRuleUser, i, id, len, results;
      delActivatedRuleUser = function(ruleId) {
        return _this.db.srem("rule:" + ruleId + ":active-users", userId, replyHandler("srem 'rule:" + ruleId + ":active-users' -> '" + userId + "'"));
      };
      results = [];
      for (i = 0, len = obj.length; i < len; i++) {
        id = obj[i];
        results.push(delActivatedRuleUser(id));
      }
      return results;
    });
    return _this.db.del("user:" + userId + ":active-rules", replyHandler("del user:" + userId + ":active-rules"));
  };
})(this);


/*
Checks the credentials and on success returns the user object to the
callback(err, obj) function. The password has to be hashed (SHA-3-512)
beforehand by the instance closest to the user that enters the password,
because we only store hashes of passwords for security reasons.

@public loginUser( *userId, password, cb* )
 */

exports.loginUser = (function(_this) {
  return function(userId, password, cb) {
    var fCheck;
    log.info("DB | User '" + userId + "' tries to log in");
    fCheck = function(pw) {
      return function(err, obj) {
        if (err) {
          return cb(err, null);
        } else if (obj && obj.password) {
          if (pw === obj.password) {
            log.info("DB | User '" + obj.username + "' logged in!");
            return cb(null, obj);
          } else {
            return cb(new Error('Wrong credentials!'), null);
          }
        } else {
          return cb(new Error('User not found!'), null);
        }
      };
    };
    return _this.db.hgetall("user:" + userId, fCheck(password));
  };
})(this);


/*
TODO: user should be able to select whether the events being sent to the webhook are available to all.
private events need only to be checked against the user's rules
 */


/*
Stores a webhook.
 */

exports.createWebhook = (function(_this) {
  return function(username, hookid, hookname, isPublic) {
    _this.db.sadd("webhooks", hookid, replyHandler("sadd 'webhooks' -> '" + hookid + "'"));
    _this.db.sadd("user:" + username + ":webhooks", hookid, replyHandler("sadd 'user:" + username + ":webhooks' -> '" + hookid + "'"));
    return _this.db.hmset("webhook:" + hookid, 'hookname', hookname, 'username', username, 'isPublic', isPublic === true, replyHandler("set webhook:" + hookid + " -> [" + hookname + ", " + username + "]"));
  };
})(this);


/*
Returns a webhook name.
 */

exports.getWebhookName = (function(_this) {
  return function(hookid, cb) {
    return _this.db.hget("webhook:" + hookid, "hookname", cb);
  };
})(this);


/*
Returns all webhook properties.
 */

exports.getFullWebhook = (function(_this) {
  return function(hookid, cb) {
    return _this.db.hgetall("webhook:" + hookid, cb);
  };
})(this);


/*
Returns all the user's webhooks by ID.
 */

exports.getUserWebhookIDs = (function(_this) {
  return function(username, cb) {
    return _this.db.smembers("user:" + username + ":webhooks", cb);
  };
})(this);


/*
Gets all the user's webhooks with names.
 */

exports.getAllUserWebhookNames = (function(_this) {
  return function(username, cb) {
    console.log('username: ' + username);
    _this.db.smembers("user:" + username + ":webhooks", function(dat) {
      return log.info(dat);
    });
    return getSetRecords("user:" + username + ":webhooks", exports.getWebhookName, cb);
  };
})(this);


/*
Returns all webhook IDs. Can be used to check for existing webhooks.
 */

exports.getAllWebhookIDs = (function(_this) {
  return function(cb) {
    return _this.db.smembers("webhooks", cb);
  };
})(this);


/*
Returns all webhooks with names.
 */

exports.getAllWebhooks = (function(_this) {
  return function(cb) {
    return getSetRecords("webhooks", exports.getFullWebhook, cb);
  };
})(this);


/*
Delete a webhook.
 */

exports.deleteWebhook = (function(_this) {
  return function(username, hookid) {
    _this.db.srem("webhooks", hookid, replyHandler("srem 'webhooks' -> '" + hookid + "'"));
    _this.db.srem("user:" + username + ":webhooks", hookid, replyHandler("srem 'user:" + username + ":webhooks' -> '" + hookid + "'"));
    return _this.db.del("webhook:" + hookid, replyHandler("del webhook:" + hookid));
  };
})(this);


/*
Shuts down the db link.

@public shutDown()
 */

exports.shutDown = (function(_this) {
  return function() {
    var ref;
    return (ref = _this.db) != null ? ref.quit() : void 0;
  };
})(this);
