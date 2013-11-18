// # DB Interface
// Handles the connection to the database and provides functionalities for
// event/action modules, rules and the encrypted storing of authentication tokens.

// ## General
// General functionality as a wrapper for the module holds initialization,
// encryption/decryption, the retrieval of modules and shut down.
// Modules of the same group, e.g. action modules are registered in an unordered
// set in the database, from where they can be retrieved again. For example a new
// action module has its ID (e.g 'probinder') first registered in the set
// 'action_modules' and then stored in the db with the key 'action\_module\_' + ID
// (e.g. action\_module\_probinder). 
'use strict';

var redis = require('redis'),
    crypto = require('crypto'),
    log = require('./logging'),
    crypto_key, db;
   

/**
 * Initializes the DB connection. Requires a valid configuration file which contains
 * a db port and a crypto key.
 * 
 */
exports = module.exports = function(args) {
  args = args || {};
  log(args);
  
  var config = require('./config')(args);
  crypto_key = config.getCryptoKey();
  db = redis.createClient(config.getDBPort());
  db.on("error", function (err) {
    err.addInfo = 'message from DB';
    log.error('DB', err);
  });
  return module.exports;
};

/**
 * ### encrypt
 * this is used to decrypt
 * @param {String} plainText
 */
function encrypt(plainText) {
  if(!plainText) return null;
  try {
    var enciph = crypto.createCipher('aes-256-cbc', crypto_key);
    var et = enciph.update(plainText, 'utf8', 'base64') + enciph.final('base64');
    log.print('DB', 'Encrypted credentials into: ' + et);
    return et;
  } catch (err) {
    log.error('DB', 'in encrypting: ' + err);
    return null;
  }
}

/**
 * ### decrypt
 */
function decrypt(crypticText, id) {
  if(!crypticText) return null;
  try {
    var deciph = crypto.createDecipher('aes-256-cbc', crypto_key);
    return deciph.update(crypticText, 'base64', 'utf8') + deciph.final('utf8');
  } catch (err) {
    log.error('DB', 'in decrypting "' + id + '": ' + err);
    return null;
  }
}

/**
 * ### replyHandler
 * Abstraction answer handling for simple information replies from the DB. 
 * @param {String} action the action to be displayed in the output string.
 */
function replyHandler(action) {
  return function(err, reply) {
    if(err) log.error('DB', ' during "' + action + '": ' + err);
    else log.print('DB', action + ': ' + reply);
  };
}

/**
 * ### getSetRecords
 * The general structure for modules is that the key is stored in a set.
 * By fetching all set entries we can then fetch all modules, which is
 * automated in this function.
 * 
 * @param {String} set the set name how it is stored in the DB
 * @param {function} funcSingle the function that fetches single entries from the DB
 * @param {function} cb the function to be called on success or error, receives
 *                    arguments (err, obj)
 */
function getSetRecords(set, funcSingle, cb) {
  if(db) db.smembers(set, function(err, reply) {
    if(err) log.error('DB', 'fetching ' + set + ': ' + err);
    else {
      if(reply.length === 0) {
        cb(null, null);
      } else {
        var semaphore = reply.length, objReplies = {};
        setTimeout(function() {
          if(semaphore > 0) {
            cb('Timeout fetching ' + set, null);
          }
        }, 1000);
        for(var i = 0; i < reply.length; i++){
          funcSingle(reply[i], function(prop) {
            return function(err, reply) {
              if(err) log.error('DB', ' fetching single element: ' + prop);
              else {
                objReplies[prop] = reply;
                if(--semaphore === 0) cb(null, objReplies);
              }
            };
          }(reply[i]));
        }
      }
    }
  });
}

// @method shutDown()

// Shuts down the db link.
exports.shutDown = function() { if(db) db.quit(); };


// ## Action Modules

/**
 * ### storeActionModule
 * Store a string representation of an action module in the DB.
 * @param {String} id the unique identifier of the module
 * @param {String} data the string representation
 */
exports.storeActionModule = function(id, data) {
  if(db) {
    db.sadd('action_modules', id, replyHandler('storing action module key ' + id));
    db.set('action_module_' + id, data, replyHandler('storing action module ' + id));
  }
};

/**
 * ### getActionModule(id, cb)
 * Query the DB for an action module.
 * @param {String} id the module id
 * @param {function} cb the cb to receive the answer (err, obj)
 */
exports.getActionModule = function(id, cb) {
  if(cb && db) db.get('action_module_' + id, cb);
};

/**
 * ### getActionModules(cb)
 * Fetch all action modules.
 * @param {function} cb the cb to receive the answer (err, obj)
 */
exports.getActionModules = function(cb) {
  getSetRecords('action_modules', exports.getActionModule, cb);
};

/**
 * storeActionModuleAuth(id, data)
 * Store a string representation of the authentication parameters for an action module.
 * @param {String} id the unique identifier of the module
 * @param {String} data the string representation
 */
exports.storeActionModuleAuth = function(id, data) {
  if(data && db) {
    db.sadd('action_modules_auth', id, replyHandler('storing action module auth key ' + id));
    db.set('action_module_' + id +'_auth', encrypt(data), replyHandler('storing action module auth ' + id));
  }
};

/**
 * ### getActionModuleAuth(id, cb)
 * Query the DB for an action module authentication token.
 * @param {String} id the module id
 * @param {function} cb the cb to receive the answer (err, obj)
 */
exports.getActionModuleAuth = function(id, cb) {
  if(cb && db) db.get('action_module_' + id + '_auth', function(id) {
    return function(err, txt) { cb(err, decrypt(txt, 'action_module_' + id + '_auth')); };
  }(id));
};

// ## Event Modules

/**
 * ### storeEventModule(id, data)
 * Store a string representation of an event module in the DB.
 * @param {String} id the unique identifier of the module
 * @param {String} data the string representation
 */
exports.storeEventModule = function(id, data) {
  if(db) {
    db.sadd('event_modules', id, replyHandler('storing event module key ' + id));
    db.set('event_module_' + id, data, replyHandler('storing event module ' + id));
  }
};

/**
 * ### getEventModule(id, cb)
 * Query the DB for an event module.
 * @param {String} id the module id
 * @param {function} cb the cb to receive the answer (err, obj)
 */
exports.getEventModule = function(id, cb) {
  if(cb && db) db.get('event_module_' + id, cb);
};

/**
 * ### getEventModules(cb)
 * Fetch all event modules.
 * @param {function} cb the cb that receives the arguments (err, obj)
 */
exports.getEventModules = function(cb) {
  getSetRecords('event_modules', exports.getEventModule, cb);
};

/**
 * ### storeEventModuleAuth(id, data)
 * Store a string representation of he authentication parameters for an event module.
 * @param {String} id the unique identifier of the module
 * @param {String} data the string representation
 */
exports.storeEventModuleAuth = function(id, data) {
  if(data && db) {
    db.sadd('event_modules_auth', id, replyHandler('storing event module auth key ' + id));
    db.set('event_module_' + id +'_auth', encrypt(data), replyHandler('storing event module auth ' + id));
  }
};

// @method getEventModuleAuth(id, cb)

// Query the DB for an event module authentication token.
// @param {String} id the module id
// @param {function} cb the cb to receive the answer (err, obj)
exports.getEventModuleAuth = function(id, cb) {
  if(cb) db.get('event_module_' + id +'_auth',  function(id) {
    return function(err, txt) { cb(err, decrypt(txt, 'event_module_' + id + '_auth')); };
  }(id));
};

// ## Rules

// @method storeRule(id, data)

// Store a string representation of a rule in the DB.
// @param {String} id the unique identifier of the rule
// @param {String} data the string representation
exports.storeRule = function(id, data) {
  if(db) {
    db.sadd('rules', id, replyHandler('storing rule key ' + id));
    db.set('rule_' + id, data, replyHandler('storing rule ' + id));
  }
};

// @method getRule(id, cb)

// Query the DB for a rule.
// @param {String} id the rule id
// @param {function} cb the cb to receive the answer (err, obj)
exports.getRule = function(id, cb) {
  if(db) db.get('rule_' + id, cb);
};

// @method getRules(cb)

// Fetch all rules from the database.  
// @param {function} cb
exports.getRules = function(cb) {
  getSetRecords('rules', exports.getRule, cb);
};

/**
 * 
 * @param {Object} objUser
 * @param {function} cb
 */
exports.storeUser = function(objUser, cb) {
  if(db && objUser && objUser.id) {
    db.sadd('users', objUser.id, replyHandler('storing user key ' + objUser.id));
    db.set('user:' + objUser.id, data, replyHandler('storing user properties ' + objUser.id));
  }
};

/**
 * 
 * @param {Object} objUser
 * @param {function} cb
 */
exports.loginUser = function(objUser, cb) {
  if(db) db.get('user:' + id, cb);
};
