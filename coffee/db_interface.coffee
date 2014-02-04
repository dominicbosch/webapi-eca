###

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

###

# **Requires:**

# - [Logging](logging.html)
log = require './logging'

# - External Modules: [crypto-js](https://github.com/evanvosberg/crypto-js) and
#   [redis](https://github.com/mranney/node_redis)
crypto = require 'crypto-js'
redis = require 'redis'

###
Module call
-----------
Initializes the DB connection. Requires a valid configuration file which contains
a db port and a crypto key.

@param {Object} args
###
exports = module.exports = ( args ) => 
  args = args ? {}
  log args
  config = require './config'
  config args
  @db?.quit()
  if config.isReady()
    @crypto_key = config.getCryptoKey()
    @db = redis.createClient config.getDBPort(),
      'localhost', { connect_timeout: 2000 }
    @db.on 'error', ( err ) ->
      err.addInfo = 'message from DB'
      log.error 'DB', err
  else
    log.error 'DB', 'Initialization failed because of missing config file!'

###
Checks whether the db is connected and passes either an error on failure after
ten attempts within five seconds, or nothing on success to the callback(err).

@public isConnected( *cb* )
@param {function} cb
###
exports.isConnected = ( cb ) =>
  if @db.connected then cb()
  else
    numAttempts = 0
    fCheckConnection = =>
      if @db.connected
        log.print 'DB', 'Successfully connected to DB!'
        cb()
      else if numAttempts++ < 10
        setTimeout fCheckConnection, 100
      else
        cb new Error 'Connection to DB failed!'
    setTimeout fCheckConnection, 100

###
Abstracts logging for simple action replies from the DB.

@private replyHandler( *action* )
@param {String} action
###
replyHandler = ( action ) ->
  ( err, reply ) ->
    if err
      err.addInfo = 'during "' + action + '"'
      log.error 'DB', err
    else
      log.print 'DB', action + ': ' + reply

###
Push an event into the event queue.

@public pushEvent( *event* )
@param {Object} event
###
exports.pushEvent = ( event ) =>
  if event
    log.print 'DB', 'Event pushed into the queue: ' + event.eventid
    @db.rpush 'event_queue', JSON.stringify( event )
  else
    log.error 'DB', 'Why would you give me an empty event...'


###
Pop an event from the event queue and pass it to the callback(err, obj) function.

@public popEvent( *cb* )
@param {function} cb
###
exports.popEvent = ( cb ) =>
  makeObj = ( pcb ) ->
    ( err, obj ) ->
      pcb err, JSON.parse( obj )
  @db.lpop 'event_queue', makeObj( cb )
  
###
Purge the event queue.

@public purgeEventQueue()
###
exports.purgeEventQueue = () =>
  @db.del 'event_queue', replyHandler 'purging event queue'  

###
Hashes a string based on SHA-3-512.

@private hash( *plainText* )
@param {String} plainText
###
hash = ( plainText ) => 
  if !plainText? then return null
  try
    ( crypto.SHA3 plainText, { outputLength: 512 } ).toString()
  catch err
    err.addInfo = 'during hashing'
    log.error 'DB', err
    null


###
Encrypts a string using the crypto key from the config file, based on aes-256-cbc.

@private encrypt( *plainText* )
@param {String} plainText
###
encrypt = ( plainText ) => 
  if !plainText? then return null
  try 
    enciph = crypto.createCipher 'aes-256-cbc', @crypto_key
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
decrypt = ( crypticText ) =>
  if !crypticText? then return null;
  try
    deciph = crypto.createDecipher 'aes-256-cbc', @crypto_key
    dt = deciph.update crypticText, 'base64', 'utf8'
    dt + deciph.final 'utf8'
  catch err
    err.addInfo = 'during decryption'
    log.error 'DB', err
    null

###
Fetches all linked data set keys from a linking set, fetches the single data objects
via the provided function and returns the results to the callback(err, obj) function.

@private getSetRecords( *set, fSingle, cb* )
@param {String} set the set name how it is stored in the DB
@param {function} fSingle a function to retrieve a single data element per set entry
@param {function} cb the callback(err, obj) function that receives all the retrieved data or an error
###
getSetRecords = ( set, fSingle, cb ) =>
  log.print 'DB', 'Fetching set records: ' + set
  @db.smembers set, ( err, arrReply ) ->
    if err
      err.addInfo = 'fetching ' + set
      log.error 'DB', err
    else if arrReply.length == 0
      cb()
    else
      semaphore = arrReply.length
      objReplies = {}
      setTimeout ->
        if semaphore > 0
          cb new Error('Timeout fetching ' + set)
      , 2000
      fCallback = ( prop ) ->
        ( err, data ) ->
          --semaphore
          if err
            err.addInfo = 'fetching single element: ' + prop
            log.error 'DB', err
          else if not data
            log.error 'DB', new Error 'Empty key in DB: ' + prop
          else
            objReplies[ prop ] = data
          if semaphore == 0
            cb null, objReplies
      fSingle reply, fCallback( reply ) for reply in arrReply

###
## Action Modules
###

###
Store a string representation of an action module in the DB.

@public storeActionModule ( *id, data* )
@param {String} id
@param {String} data
###
# FIXME can the data be an object?
exports.storeActionModule = ( id, data ) =>
  log.print 'DB', 'storeActionModule: ' + id
  @db.sadd 'action-modules', id, replyHandler 'storing action module key ' + id
  @db.set 'action-module:' + id, data, replyHandler 'storing action module ' + id

###
Query the DB for an action module and pass it to the callback(err, obj) function.

@public getActionModule( *id, cb* )
@param {String} id
@param {function} cb
###
exports.getActionModule = ( id, cb ) =>
  log.print 'DB', 'getActionModule: ' + id
  @db.get 'action-module:' + id, cb

###
Fetch all action modules and hand them to the callback(err, obj) function.

@public getActionModules( *cb* )
@param {function} cb
###
exports.getActionModules = ( cb ) ->
  getSetRecords 'action-modules', exports.getActionModule, cb

###
Store user-specific action module parameters .

@public storeActionParams( *userId, moduleId, data* )
@param {String} userId
@param {String} moduleId
@param {String} data
###
exports.storeActionParams = ( userId, moduleId, data ) =>
  log.print 'DB', 'storeActionParams: ' + moduleId + ':' + userId
  @db.set 'action-params:' + moduleId + ':' + userId, hash(data),
    replyHandler 'storing action params ' + moduleId + ':' + userId

###
Query the DB for user-specific action module parameters,
and pass it to the callback(err, obj) function.

@public getActionParams( *userId, moduleId, cb* )
@param {String} userId
@param {String} moduleId
@param {function} cb
###
exports.getActionParams = ( userId, moduleId, cb ) =>
  log.print 'DB', 'getActionParams: ' + moduleId + ':' + userId
  @db.get 'action-params:' + moduleId + ':' + userId, ( err, data ) ->
    cb err, decrypt data


###
## Event Modules
###

###
Store a string representation of an event module in the DB.

@public storeEventModule( *id, data* )
@param {String} id
@param {String} data
###
exports.storeEventModule = ( id, data ) =>
  log.print 'DB', 'storeEventModule: ' + id
  @db.sadd 'event-modules', id, replyHandler 'storing event module key ' + id
  @db.set 'event-module:' + id, data, replyHandler 'storing event module ' + id

###
Query the DB for an event module and pass it to the callback(err, obj) function.

@public getEventModule( *id, cb* )
@param {String} id 
@param {function} cb
###
exports.getEventModule = ( id, cb ) =>
  log.print 'DB', 'getEventModule: ' + id
  @db.get 'event-module:' + id, cb

###
Fetch all event modules and pass them to the callback(err, obj) function.

@public getEventModules( *cb* )
@param {function} cb
###
exports.getEventModules = ( cb ) ->
  getSetRecords 'event-modules', exports.getEventModule, cb

###
Store a string representation of user-specific parameters for an event module.

@public storeEventParams( *userId, moduleId, data* )
@param {String} userId
@param {String} moduleId
@param {Object} data
###
# TODO is used, remove unused ones
exports.storeEventParams = ( userId, moduleId, data ) =>
  log.print 'DB', 'storeEventParams: ' + moduleId + ':' + userId
  # TODO encryption based on user specific key?
  @db.set 'event-params:' + moduleId + ':' + userId, encrypt(data),
    replyHandler 'storing event auth ' + moduleId + ':' + userId
  
###
Query the DB for an action module authentication token, associated with a user.

@public getEventAuth( *userId, moduleId, data* )
@param {String} userId
@param {String} moduleId
@param {function} cb
###
exports.getEventAuth = ( userId, moduleId, cb ) =>
  log.print 'DB', 'getEventAuth: ' + moduleId + ':' + userId
  @db.get 'event-auth:' + moduleId + ':' + userId, ( err, data ) ->
    cb err, decrypt data


###
## Rules
###

###
Store a string representation of a rule in the DB.

@public storeRule( *ruleId, userId, data* )
@param {String} ruleId
@param {String} userId
@param {String} data
###
exports.storeRule = ( ruleId, userId, data ) =>
  log.print 'DB', 'storeRule: ' + ruleId
  @db.sadd 'rules', ruleId + ':' + user, replyHandler 'storing rule key "' + ruleId + ':' + user + '"'
  @db.sadd 'user-set:' + user + ':rules', ruleId, replyHandler 'storing rule key to "user:' + user + ':rules"'
  @db.sadd 'rule-set:' + ruleId + ':users', user, replyHandler 'storing user key to "rule:' + ruleId + ':users"'
  @db.set 'rule:' + ruleId + ':' + user, data, replyHandler 'storing rule "' + ruleId + ':' + user + '"'

###
Query the DB for a rule and pass it to the callback(err, obj) function.

@public getRule( *id, cb* )
@param {String} id
@param {function} cb
###
exports.getRule = ( id, cb ) =>
  log.print 'DB', 'getRule: ' + id
  @db.get 'rule:' + id, cb

###
Fetch all rules from the database and pass them to the callback function.  

@public getRules( *cb* )
@param {function} cb
###
exports.getRules = ( cb ) ->
  log.print 'DB', 'Fetching all Rules'
  getSetRecords 'rules', exports.getRule, cb

###
Store a user object (needs to be a flat structure).

@public storeUser( *objUser* )
@param {Object} objUser
###
exports.storeUser = ( objUser ) =>
  #TODO Only store user if not already existing, or at least only then add a private key
  #for his encryption. we would want to have one private key per user, right?  
  log.print 'DB', 'storeUser: ' + objUser.username
  if objUser and objUser.username and objUser.password
    @db.sadd 'users', objUser.username, replyHandler 'storing user key ' + objUser.username
    objUser.password = hash objUser.password
    @db.hmset 'user:' + objUser.username, objUser, replyHandler 'storing user properties ' + objUser.username
  else
    log.error 'DB', new Error 'username or password was missing'

###
Associate a role with a user.

@public storeUserRole( *username, role* )
@param {String} username
@param {String} role
###
exports.storeUserRole = ( userId, roleId ) =>
  log.print 'DB', 'storeUserRole: ' + username + ':' + role
  @db.sadd 'roles', role, replyHandler 'adding role ' + role + ' to role index set'
  @db.sadd 'user:' + userId + ':roles', role, replyHandler 'adding role ' + role + ' to user ' + username
  @db.sadd 'role:' + roleId + ':users', username, replyHandler 'adding user ' + username + ' to role ' + role

###
Fetch all roles of a user and pass them to the callback(err, obj)

@public getUserRoles( *username* )
@param {String} username
###
exports.getUserRoles = ( username ) =>
  log.print 'DB', 'getUserRole: ' + username
  @db.get 'user-roles:' + username, cb
  
###
Fetch all users of a role and pass them to the callback(err, obj)

@public getUserRoles( *role* )
@param {String} role
###
exports.getRoleUsers = ( role ) =>
  log.print 'DB', 'getRoleUsers: ' + role
  @db.get 'role-users:' + role, cb

###
Checks the credentials and on success returns the user object to the
callback(err, obj) function. The password has to be hashed (SHA-3-512)
beforehand by the instance closest to the user that enters the password,
because we only store hashes of passwords for safety reasons.

@public loginUser( *username, password, cb* )
@param {String} username
@param {String} password
@param {function} cb
###
#TODO verify and test whole function
exports.loginUser = ( username, password, cb ) =>
  log.print 'DB', 'User "' + username + '" tries to log in'
  fCheck = ( pw ) ->
    ( err, obj ) ->
      if err 
        cb err
      else if obj and obj.password
        if pw == obj.password
          log.print 'DB', 'User "' + obj.username + '" logged in!' 
          cb null, obj
        else
          cb new Error 'Wrong credentials!'
      else
        cb new Error 'User not found!'
  @db.hgetall 'user:' + username, fCheck password

#TODO implement functions required for user sessions and the rule activation

###
Shuts down the db link.

@public shutDown()
###
exports.shutDown = => @db.quit()
