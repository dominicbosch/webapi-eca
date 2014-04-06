###

Persistence
============
> Handles the connection to the database and provides functionalities for event pollers,
> action invokers, rules and the (hopefully encrypted) storing of user-specific parameters
> per module.
> General functionality as a wrapper for the module holds initialization,
> the retrieval of modules and shut down.
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
#   [redis](https://github.com/mranney/node_redis)
redis = require 'redis'

###
Module call
-----------
Initializes the DB connection with the given `db-port` property in the `args` object.

@param {Object} args
###
exports = module.exports = ( args ) =>
  if not @db
    #TODO we need to have a secure concept here, private keys per user
    #FIXME get rid of crpto
    if not args[ 'db-port' ]
      args[ 'db-port' ] = 6379
    @log = args.logger
    exports.eventPollers = new IndexedModules 'event-poller', @log
    exports.actionInvokers = new IndexedModules 'action-invoker', @log
    exports.initPort args[ 'db-port' ]

exports.getLogger = () =>
  @log 

exports.initPort = ( port ) =>
  @connRefused = false
  @db?.quit()
  @db = redis.createClient port,
    'localhost', { connect_timeout: 2000 }
  # Eventually we try to connect to the wrong port, redis will emit an error that we
  # need to catch and take into account when answering the isConnected function call
  @db.on 'error', ( err ) =>
    if err.message.indexOf( 'ECONNREFUSED' ) > -1
      @connRefused = true
      @log.error err, 'DB | Wrong port?'
  exports.eventPollers.setDB @db
  exports.actionInvokers.setDB @db

###
Checks whether the db is connected and passes either an error on failure after
ten attempts within five seconds, or nothing on success to the callback(err).

@public isConnected( *cb* )
@param {function} cb
###
exports.isConnected = ( cb ) =>
  if not @db
    cb new Error 'DB | DB initialization did not occur or failed miserably!'
  else
    if @db.connected
      cb()
    else
      numAttempts = 0
      fCheckConnection = =>
        if @connRefused
          @db?.quit()
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
    @db.rpush 'event_queue', JSON.stringify oEvent
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
      pcb err, JSON.parse obj 
  @db.lpop 'event_queue', makeObj cb


###
Purge the event queue.

@public purgeEventQueue()
###
exports.purgeEventQueue = () =>
  @db.del 'event_queue', replyHandler 'purging event queue'  


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


class IndexedModules
  constructor: ( @setname, @log ) ->
    @log.info "DB | (IdxedMods) Instantiated indexed modules for '#{ @setname }'"

  setDB: ( @db ) ->
    @log.info "DB | (IdxedMods) Registered new DB connection for '#{ @setname }'"

  ###
  Stores a module and links it to the user.
  
  @private storeModule( *userId, oModule* )
  @param {String} userId
  @param {object} oModule
  ###
  storeModule: ( userId, oModule ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.storeModule( #{ userId }, oModule )"
    @db.sadd "#{ @setname }s", oModule.id,
      replyHandler "sadd '#{ oModule.id }' to '#{ @setname }'"
    @db.hmset "#{ @setname }:#{ oModule.id }", oModule,
      replyHandler "hmset properties in hash '#{ @setname }:#{ oModule.id }'"
    @linkModule oModule.id, userId

  #TODO add testing
  linkModule: ( mId, userId ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.linkModule( #{ mId }, #{ userId } )"
    @db.sadd "#{ @setname }:#{ mId }:users", userId,
      replyHandler "sadd #{ userId } to '#{ @setname }:#{ mId }:users'"
    @db.sadd "user:#{ userId }:#{ @setname }s", mId,
      replyHandler "sadd #{ mId } to 'user:#{ userId }:#{ @setname }s'"

  #TODO add testing
  unlinkModule: ( mId, userId ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.unlinkModule( #{ mId }, #{ userId } )"
    @db.srem "#{ @setname }:#{ mId }:users", userId,
      replyHandler "srem #{ userId } from '#{ @setname }:#{ mId }:users'"
    @db.srem "user:#{ userId }:#{ @setname }s", mId,
      replyHandler "srem #{ mId } from 'user:#{ userId }:#{ @setname }s'"

  #TODO add testing
  publish: ( mId ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.publish( #{ mId } )"
    @db.sadd "public-#{ @setname }s", mId,
      replyHandler "sadd '#{ mId }' to 'public-#{ @setname }s'"

  #TODO add testing
  unpublish: ( mId ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.unpublish( #{ mId } )"
    @db.srem "public-#{ @setname }s", mId,
      replyHandler "srem '#{ mId }' from 'public-#{ @setname }s'"

  getModule: ( mId, cb ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.getModule( #{ mId } )"
    @db.hgetall "#{ @setname }:#{ mId }", cb

  #TODO add testing
  getModuleParams: ( mId, cb ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.getModuleParams( #{ mId } )"
    @db.hget "#{ @setname }:#{ mId }", "params", cb

  #TODO add testing
  getAvailableModuleIds: ( userId, cb ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.getPublicModuleIds( #{ userId } )"
    @db.sunion "public-#{ @setname }s", "user:#{ userId }:#{ @setname }s", cb

  getModuleIds: ( cb ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.getModuleIds()"
    @db.smembers "#{ @setname }s", cb

  getModules: ( cb ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.getModules()"
    getSetRecords "#{ @setname }s", @getModule, cb

  deleteModule: ( mId ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.deleteModule( #{ mId } )"
    @db.srem "#{ @setname }s", mId,
      replyHandler "srem '#{ mId }' from #{ @setname }s"
    @db.del "#{ @setname }:#{ mId }",
      replyHandler "del of '#{ @setname }:#{ mId }'"
    @unpublish mId
    @db.smembers "#{ @setname }:#{ mId }:users", ( err, obj ) =>
      @unlinkModule mId, userId for userId in obj
      @deleteUserParams mId, userId for userId in obj

  ###
  Stores user params for a module. They are expected to be RSA encrypted with helps of
  the provided cryptico JS library and will only be decrypted right before the module is loaded!
  
  @private storeUserParams( *mId, userId, encData* )
  @param {String} mId
  @param {String} userId
  @param {object} encData
  ###
  storeUserParams: ( mId, userId, encData ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.storeUserParams( #{ mId }, #{ userId }, encData )"
    @db.sadd "#{ @setname }-params", "#{ mId }:#{ userId }",
      replyHandler "sadd '#{ mId }:#{ userId }' to '#{ @setname }-params'"
    @db.set "#{ @setname }-params:#{ mId }:#{ userId }", encData,
      replyHandler "set user params in '#{ @setname }-params:#{ mId }:#{ userId }'"

  getUserParams: ( mId, userId, cb ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.getUserParams( #{ mId }, #{ userId } )"
    @db.get "#{ @setname }-params:#{ mId }:#{ userId }", cb

  getUserParamsIds: ( cb ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.getUserParamsIds()"
    @db.smembers "#{ @setname }-params", cb

  deleteUserParams: ( mId, userId ) =>
    @log.info "DB | (IdxedMods) #{ @setname }.deleteUserParams(#{ mId }, #{ userId } )"
    @db.srem "#{ @setname }-params", "#{ mId }:#{ userId }",
      replyHandler "srem '#{ mId }:#{ userId }' from '#{ @setname }-params'"
    @db.del "#{ @setname }-params:#{ mId }:#{ userId }",
      replyHandler "del '#{ @setname }-params:#{ mId }:#{ userId }'"


###
## Rules
###


###
Appends a log entry.

@public log( *userId, ruleId, message* )
@param {String} userId
@param {String} ruleId
@param {String} message
###
exports.appendLog = ( userId, ruleId, moduleId, message ) =>
  @db.append "#{ userId }:#{ ruleId }:log", 
    "[#{ ( new Date ).toISOString() }] {#{ moduleId }} #{ message }\n"

###
Retrieves a log entry.

@public getLog( *userId, ruleId* )
@param {String} userId
@param {String} ruleId
@param {function} cb
###
exports.getLog = ( userId, ruleId, cb ) =>
  @db.get "#{ userId }:#{ ruleId }:log", cb

###
Resets a log entry.

@public resetLog( *userId, ruleId* )
@param {String} userId
@param {String} ruleId
###
exports.resetLog = ( userId, ruleId ) =>
  @db.del "#{ userId }:#{ ruleId }:log", 
    replyHandler "del '#{ userId }:#{ ruleId }:log'"

###
Query the DB for a rule and pass it to cb(err, obj).

@public getRule( *ruleId, cb* )
@param {String} ruleId
@param {function} cb
###
exports.getRule = ( ruleId, cb ) =>
  @log.info "DB | get: 'rule:#{ ruleId }'"
  @db.get "rule:#{ ruleId }", cb

###
Fetch all rules and pass them to cb(err, obj).  

@public getRules( *cb* )
@param {function} cb
###
exports.getRules = ( cb ) =>
  @log.info "DB | Fetching all Rules: getSetRecords 'rules'"
  getSetRecords 'rules', exports.getRule, cb

###
Fetch all rule IDs and hand it to cb(err, obj).

@public getRuleIds( *cb* )
@param {function} cb
###
exports.getRuleIds = ( cb ) =>
  @log.info "DB | Fetching all Rule IDs: 'rules'"
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
    replyHandler "sadd rules: '#{ ruleId }'"
  @db.set "rule:#{ ruleId }", data,
    replyHandler "set 'rule:#{ ruleId }': data"

###
Delete a string representation of a rule.

@public deleteRule( *ruleId, userId* )
@param {String} ruleId
@param {String} userId
###
exports.deleteRule = ( ruleId ) =>
  @log.info "DB | deleteRule: '#{ ruleId }'"
  @db.srem "rules", ruleId, replyHandler "srem 'rules': '#{ ruleId }'"
  @db.del "rule:#{ ruleId }", replyHandler "del: 'rule:#{ ruleId }'"

  # We also need to delete all references in linked and active users
  @db.smembers "rule:#{ ruleId }:users", ( err, obj ) =>
    delLinkedUserRule = ( userId ) =>
      exports.resetLog userId, ruleId
      @db.srem "user:#{ userId }:rules", ruleId,
        replyHandler "srem 'user:#{ userId }:rules': '#{ ruleId }'"
    delLinkedUserRule id  for id in obj
  @db.del "rule:#{ ruleId }:users", replyHandler "del 'rule:#{ ruleId }:users'"

  @db.smembers "rule:#{ ruleId }:active-users", ( err, obj ) =>
    delActiveUserRule = ( userId ) =>
      @db.srem "user:#{ userId }:active-rules", ruleId,
        replyHandler "srem 'user:#{ userId }:active-rules': '#{ ruleId }'"
    delActiveUserRule id  for id in obj
  @db.del "rule:#{ ruleId }:active-users", 
    replyHandler "del 'rule:#{ ruleId }:active-users'"

###
Associate a rule to a user.

@public linkRule( *ruleId, userId* )
@param {String} ruleId
@param {String} userId
###
exports.linkRule = ( ruleId, userId ) =>
  @log.info "DB | linkRule: '#{ ruleId }' to user '#{ userId }'"
  @db.sadd "rule:#{ ruleId }:users", userId,
    replyHandler "sadd 'rule:#{ ruleId }:users': '#{ userId }'"
  @db.sadd "user:#{ userId }:rules", ruleId,
    replyHandler "sadd 'user:#{ userId }:rules': '#{ ruleId }'"

###
Get rules linked to a user and hand it to cb(err, obj).

@public getUserLinkRule( *userId, cb* )
@param {String} userId
@param {function} cb
###
exports.getUserLinkedRules = ( userId, cb ) =>
  @log.info "DB | getUserLinkedRules: 'user:#{ userId }:rules'"
  @db.smembers "user:#{ userId }:rules", cb

###
Get users linked to a rule and hand it to cb(err, obj).

@public getRuleLinkedUsers( *ruleId, cb* )
@param {String} ruleId
@param {function} cb
###
exports.getRuleLinkedUsers = ( ruleId, cb ) =>
  @log.info "DB | getRuleLinkedUsers: 'rule:#{ ruleId }:users'"
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
    replyHandler "srem 'rule:#{ ruleId }:users': '#{ userId }'"
  @db.srem "user:#{ userId }:rules", ruleId,
    replyHandler "srem 'user:#{ userId }:rules': '#{ ruleId }'"

###
Activate a rule.

@public activateRule( *ruleId, userId* )
@param {String} ruleId
@param {String} userId
###
exports.activateRule = ( ruleId, userId ) =>
  @log.info "DB | activateRule: '#{ ruleId }' for '#{ userId }'"
  @db.sadd "rule:#{ ruleId }:active-users", userId,
    replyHandler "sadd 'rule:#{ ruleId }:active-users': '#{ userId }'"
  @db.sadd "user:#{ userId }:active-rules", ruleId,
    replyHandler "sadd 'user:#{ userId }:active-rules': '#{ ruleId }'"

###
Get rules activated for a user and hand it to cb(err, obj).

@public getUserLinkRule( *userId, cb* )
@param {String} userId
@param {function} cb
###
exports.getUserActivatedRules = ( userId, cb ) =>
  @log.info "DB | getUserActivatedRules: smembers 'user:#{ userId }:active-rules'"
  @db.smembers "user:#{ userId }:active-rules", cb

###
Get users activated for a rule and hand it to cb(err, obj).

@public getRuleActivatedUsers ( *ruleId, cb* )
@param {String} ruleId
@param {function} cb
###
exports.getRuleActivatedUsers = ( ruleId, cb ) =>
  @log.info "DB | getRuleActivatedUsers: smembers 'rule:#{ ruleId }:active-users'"
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
    replyHandler "srem 'rule:#{ ruleId }:active-users': '#{ userId }'"
  @db.srem "user:#{ userId }:active-rules", ruleId,
    replyHandler "srem 'user:#{ userId }:active-rules' '#{ ruleId }'"

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
        if pw is obj.password
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
exports.shutDown = () =>
  @db?.quit()
  # @db?.end()
