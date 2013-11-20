###

DB Interface
============
>Handles the connection to the database and provides functionalities for
>event/action modules, rules and the encrypted storing of authentication tokens.
>General functionality as a wrapper for the module holds initialization,
>encryption/decryption, the retrieval of modules and shut down.
>
>The general structure for linked data is that the key is stored in a set.
>By fetching all set entries we can then fetch all elements, which is
>automated in this function.
>For example modules of the same group, e.g. action modules are registered in an
>unordered set in the database, from where they can be retrieved again. For example
>a new action module has its ID (e.g 'probinder') first registered in the set
>'action_modules' and then stored in the db with the key 'action\_module\_' + ID
>(e.g. action\_module\_probinder). 
>

###

'use strict'
### Grab all required modules ###
redis = require 'redis'
crypto = require 'crypto'
log = require './logging'
crypto_key = null
db = null



###
##Module call

Initializes the DB connection. Requires a valid configuration file which contains
a db port and a crypto key.
@param {Object} args
###
exports = module.exports = (args) -> 
  args = args ? {}
  log args
  config = require './config'
  config args
  crypto_key = config.getCryptoKey()
  db = redis.createClient config.getDBPort(), 'localhost', { connect_timeout: 2000 }
  db.on "error", (err) ->
    err.addInfo = 'message from DB'
    log.error 'DB', err

###
Checks whether the db is connected and calls the callback function if successful,
or an error after ten attempts within five seconds.

@public isConnected( *cb* )
@param {function} cb
###
#}TODO check if timeout works with func in func
exports.isConnected = (cb) ->
  if db.connected then cb()
  else
    numAttempts = 0
    fCheckConnection = ->
      if db.connected
        log.print 'DB', 'Successfully connected to DB!'
        cb()
      else if numAttempts++ < 10
        setTimeout fCheckConnection, 500
      else
        e = new Error 'Connection to DB failed!'
        log.error 'DB', e
        cb e
    setTimeout fCheckConnection, 500


###
Encrypts a string using the crypto key from the config file, based on aes-256-cbc.

@private encrypt( *plainText* )
@param {String} plainText
###
encrypt = (plainText) -> 
  if !plainText? then return null
  try 
    enciph = crypto.createCipher 'aes-256-cbc', crypto_key
    et = enciph.update plainText, 'utf8', 'base64'
    et + enciph.final 'base64'
  catch err
    err.addInfo = 'during encryption'
    log.error 'DB', err
    null

###
Decrypts an encrypted string and hands it back on success or null.

@private decrypt( *crypticText* )
@param {String} crypticText
###
decrypt = (crypticText) ->
  if !crypticText? then return null;
  try
    deciph = crypto.createDecipher 'aes-256-cbc', crypto_key
    dt = deciph.update crypticText, 'base64', 'utf8'
    dt + deciph.final 'utf8'
  catch err
    err.addInfo = 'during decryption'
    log.error 'DB', err
    null

###
Abstracts logging for simple action replies from the DB.

@private replyHandler( *action* )
@param {String} action
###
replyHandler = (action) ->
  (err, reply) ->
    if err
      err.addInfo = 'during "' + action + '"'
      log.error 'DB', err
    else
      log.print 'DB', action + ': ' + reply

###
Fetches all linked data set keys from a linking set, fetches the single data objects
via the provided function and returns the results to the callback function.

@private getSetRecords( *set, fSingle, cb* )
@param {String} set the set name how it is stored in the DB
@param {function} fSingle a function to retrieve a single data element per set entry
@param {function} cb the callback function that receives all the retrieved data or an error
###
getSetRecords = (set, funcSingle, cb) ->
  db?.smembers set, (err, arrReply) ->
    if err
      err.addInfo = 'fetching ' + set
      log.error 'DB', err
    else if arrReply.length == 0
      cb()
    else
      semaphore = arrReply.length
      objReplies = {}
      # } TODO What if the DB needs longer than two seconds to respond?...
      setTimeout ->
        if semaphore > 0
          cb new Error('Timeout fetching ' + set)
      , 2000
      fCallback = (prop) ->
        (err, data) ->
          if err
            err.addInfo = 'fetching single element: ' + prop
            log.error 'DB', err
          else 
            objReplies[prop] = data
            if --semaphore == 0
              cb null, objReplies
      fSingle reply, fCallback(reply) for reply in arrReply

###
@Function shutDown()

Shuts down the db link.
###
###exports.shutDown = function() { if(db) db.quit(); };
###
###
## Action Modules

@Function storeActionModule
Store a string representation of an action module in the DB.
@param {String} id the unique identifier of the module
@param {String} data the string representation
###
###exports.storeActionModule = function(id, data) {
  if(db) {
    db.sadd('action_modules', id, replyHandler('storing action module key ' + id));
    db.set('action_module_' + id, data, replyHandler('storing action module ' + id));
  }
};
###
###
@Function getActionModule(id, cb)
Query the DB for an action module.
@param {String} id the module id
@param {function} cb the cb to receive the answer (err, obj)
###
###exports.getActionModule = function(id, cb) {
  if(cb && db) db.get('action_module_' + id, cb);
};
###
###
@Function getActionModules(cb)
Fetch all action modules.
@param {function} cb the cb to receive the answer (err, obj)
###
###exports.getActionModules = function(cb) {
  getSetRecords('action_modules', exports.getActionModule, cb);
};
###
###
@Function storeActionModuleAuth(id, data)
Store a string representation of the authentication parameters for an action module.
@param {String} id the unique identifier of the module
@param {String} data the string representation
###
###exports.storeActionModuleAuth = function(id, data) {
  if(data && db) {
    db.sadd('action_modules_auth', id, replyHandler('storing action module auth key ' + id));
    db.set('action_module_' + id +'_auth', encrypt(data), replyHandler('storing action module auth ' + id));
  }
};
###
###
@Function getActionModuleAuth(id, cb)
Query the DB for an action module authentication token.
@param {String} id the module id
@param {function} cb the cb to receive the answer (err, obj)
###
###exports.getActionModuleAuth = function(id, cb) {
  if(cb && db) db.get('action_module_' + id + '_auth', function(id) {
    return function(err, txt) { cb(err, decrypt(txt, 'action_module_' + id + '_auth')); };
  }(id));
};
###
###
## Event Modules

@Function storeEventModule(id, data)
Store a string representation of an event module in the DB.
@param {String} id the unique identifier of the module
@param {String} data the string representation
###
###exports.storeEventModule = function(id, data) {
  if(db) {
    db.sadd('event_modules', id, replyHandler('storing event module key ' + id));
    db.set('event_module_' + id, data, replyHandler('storing event module ' + id));
  }
};
###
###
@Function getEventModule(id, cb)
Query the DB for an event module.
@param {String} id the module id
@param {function} cb the cb to receive the answer (err, obj)
###
###exports.getEventModule = function(id, cb) {
  if(cb && db) db.get('event_module_' + id, cb);
};
###
###
@Function getEventModules(cb)
Fetch all event modules.
@param {function} cb the cb that receives the arguments (err, obj)
###
###exports.getEventModules = function(cb) {
  getSetRecords('event_modules', exports.getEventModule, cb);
};
###
###
@Function storeEventModuleAuth(id, data)
Store a string representation of he authentication parameters for an event module.
@param {String} id the unique identifier of the module
@param {String} data the string representation
###
###exports.storeEventModuleAuth = function(id, data) {
  if(data && db) {
    db.sadd('event_modules_auth', id, replyHandler('storing event module auth key ' + id));
    db.set('event_module_' + id +'_auth', encrypt(data), replyHandler('storing event module auth ' + id));
  }
};
###
###
@Function getEventModuleAuth(id, cb)

Query the DB for an event module authentication token.
@param {String} id the module id
@param {function} cb the cb to receive the answer (err, obj)
###
###exports.getEventModuleAuth = function(id, cb) {
  if(cb) db.get('event_module_' + id +'_auth',  function(id) {
    return function(err, txt) { cb(err, decrypt(txt, 'event_module_' + id + '_auth')); };
  }(id));
};
###
###
## Rules

@Function storeRule(id, data)

Store a string representation of a rule in the DB.
@param {String} id the unique identifier of the rule
@param {String} data the string representation
###
###exports.storeRule = function(id, data) {
  if(db) {
    db.sadd('rules', id, replyHandler('storing rule key ' + id));
    db.set('rule_' + id, data, replyHandler('storing rule ' + id));
  }
};
###
###
@Function getRule(id, cb)

Query the DB for a rule.
@param {String} id the rule id
@param {function} cb the cb to receive the answer (err, obj)
###
###exports.getRule = function(id, cb) {
  if(db) db.get('rule_' + id, cb);
};
###
###
@Function getRules(cb)

Fetch all rules from the database.  
@param {function} cb
###
###exports.getRules = function(cb) {
  getSetRecords('rules', exports.getRule, cb);
};
###
###
@Function storeUser

@param {Object} objUser
@param {function} cb
###
###exports.storeUser = function(objUser, cb) {
  if(db && objUser && objUser.username && objUser.password) {
    db.sadd('users', objUser.username, replyHandler('storing user key ' + objUser.username));
    objUser.password = encrypt(objUser.password);
    db.set('user:' + objUser.username, objUser, replyHandler('storing user properties ' + objUser.username));
  }
};
###
###
Checks the credentials and on success returns the user object.
@param {Object} objUser
@param {function} cb
###
### exports.loginUser = function(username, password, cb) {
  if(typeof cb !== 'function') return;
  if(db) db.get('user:' + username, function(p) {
    return function(err, obj) {
      if(err) cb(err);
      else if(encrypt(obj.password) === p) cb(null, obj);
      else cb(new Error('Wrong credentials!'));
    };
  }(password));
  else cb(new Error('No database link available!'));
};

###