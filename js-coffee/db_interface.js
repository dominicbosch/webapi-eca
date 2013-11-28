// Generated by CoffeeScript 1.6.3
/*

DB Interface
============
> Handles the connection to the database and provides functionalities for
> event/action modules, rules and the encrypted storing of authentication tokens.
> General functionality as a wrapper for the module holds initialization,
> encryption/decryption, the retrieval of modules and shut down.
> 
> The general structure for linked data is that the key is stored in a set.
> By fetching all set entries we can then fetch all elements, which is
> automated in this function.
> For example modules of the same group, e.g. action modules are registered in an
> unordered set in the database, from where they can be retrieved again. For example
> a new action module has its ID (e.g 'probinder') first registered in the set
> 'action_modules' and then stored in the db with the key 'action\_module\_' + ID
> (e.g. action\_module\_probinder). 
>
*/


(function() {
  var crypto, decrypt, encrypt, exports, getSetRecords, hash, log, redis, replyHandler,
    _this = this;

  log = require('./logging');

  crypto = require('crypto-js');

  redis = require('redis');

  /*
  Module call
  -----------
  Initializes the DB connection. Requires a valid configuration file which contains
  a db port and a crypto key.
  
  @param {Object} args
  */


  exports = module.exports = function(args) {
    var config;
    args = args != null ? args : {};
    log(args);
    config = require('./config');
    config(args);
    _this.crypto_key = config.getCryptoKey();
    _this.db = redis.createClient(config.getDBPort(), 'localhost', {
      connect_timeout: 2000
    });
    return _this.db.on("error", function(err) {
      err.addInfo = 'message from DB';
      return log.error('DB', err);
    });
  };

  /*
  Checks whether the db is connected and passes either an error on failure after
  ten attempts within five seconds, or nothing on success to the callback(err).
  
  @public isConnected( *cb* )
  @param {function} cb
  */


  exports.isConnected = function(cb) {
    var fCheckConnection, numAttempts;
    if (_this.db.connected) {
      return cb();
    } else {
      numAttempts = 0;
      fCheckConnection = function() {
        var e;
        if (_this.db.connected) {
          log.print('DB', 'Successfully connected to DB!');
          return cb();
        } else if (numAttempts++ < 10) {
          return setTimeout(fCheckConnection, 500);
        } else {
          e = new Error('Connection to DB failed!');
          log.error('DB', e);
          return cb(e);
        }
      };
      return setTimeout(fCheckConnection, 500);
    }
  };

  /*
  Hashes a string based on SHA-3-512.
  
  @private hash( *plainText* )
  @param {String} plainText
  */


  hash = function(plainText) {
    var err;
    if (plainText == null) {
      return null;
    }
    try {
      return (crypto.SHA3(plainText, {
        outputLength: 512
      })).toString();
    } catch (_error) {
      err = _error;
      err.addInfo = 'during hashing';
      log.error('DB', err);
      return null;
    }
  };

  /*
  Encrypts a string using the crypto key from the config file, based on aes-256-cbc.
  
  @private encrypt( *plainText* )
  @param {String} plainText
  */


  encrypt = function(plainText) {
    var enciph, err, et;
    if (plainText == null) {
      return null;
    }
    try {
      enciph = crypto.createCipher('aes-256-cbc', _this.crypto_key);
      et = enciph.update(plainText, 'utf8', 'base64');
      return et + enciph.final('base64');
    } catch (_error) {
      err = _error;
      err.addInfo = 'during encryption';
      log.error('DB', err);
      return null;
    }
  };

  /*
  Decrypts an encrypted string and hands it back on success or null.
  
  @private decrypt( *crypticText* )
  @param {String} crypticText
  */


  decrypt = function(crypticText) {
    var deciph, dt, err;
    if (crypticText == null) {
      return null;
    }
    try {
      deciph = crypto.createDecipher('aes-256-cbc', _this.crypto_key);
      dt = deciph.update(crypticText, 'base64', 'utf8');
      return dt + deciph.final('utf8');
    } catch (_error) {
      err = _error;
      err.addInfo = 'during decryption';
      log.error('DB', err);
      return null;
    }
  };

  /*
  Abstracts logging for simple action replies from the DB.
  
  @private replyHandler( *action* )
  @param {String} action
  */


  replyHandler = function(action) {
    return function(err, reply) {
      if (err) {
        err.addInfo = 'during "' + action + '"';
        return log.error('DB', err);
      } else {
        return log.print('DB', action + ': ' + reply);
      }
    };
  };

  /*
  Fetches all linked data set keys from a linking set, fetches the single data objects
  via the provided function and returns the results to the callback(err, obj) function.
  
  @private getSetRecords( *set, fSingle, cb* )
  @param {String} set the set name how it is stored in the DB
  @param {function} fSingle a function to retrieve a single data element per set entry
  @param {function} cb the callback(err, obj) function that receives all the retrieved data or an error
  */


  getSetRecords = function(set, fSingle, cb) {
    log.print('DB', 'Fetching set records: ' + set);
    return _this.db.smembers(set, function(err, arrReply) {
      var fCallback, objReplies, reply, semaphore, _i, _len, _results;
      if (err) {
        err.addInfo = 'fetching ' + set;
        return log.error('DB', err);
      } else if (arrReply.length === 0) {
        return cb();
      } else {
        semaphore = arrReply.length;
        objReplies = {};
        setTimeout(function() {
          if (semaphore > 0) {
            return cb(new Error('Timeout fetching ' + set));
          }
        }, 2000);
        fCallback = function(prop) {
          return function(err, data) {
            --semaphore;
            if (err) {
              err.addInfo = 'fetching single element: ' + prop;
              return log.error('DB', err);
            } else if (!data) {
              return log.error('DB', new Error('Empty key in DB: ' + prop));
            } else {
              objReplies[prop] = data;
              if (semaphore === 0) {
                return cb(null, objReplies);
              }
            }
          };
        };
        _results = [];
        for (_i = 0, _len = arrReply.length; _i < _len; _i++) {
          reply = arrReply[_i];
          _results.push(fSingle(reply, fCallback(reply)));
        }
        return _results;
      }
    });
  };

  /*
  ## Action Modules
  */


  /*
  Store a string representation of an action module in the DB.
  
  @public storeActionModule ( *id, data* )
  @param {String} id
  @param {String} data
  */


  exports.storeActionModule = function(id, data) {
    log.print('DB', 'storeActionModule: ' + id);
    _this.db.sadd('action-modules', id, replyHandler('storing action module key ' + id));
    return _this.db.set('action-module:' + id, data, replyHandler('storing action module ' + id));
  };

  /*
  Query the DB for an action module and pass it to the callback(err, obj) function.
  
  @public getActionModule( *id, cb* )
  @param {String} id
  @param {function} cb
  */


  exports.getActionModule = function(id, cb) {
    log.print('DB', 'getActionModule: ' + id);
    return _this.db.get('action-module:' + id, cb);
  };

  /*
  Fetch all action modules and hand them to the callback(err, obj) function.
  
  @public getActionModules( *cb* )
  @param {function} cb
  */


  exports.getActionModules = function(cb) {
    return getSetRecords('action-modules', exports.getActionModule, cb);
  };

  /*
  Store a string representation of the authentication parameters for an action module.
  
  @public storeActionAuth( *userId, moduleId, data* )
  @param {String} userId
  @param {String} moduleId
  @param {String} data
  */


  exports.storeActionAuth = function(userId, moduleId, data) {
    log.print('DB', 'storeActionAuth: ' + userId + ':' + moduleId);
    return _this.db.set('action-auth:' + userId + ':' + moduleId, hash(data), replyHandler('storing action auth ' + userId + ':' + moduleId));
  };

  /*
  Query the DB for an action module authentication token associated to a user
  and pass it to the callback(err, obj) function.
  
  @public getActionAuth( *userId, moduleId, cb* )
  @param {String} userId
  @param {String} moduleId
  @param {function} cb
  */


  exports.getActionAuth = function(userId, moduleId, cb) {
    log.print('DB', 'getActionAuth: ' + userId + ':' + moduleId);
    return _this.db.get('action-auth:' + userId + ':' + moduleId, function(err, data) {
      return cb(err, decrypt(data));
    });
  };

  /*
  ## Event Modules
  */


  /*
  Store a string representation of an event module in the DB.
  
  @public storeEventModule( *id, data* )
  @param {String} id
  @param {String} data
  */


  exports.storeEventModule = function(id, data) {
    log.print('DB', 'storeEventModule: ' + id);
    _this.db.sadd('event-modules', id, replyHandler('storing event module key ' + id));
    return _this.db.set('event-module:' + id, data, replyHandler('storing event module ' + id));
  };

  /*
  Query the DB for an event module and pass it to the callback(err, obj) function.
  
  @public getEventModule( *id, cb* )
  @param {String} id 
  @param {function} cb
  */


  exports.getEventModule = function(id, cb) {
    log.print('DB', 'getEventModule: ' + id);
    return _this.db.get('event_module:' + id, cb);
  };

  /*
  Fetch all event modules and pass them to the callback(err, obj) function.
  
  @public getEventModules( *cb* )
  @param {function} cb
  */


  exports.getEventModules = function(cb) {
    return getSetRecords('event_modules', exports.getEventModule, cb);
  };

  /*
  Store a string representation of he authentication parameters for an event module.
  
  @public storeEventAuth( *userId, moduleId, data* )
  @param {String} userId
  @param {String} moduleId
  @param {Object} data
  */


  exports.storeEventAuth = function(userId, moduleId, data) {
    log.print('DB', 'storeEventAuth: ' + userId + ':' + moduleId);
    return _this.db.set('event-auth:' + userId + ':' + moduleId, hash(data), replyHandler('storing event auth ' + userId + ':' + moduleId));
  };

  /*
  Query the DB for an action module authentication token, associated with a user.
  
  @public getEventAuth( *userId, moduleId, data* )
  @param {String} userId
  @param {String} moduleId
  @param {function} cb
  */


  exports.getEventAuth = function(userId, moduleId, cb) {
    log.print('DB', 'getEventAuth: ' + userId + ':' + moduleId);
    return _this.db.get('event-auth:' + userId + ':' + moduleId, function(err, data) {
      return cb(err, decrypt(data));
    });
  };

  /*
  ## Rules
  */


  /*
  Store a string representation of a rule in the DB.
  
  @public storeRule( *id, data* )
  @param {String} id
  @param {String} data
  */


  exports.storeRule = function(id, data) {
    log.print('DB', 'storeRule: ' + id);
    _this.db.sadd('rules', id, replyHandler('storing rule key ' + id));
    return _this.db.set('rule:' + id, data, replyHandler('storing rule ' + id));
  };

  /*
  Query the DB for a rule and pass it to the callback(err, obj) function.
  
  @public getRule( *id, cb* )
  @param {String} id
  @param {function} cb
  */


  exports.getRule = function(id, cb) {
    log.print('DB', 'getRule: ' + id);
    return _this.db.get('rule:' + id, cb);
  };

  /*
  Fetch all rules from the database and pass them to the callback function.  
  
  @public getRules( *cb* )
  @param {function} cb
  */


  exports.getRules = function(cb) {
    log.print('DB', 'Fetching all Rules');
    return getSetRecords('rules', exports.getRule, cb);
  };

  /*
  Store a user object (needs to be a flat structure).
  
  @public storeUser( *objUser* )
  @param {Object} objUser
  */


  exports.storeUser = function(objUser) {
    log.print('DB', 'storeUser: ' + objUser.username);
    if (objUser && objUser.username && objUser.password) {
      _this.db.sadd('users', objUser.username, replyHandler('storing user key ' + objUser.username));
      objUser.password = hash(objUser.password);
      return _this.db.hmset('user:' + objUser.username, objUser, replyHandler('storing user properties ' + objUser.username));
    } else {
      return log.error('DB', new Error('username or password was missing'));
    }
  };

  /*
  Associate a role with a user.
  
  @public storeUserRole( *username, role* )
  @param {String} username
  @param {String} role
  */


  exports.storeUserRole = function(username, role) {
    log.print('DB', 'storeUserRole: ' + username + ':' + role);
    _this.db.sadd('user-roles:' + username, role, replyHandler('adding role ' + role + ' to user ' + username));
    return _this.db.sadd('role-users:' + role, username, replyHandler('adding user ' + username + ' to role ' + role));
  };

  /*
  Fetch all roles of a user and pass them to the callback(err, obj)
  
  @public getUserRoles( *username* )
  @param {String} username
  */


  exports.getUserRoles = function(username) {
    log.print('DB', 'getUserRole: ' + username);
    return _this.db.get('user-roles:' + username, cb);
  };

  /*
  Fetch all users of a role and pass them to the callback(err, obj)
  
  @public getUserRoles( *role* )
  @param {String} role
  */


  exports.getRoleUsers = function(role) {
    log.print('DB', 'getRoleUsers: ' + role);
    return _this.db.get('role-users:' + role, cb);
  };

  /*
  Checks the credentials and on success returns the user object to the
  callback(err, obj) function. The password has to be hashed (SHA-3-512)
  beforehand by the instance closest to the user that enters the password,
  because we only store hashes of passwords for safety reasons.
  
  @public loginUser( *username, password, cb* )
  @param {String} username
  @param {String} password
  @param {function} cb
  */


  exports.loginUser = function(username, password, cb) {
    var fCheck;
    log.print('DB', 'User "' + username + '" tries to log in');
    fCheck = function(pw) {
      return function(err, obj) {
        if (err) {
          return cb(err);
        } else if (obj && obj.password) {
          if (pw === obj.password) {
            log.print('DB', 'User "' + obj.username + '" logged in!');
            return cb(null, obj);
          } else {
            return cb(new Error('Wrong credentials!'));
          }
        } else {
          return cb(new Error('User not found!'));
        }
      };
    };
    return _this.db.hgetall('user:' + username, fCheck(password));
  };

  /*
  Shuts down the db link.
  
  @public shutDown()
  */


  exports.shutDown = function() {
    return _this.db.quit();
  };

}).call(this);