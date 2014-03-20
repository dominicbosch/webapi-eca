###

Persistence
============
> Handles the connection to the database and provides functionalities for
> event pollers, action invokers, rules and the encrypted storing of authentication tokens.
> General functionality as a wrapper for the module holds initialization,
> encryption/decryption, the retrieval of modules and shut down.
> 
> The general structure for linked data is that the key is stored in a set.
> By fetching all set entries we can then fetch all elements, which is
> automated in this function.
> For example, modules of the same group, e.g. action invokers are registered in an
> unordered set in the database, from where they can be retrieved again. For example
> a new action invoker has its ID (e.g 'probinder') first registered in the set
> 'action-invokers' and then stored in the db with the key 'action-invoker:' + ID
> (e.g. action-invoker:probinder). 
>

###

# **Loads Modules:**

# - External Modules:
#   [crypto-js](https://github.com/evanvosberg/crypto-js) and
#   [redis](https://github.com/mranney/node_redis)
crypto = require 'crypto-js'
redis = require 'redis'

###
Module call
-----------
Initializes the DB connection with the given `db-port` property in the `args` object.

@param {Object} args
###
exports = module.exports = ( args ) => 
  @log = args.logger
  @db?.quit()
  #TODO we need to have a secure concept here, private keys per user
  @crypto_key = "}f6y1y}B{.an$}2c$Yl.$mSnF\\HX149u*y8C:@kmN/520Gt\\v'+KFBnQ!\\r<>5X/xRI`sT<Iw;:DPV;4gy:qf]Zq{\"6sgK{,}^\"!]O;qBM3G?]h_`Psw=b6bVXKXry7*"
  @db = redis.createClient args[ 'db-port' ],
    'localhost', { connect_timeout: 2000 }
  # Eventually we try to connect to the wrong port, redis will emit an error that we
  # need to catch and take into account when answering the isConnected function call
  @db.on 'error', ( err ) =>
    if err.message.indexOf( 'ECONNREFUSED' ) > -1
      @connRefused = true
      @log.error err, 'DB | Wrong port?'
  exports.eventPollers = new IndexedModules( 'event-poller', @db, @log  )
  exports.actionInvokers = new IndexedModules( 'action-invoker', @db, @log )
  
###
Checks whether the db is connected and passes either an error on failure after
ten attempts within five seconds, or nothing on success to the callback(err).

@public isConnected( *cb* )
@param {function} cb
###
exports.isConnected = ( cb ) =>
  if @db.connected
    cb()
  else
    numAttempts = 0
    fCheckConnection = =>
      if @connRefused
        cb new Error 'DB | Connection refused! Wrong port?'
      else
        if @db.connected
          @log.info 'DB | Successfully connected to DB!'
          cb()
        else if numAttempts++ < 10
          setTimeout fCheckConnection, 100
        else
          cb new Error 'DB | Connection to DB failed!'
    setTimeout fCheckConnection, 100

###
Abstracts logging for simple action replies from the DB.

@private replyHandler( *action* )
@param {String} action
###
replyHandler = ( action ) =>
  ( err, reply ) =>
    if err
      @log.warn err, "during '#{ action }'"
    else
      @log.info "DB | #{ action }: #{ reply }"

###
Push an event into the event queue.

@public pushEvent( *oEvent* )
@param {Object} oEvent
###
exports.pushEvent = ( oEvent ) =>
  if oEvent
    @log.info "DB | Event pushed into the queue: '#{ oEvent.eventid }'"
    @db.rpush 'event_queue', JSON.stringify( oEvent )
  else
    @log.warn 'DB | Why would you give me an empty event...'


###
Pop an event from the event queue and pass it to cb(err, obj).

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
    @log.warn err, 'DB | during hashing'
    null


###
Encrypts a string using the crypto key from the config file, based on aes-256-cbc.

@private encrypt( *plainText* )
@param {String} plainText
###
encrypt = ( plainText ) => 
  if !plainText? then return null
  try
    crypto.AES.encrypt plainText, @crypto_key
  catch err
    @log.warn err, 'DB | during encryption'
    null

###
Decrypts an encrypted string and hands it back on success or null.

@private decrypt( *crypticText* )
@param {String} crypticText
###
decrypt = ( crypticText ) =>
  if !crypticText? then return null;
  try
    dec = crypto.AES.decrypt crypticText, @crypto_key
    dec.toString crypto.enc.Utf8
  catch err
    @log.warn err, 'DB | during decryption'
    null

###
Fetches all linked data set keys from a linking set, fetches the single
data objects via the provided function and returns the results to cb(err, obj).

@private getSetRecords( *set, fSingle, cb* )
@param {String} set the set name how it is stored in the DB
@param {function} fSingle a function to retrieve a single data element
      per set entry
@param {function} cb the callback(err, obj) function that receives all
      the retrieved data or an error
###
getSetRecords = ( set, fSingle, cb ) =>
  @log.info "DB | Fetching set records: '#{ set }'"
  # Fetch all members of the set
  @db.smembers set, ( err, arrReply ) =>
    if err
      # If an error happens we return it to the callback function
      @log.warn err, "DB | fetching '#{ set }'"
      cb err
    else if arrReply.length == 0
      # If the set was empty we return null to the callback
      cb()
    else
      # We need to fetch all the entries from the set and use a semaphore
      # since the fetching from the DB will happen asynchronously
      semaphore = arrReply.length
      objReplies = {}
      setTimeout ->
        # We use a timeout function to cancel the operation
        # in case the DB does not respond
        if semaphore > 0
          cb new Error "Timeout fetching '#{ set }'"
      , 2000
      fCallback = ( prop ) =>
        # The callback function is required to preprocess the result before
        # handing it to the callback. This especially includes decrementing
        # the semaphore
        ( err, data ) =>
          --semaphore
          if err
            @log.warn err, "DB | fetching single element: '#{ prop }'"
          else if not data
            # There was no data behind the key
            @log.warn new Error "Empty key in DB: '#{ prop }'"
          else
            # We found a valid record and add it to the reply object
            objReplies[ prop ] = data
          if semaphore == 0
            # If all fetch calls returned we finally pass the result
            # to the callback
            cb null, objReplies
      # Since we retrieved an array of keys, we now execute the fSingle function
      # on each of them, to retrieve the ata behind the key. Our fCallback function
      # is used to preprocess the answer to determine correct execution
      fSingle reply, fCallback reply for reply in arrReply

# TODO remove specific functions and allow direct access to instances of this class
class IndexedModules
  constructor: ( @setname, @db, @log ) ->
    @log.info "DB | Instantiated indexed modules for '#{ @setname }'"

  storeModule: ( mId, userId, data ) =>
    @log.info "DB | storeModule(#{ @setname }): #{ mId }"
    @db.sadd "#{ @setname }s", mId,
      replyHandler "Storing '#{ @setname }' key '#{ mId }'"
    @db.hmset "#{ @setname }:#{ mId }", 'code', data['code'],
      replyHandler "Storing '#{ @setname }:#{ mId }'"
    @db.hmset "#{ @setname }:#{ mId }", 'reqparams', data['reqparams'],
      replyHandler "Storing '#{ @setname }:#{ mId }'"
    @linkModule mId, userId

  #TODO add testing
  linkModule: ( mId, userId ) =>
    @log.info "DB | linkModule(#{ @setname }): #{ mId } to #{ userId }"
    @db.sadd "#{ @setname }:#{ mId }:users", userId,
      replyHandler "Linking '#{ @setname }:#{ mId }:users' #{ userId }"
    @db.sadd "user:#{ userId }:#{ @setname }s", mId,
      replyHandler "Linking 'user:#{ userId }:#{ @setname }s' #{ mId }"

  #TODO add testing
  unlinkModule: ( mId, userId ) =>
    @log.info "DB | unlinkModule(#{ @setname }): #{ mId } to #{ userId }"
    @db.srem "#{ @setname }:#{ mId }:users", userId,
      replyHandler "Unlinking '#{ @setname }:#{ mId }:users' #{ userId }"
    @db.srem "user:#{ userId }:#{ @setname }s", mId,
      replyHandler "Unlinking 'user:#{ userId }:#{ @setname }s' #{ mId }"

  #TODO add testing
  publish: ( mId ) =>
    @log.info "DB | publish(#{ @setname }): #{ mId }"
    @db.sadd "public-#{ @setname }s", mId,
      replyHandler "Publishing '#{ @setname }' key '#{ mId }'"

  #TODO add testing
  unpublish: ( mId ) =>
    @log.info "DB | unpublish(#{ @setname }): #{ mId }"
    @db.srem "public-#{ @setname }s", mId,
      replyHandler "Unpublishing '#{ @setname }' key '#{ mId }'"

  getModule: ( mId, cb ) =>
    @log.info "DB | getModule('#{ @setname }): #{ mId }'"
    @db.hgetall "#{ @setname }:#{ mId }", cb

  #TODO add testing
  getModuleParams: ( mId, cb ) =>
    @log.info "DB | getModule('#{ @setname }): #{ mId }'"
    @db.hget "#{ @setname }:#{ mId }", "params", cb

  #TODO add testing
  getAvailableModuleIds: ( userId, cb ) =>
    @log.info "DB | getPublicModuleIds(#{ @setname })"
    @db.sunion "public-#{ @setname }s", "user:#{ userId }:#{ @setname }s", cb

  getModuleIds: ( cb ) =>
    @log.info "DB | getModuleIds(#{ @setname })"
    @db.smembers "#{ @setname }s", cb

  getModules: ( cb ) =>
    @log.info "DB | getModules(#{ @setname })"
    getSetRecords "#{ @setname }s", @getModule, cb

  deleteModule: ( mId ) =>
    @log.info "DB | deleteModule(#{ @setname }): #{ mId }"
    @db.srem "#{ @setname }s", mId,
      replyHandler "Deleting '#{ @setname }' key '#{ mId }'"
    @db.del "#{ @setname }:#{ mId }",
      replyHandler "Deleting '#{ @setname }:#{ mId }'"
    @db.smembers "#{ @setname }:#{ mId }:users", ( err, obj ) =>
      fRemLinks = ( userId ) =>
        @db.srem "#{ @setname }:#{ mId }:users", userId, 
          replyHandler "Removing '#{ @setname }:#{ mId }' linked user '#{ userId }'"
        @db.srem "user:#{ userId }:#{ @setname }s", mId, 
          replyHandler "Removing 'user:#{ userId }:#{ @setname }s' linked module '#{ mId }'"
      fRemLinks user for user in obj    
  #TODO remove published ids
  # TODO remove from public modules
  # TODO remove parameters
    # @log.info "DB | linkModule(#{ @setname }): #{ mId } to #{ userId }"
    # @db.sadd "#{ @setname }:#{ mId }:users", userId,
    #   replyHandler "Linking '#{ @setname }:#{ mId }:users' #{ userId }"
    # @db.sadd "user:#{ userId }:#{ @setname }s", mId,
    #   replyHandler "Linking 'user:#{ userId }:#{ @setname }s' #{ mId }"

  storeUserParams: ( mId, userId, data ) =>
    @log.info "DB | storeUserParams(#{ @setname }): '#{ mId }:#{ userId }'"
    @db.sadd "#{ @setname }-params", "#{ mId }:#{ userId }",
      replyHandler "Storing '#{ @setname }' module parameters key '#{ mId }'"
    @db.set "#{ @setname }-params:#{ mId }:#{ userId }", encrypt( data ),
      replyHandler "Storing '#{ @setname }' module parameters '#{ mId }:#{ userId }'"

  getUserParams: ( mId, userId, cb ) =>
    @log.info "DB | getUserParams(#{ @setname }): '#{ mId }:#{ userId }'"
    @db.get "#{ @setname }-params:#{ mId }:#{ userId }", ( err, data ) ->
      cb err, decrypt data

  getUserParamsIds: ( cb ) =>
    @log.info "DB | getUserParamsIds(#{ @setname })"
    @db.smembers "#{ @setname }-params", cb

  deleteUserParams: ( mId, userId ) =>
    @log.info "DB | deleteUserParams(#{ @setname }): '#{ mId }:#{ userId }'"
    @db.srem "#{ @setname }-params", "#{ mId }:#{ userId }",
      replyHandler "Deleting '#{ @setname }-params' key '#{ mId }:#{ userId }'"
    @db.del "#{ @setname }-params:#{ mId }:#{ userId }",
      replyHandler "Deleting '#{ @setname }-params:#{ mId }:#{ userId }'"


###
## Rules
###

###
Query the DB for a rule and pass it to cb(err, obj).

@public getRule( *ruleId, cb* )
@param {String} ruleId
@param {function} cb
###
exports.getRule = ( ruleId, cb ) =>
  @log.info "DB | getRule: '#{ ruleId }'"
  @db.get "rule:#{ ruleId }", cb

###
Fetch all rules and pass them to cb(err, obj).  

@public getRules( *cb* )
@param {function} cb
###
exports.getRules = ( cb ) =>
  @log.info 'DB | Fetching all Rules'
  getSetRecords 'rules', exports.getRule, cb

###
Fetch all rule IDs and hand it to cb(err, obj).

@public getRuleIds( *cb* )
@param {function} cb
###
exports.getRuleIds = ( cb ) =>
  @log.info 'DB | Fetching all Rule IDs'
  @db.smembers 'rules', cb

###
Store a string representation of a rule in the DB.

@public storeRule( *ruleId, data* )
@param {String} ruleId
@param {String} data
###
exports.storeRule = ( ruleId, data ) =>
  @log.info "DB | storeRule: '#{ ruleId }'"
  @db.sadd 'rules', "#{ ruleId }",
    replyHandler "storing rule key '#{ ruleId }'"
  @db.set "rule:#{ ruleId }", data,
    replyHandler "storing rule '#{ ruleId }'"

###
Delete a string representation of a rule.

@public deleteRule( *ruleId, userId* )
@param {String} ruleId
@param {String} userId
###
exports.deleteRule = ( ruleId ) =>
  @log.info "DB | deleteRule: '#{ ruleId }'"
  @db.srem "rules", ruleId, replyHandler "Deleting rule key '#{ ruleId }'"
  @db.del "rule:#{ ruleId }", replyHandler "Deleting rule '#{ ruleId }'"

  # We also need to delete all references in linked and active users
  @db.smembers "rule:#{ ruleId }:users", ( err, obj ) =>
    delLinkedUserRule = ( userId ) =>
      @db.srem "user:#{ userId }:rules", ruleId,
        replyHandler "Deleting rule key '#{ ruleId }' in linked user '#{ userId }'"
    delLinkedUserRule id  for id in obj
  @db.del "rule:#{ ruleId }:users", replyHandler "Deleting rule '#{ ruleId }' users"

  @db.smembers "rule:#{ ruleId }:active-users", ( err, obj ) =>
    delActiveUserRule = ( userId ) =>
      @db.srem "user:#{ userId }:active-rules", ruleId,
        replyHandler "Deleting rule key '#{ ruleId }' in active user '#{ userId }'"
    delActiveUserRule id  for id in obj
  @db.del "rule:#{ ruleId }:active-users",
    replyHandler "Deleting rule '#{ ruleId }' active users"

###
Associate a rule to a user.

@public linkRule( *ruleId, userId* )
@param {String} ruleId
@param {String} userId
###
exports.linkRule = ( ruleId, userId ) =>
  @log.info "DB | linkRule: '#{ ruleId }' for user '#{ userId }'"
  @db.sadd "rule:#{ ruleId }:users", userId,
    replyHandler "storing user '#{ userId }' for rule key '#{ ruleId }'"
  @db.sadd "user:#{ userId }:rules", ruleId,
    replyHandler "storing rule key '#{ ruleId }' for user '#{ userId }'"

###
Get rules linked to a user and hand it to cb(err, obj).

@public getUserLinkRule( *userId, cb* )
@param {String} userId
@param {function} cb
###
exports.getUserLinkedRules = ( userId, cb ) =>
  @log.info "DB | getUserLinkedRules: for user '#{ userId }'"
  @db.smembers "user:#{ userId }:rules", cb

###
Get users linked to a rule and hand it to cb(err, obj).

@public getRuleLinkedUsers( *ruleId, cb* )
@param {String} ruleId
@param {function} cb
###
exports.getRuleLinkedUsers = ( ruleId, cb ) =>
  @log.info "DB | getRuleLinkedUsers: for rule '#{ ruleId }'"
  @db.smembers "rule:#{ ruleId }:users", cb

###
Delete an association of a rule to a user.

@public unlinkRule( *ruleId, userId* )
@param {String} ruleId
@param {String} userId
###
exports.unlinkRule = ( ruleId, userId ) =>
  @log.info "DB | unlinkRule: '#{ ruleId }:#{ userId }'"
  @db.srem "rule:#{ ruleId }:users", userId,
    replyHandler "removing user '#{ userId }' for rule key '#{ ruleId }'"
  @db.srem "user:#{ userId }:rules", ruleId,
    replyHandler "removing rule key '#{ ruleId }' for user '#{ userId }'"

###
Activate a rule.

@public activateRule( *ruleId, userId* )
@param {String} ruleId
@param {String} userId
###
exports.activateRule = ( ruleId, userId ) =>
  @log.info "DB | activateRule: '#{ ruleId }' for '#{ userId }'"
  @db.sadd "rule:#{ ruleId }:active-users", userId,
    replyHandler "storing activated user '#{ userId }' in rule '#{ ruleId }'"
  @db.sadd "user:#{ userId }:active-rules", ruleId,
    replyHandler "storing activated rule '#{ ruleId }' in user '#{ userId }'"

###
Get rules activated for a user and hand it to cb(err, obj).

@public getUserLinkRule( *userId, cb* )
@param {String} userId
@param {function} cb
###
exports.getUserActivatedRules = ( userId, cb ) =>
  @log.info "DB | getUserActivatedRules: for user '#{ userId }'"
  @db.smembers "user:#{ userId }:active-rules", cb

###
Get users activated for a rule and hand it to cb(err, obj).

@public getRuleActivatedUsers ( *ruleId, cb* )
@param {String} ruleId
@param {function} cb
###
exports.getRuleActivatedUsers = ( ruleId, cb ) =>
  @log.info "DB | getRuleActivatedUsers: for rule '#{ ruleId }'"
  @db.smembers "rule:#{ ruleId }:active-users", cb

###
Deactivate a rule.

@public deactivateRule( *ruleId, userId* )
@param {String} ruleId
@param {String} userId
###
exports.deactivateRule = ( ruleId, userId ) =>
  @log.info "DB | deactivateRule: '#{ ruleId }' for '#{ userId }'"
  @db.srem "rule:#{ ruleId }:active-users", userId,
    replyHandler "removing activated user '#{ userId }' in rule '#{ ruleId }'"
  @db.srem "user:#{ userId }:active-rules", ruleId,
    replyHandler "removing activated rule '#{ ruleId }' in user '#{ userId }'"

###
Fetch all active ruleIds and pass them to cb(err, obj).

@public getAllActivatedRuleIds( *cb* )
@param {function} cb
###
exports.getAllActivatedRuleIdsPerUser = ( cb ) =>
  @log.info "DB | Fetching all active rules"
  @db.smembers 'users', ( err, obj ) =>
    result = {}
    if obj.length is 0
      cb null, result
    else
      semaphore = obj.length
      fFetchActiveUserRules = ( userId ) =>
        @db.smembers "user:#{ user }:active-rules", ( err, obj ) =>
          if obj.length > 0
            result[userId] = obj
          if --semaphore is 0
            cb null, result
      fFetchActiveUserRules user for user in obj


###
## Users
###

###
Store a user object (needs to be a flat structure).
The password should be hashed before it is passed to this function.

@public storeUser( *objUser* )
@param {Object} objUser
###
exports.storeUser = ( objUser ) =>
  #TODO Only store user if not already existing, or at least only then add a private key
  #for his encryption. we would want to have one private key per user, right?  
  @log.info "DB | storeUser: '#{ objUser.username }'"
  if objUser and objUser.username and objUser.password
    @db.sadd 'users', objUser.username,
      replyHandler "storing user key '#{ objUser.username }'"
    objUser.password = objUser.password
    @db.hmset "user:#{ objUser.username }", objUser,
      replyHandler "storing user properties '#{ objUser.username }'"
  else
    @log.warn new Error 'DB | username or password was missing'

###
Fetch all user IDs and pass them to cb(err, obj).

@public getUserIds( *cb* )
@param {function} cb
###
exports.getUserIds = ( cb ) =>
  @log.info "DB | getUserIds"
  @db.smembers "users", cb
  
###
Fetch a user by id and pass it to cb(err, obj).

@public getUser( *userId, cb* )
@param {String} userId
@param {function} cb
###
exports.getUser = ( userId, cb ) =>
  @log.info "DB | getUser: '#{ userId }'"
  @db.hgetall "user:#{ userId }", cb
  
###
Deletes a user and all his associated linked and active rules.

@public deleteUser( *userId* )
@param {String} userId
###
exports.deleteUser = ( userId ) =>
  @log.info "DB | deleteUser: '#{ userId }'"
  @db.srem "users", userId, replyHandler "Deleting user key '#{ userId }'"
  @db.del "user:#{ userId }", replyHandler "Deleting user '#{ userId }'"

  # We also need to delete all linked rules
  @db.smembers "user:#{ userId }:rules", ( err, obj ) =>
    delLinkedRuleUser = ( ruleId ) =>
      @db.srem "rule:#{ ruleId }:users", userId,
        replyHandler "Deleting user key '#{ userId }' in linked rule '#{ ruleId }'"
    delLinkedRuleUser id for id in obj
  @db.del "user:#{ userId }:rules",
    replyHandler "Deleting user '#{ userId }' rules"

  # We also need to delete all active rules
  @db.smembers "user:#{ userId }:active-rules", ( err, obj ) =>
    delActivatedRuleUser = ( ruleId ) =>
      @db.srem "rule:#{ ruleId }:active-users", userId,
        replyHandler "Deleting user key '#{ userId }' in active rule '#{ ruleId }'"
    delActivatedRuleUser id for id in obj
  @db.del "user:#{ userId }:active-rules",
    replyHandler "Deleting user '#{ userId }' rules"

  # We also need to delete all associated roles
  @db.smembers "user:#{ userId }:roles", ( err, obj ) =>
    delRoleUser = ( roleId ) =>
      @db.srem "role:#{ roleId }:users", userId,
        replyHandler "Deleting user key '#{ userId }' in role '#{ roleId }'"
    delRoleUser id for id in obj
  @db.del "user:#{ userId }:roles",
    replyHandler "Deleting user '#{ userId }' roles"

###
Checks the credentials and on success returns the user object to the
callback(err, obj) function. The password has to be hashed (SHA-3-512)
beforehand by the instance closest to the user that enters the password,
because we only store hashes of passwords for security6 reasons.

@public loginUser( *userId, password, cb* )
@param {String} userId
@param {String} password
@param {function} cb
###
exports.loginUser = ( userId, password, cb ) =>
  @log.info "DB | User '#{ userId }' tries to log in"
  fCheck = ( pw ) =>
    ( err, obj ) =>
      if err 
        cb err, null
      else if obj and obj.password
        if pw == obj.password
          @log.info "DB | User '#{ obj.username }' logged in!" 
          cb null, obj
        else
          cb (new Error 'Wrong credentials!'), null
      else
        cb (new Error 'User not found!'), null
  @db.hgetall "user:#{ userId }", fCheck password

#TODO implement functions required for user sessions?


###
## User Roles
###

###
Associate a role with a user.

@public storeUserRole( *userId, role* )
@param {String} userId
@param {String} role
###
exports.storeUserRole = ( userId, role ) =>
  @log.info "DB | storeUserRole: '#{ userId }:#{ role }'"
  @db.sadd 'roles', role, replyHandler "adding role '#{ role }' to role index set"
  @db.sadd "user:#{ userId }:roles", role,
    replyHandler "adding role '#{ role }' to user '#{ userId }'"
  @db.sadd "role:#{ role }:users", userId,
    replyHandler "adding user '#{ userId }' to role '#{ role }'"

###
Fetch all roles of a user and pass them to cb(err, obj).

@public getUserRoles( *userId* )
@param {String} userId
@param {function} cb
###
exports.getUserRoles = ( userId, cb ) =>
  @log.info "DB | getUserRoles: '#{ userId }'"
  @db.smembers "user:#{ userId }:roles", cb
  
###
Fetch all users of a role and pass them to cb(err, obj).

@public getUserRoles( *role* )
@param {String} role
@param {function} cb
###
exports.getRoleUsers = ( role, cb ) =>
  @log.info "DB | getRoleUsers: '#{ role }'"
  @db.smembers "role:#{ role }:users", cb

###
Remove a role from a user.

@public removeRoleFromUser( *role, userId* )
@param {String} role
@param {String} userId
###
exports.removeUserRole = ( userId, role ) =>
  @log.info "DB | removeRoleFromUser: role '#{ role }', user '#{ userId }'"
  @db.srem "user:#{ userId }:roles", role,
    replyHandler "Removing role '#{ role }' from user '#{ userId }'"
  @db.srem "role:#{ role }:users", userId,
    replyHandler "Removing user '#{ userId }' from role '#{ role }'"


###
Shuts down the db link.

@public shutDown()
###
exports.shutDown = () => @db?.quit()
