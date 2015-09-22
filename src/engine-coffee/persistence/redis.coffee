###

Redis Persistence
=================
> Handles the connection to the Redis database and provides functionalities for event triggers,
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

###

# **Loads Modules:**

# - [Logging](logging.html)
log = require '../logging'

# - External Modules:
#   [redis](https://github.com/mranney/node_redis)
redis = require 'redis'

###
Module call
-----------
Initializes the DB connection with the given `db-port` property in the `args` object.

@param {Object} args
###
exports = module.exports

exports.init = ( oConf ) =>
	log.info 'DB:REDIS | INIT'
	if not @db
		#TODO we need to have a secure concept here, private keys per user
		exports.eventTriggers = new IndexedModules 'event-trigger', log
		exports.actionDispatchers = new IndexedModules 'action-dispatcher', log

		@connRefused = false
		@db?.quit()
		@db = redis.createClient oConf.port,
			'localhost', { connect_timeout: 2000 }
		# Eventually we try to connect to the wrong port, redis will emit an error that we
		# need to catch and take into account when answering the isConnected function call
		@db.on 'error', ( err ) =>
			if err.message.indexOf( 'ECONNREFUSED' ) > -1
				@connRefused = true
				log.warn 'DB:REDIS§ | Wrong port?'
			else
				log.error err
		
		exports.eventTriggers.setDB @db
		exports.actionDispatchers.setDB @db
		# exports.selectDatabase oConf.db

exports.selectDatabase = ( id ) =>
	log.info 'DB:REDIS | SELECT DB: ' + id
	@db.select id

###
Checks whether the db is connected and passes either an error on failure after
ten attempts within five seconds, or nothing on success to the callback(err).

@public isConnected( *cb* )
@param {function} cb
###
exports.isConnected = ( cb ) =>
	if not @db
		cb new Error 'DB:REDIS | DB initialization did not occur or failed miserably!'
	else
		if @db.connected
			cb()
		else
			numAttempts = 0
			fCheckConnection = =>
				if @connRefused
					@db?.quit()
					cb new Error 'DB:REDIS | Connection refused! Wrong port?'
				else
					if @db.connected
						log.info 'DB:REDIS | Successfully connected to DB!'
						cb()
					else if numAttempts++ < 10
						setTimeout fCheckConnection, 100
					else
						cb new Error 'DB:REDIS | Connection to DB failed!'
			setTimeout fCheckConnection, 100


###
Abstracts logging for simple action replies from the DB.

@private replyHandler( *action* )
@param {String} action
###
replyHandler = ( action ) =>
	( err, reply ) =>
		if err
			log.warn err, "during '#{ action }'"
		else
			log.info "DB:REDIS | #{ action }: #{ reply }"

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
	log.info "DB:REDIS | Fetching set records: '#{ set }'"
	# Fetch all members of the set
	@db.smembers set, ( err, arrReply ) =>
		if err
			# If an error happens we return it to the callback function
			log.warn err, "DB:REDIS | fetching '#{ set }'"
			cb err
		else if arrReply.length is 0
			# If the set was empty we return an empty array to the callback
			cb null, []
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
						log.warn err, "DB:REDIS | fetching single element: '#{ prop }'"
					else if not data
						# There was no data behind the key
						log.warn "Empty key in set '#{set}' DB: '#{prop}'"
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
	constructor: ( @setname, log ) ->
		log.info "DB:REDIS | (IdxedMods) Instantiated indexed modules for '#{ @setname }'"

	setDB: ( @db ) ->
		log.info "DB:REDIS | (IdxedMods) Registered new DB connection for '#{ @setname }'"

	###
	Stores a module and links it to the user.
	
	@private storeModule( *userId, oModule* )
	@param {String} userId
	@param {object} oModule
	###
	storeModule: ( userId, oModule ) =>
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.storeModule( #{ userId }, oModule )"
		# @db.sadd "user:#{ userId }:#{ @setname }s", oModule.id,
		# 	replyHandler "sadd 'user:#{ userId }:#{ @setname }s' -> #{ oModule.id }"
		# @db.hmset "user:#{ userId }:#{ @setname }:#{ oModule.id }", oModule,
		# 	replyHandler "hmset 'user:#{ userId }:#{ @setname }:#{ oModule.id }' -> [oModule]"
		@db.sadd "#{ @setname }s", oModule.id,
			replyHandler "sadd '#{ @setname }s' -> #{ oModule.id }"
		@db.hmset "#{ @setname }:#{ oModule.id }", oModule,
			replyHandler "hmset '#{ @setname }:#{ oModule.id }' -> [oModule]"

	getModule: ( userId, mId, cb ) =>
		# log.info "DB:REDIS | (IdxedMods) #{ @setname }.getModule( #{ userId }, #{ mId } )"
		# log.info "hgetall user:#{ userId }:#{ @setname }:#{ mId }"
		# @db.hgetall "user:#{ userId }:#{ @setname }:#{ mId }", cb
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.getModule( #{ userId }, #{ mId } )"
		log.info "hgetall #{ @setname }:#{ mId }"
		@db.hgetall "#{ @setname }:#{ mId }", cb

	getAllModules: (userId, cb) =>
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.getAllModules( #{ userId } )"
		gM = (mId) ->
			getModule userId, mId, cb
		getSetRecords "#{ @setname }s", gM, cb

	getModuleField: ( userId, mId, field, cb ) =>
		# log.info "DB:REDIS | (IdxedMods) #{ @setname }.getModuleField( #{ userId }, #{ mId }, #{ field } )"
		# @db.hget "user:#{ userId }:#{ @setname }:#{ mId }", field, cb
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.getModuleField( #{ userId }, #{ mId }, #{ field } )"
		@db.hget "#{ @setname }:#{ mId }", field, cb

	#TODO add testing
	getAvailableModuleIds: ( userId, cb ) =>
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.getAvailableModuleIds( #{ userId } )"
		# @db.sunion "public-#{ @setname }s", "user:#{ userId }:#{ @setname }s", cb
		@db.sunion "public-#{ @setname }s", "#{ @setname }s", cb

	getModuleIds: ( userId, cb ) =>
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.getModuleIds()"
		# @db.smembers "user:#{ userId }:#{ @setname }s", cb
		@db.smembers "#{ @setname }s", cb

	deleteModule: ( userId, mId ) =>
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.deleteModule( #{ userId }, #{ mId } )"
		# @db.srem "user:#{ userId }:#{ @setname }s", mId,
		# 	replyHandler "srem 'user:#{ userId }:#{ @setname }s' -> '#{ mId }'"
		# @db.del "user:#{ userId }:#{ @setname }:#{ mId }",
		# 	replyHandler "del 'user:#{ userId }:#{ @setname }:#{ mId }'"
		@db.srem "#{ @setname }s", mId,
			replyHandler "srem '#{ @setname }s' -> '#{ mId }'"
		@db.del "#{ @setname }:#{ mId }",
			replyHandler "del '#{ @setname }:#{ mId }'"
		@deleteUserParams mId, userId
		exports.getRuleIds userId, ( err, obj ) =>
			for rule in obj
				@getUserArgumentsFunctions userId, rule, mId, ( err, obj ) =>
					@deleteUserArguments userId, rule, mId

	###
	Stores user params for a module. They are expected to be RSA encrypted with helps of
	the provided cryptico JS library and will only be decrypted right before the module is loaded!
	
	@private storeUserParams( *mId, userId, encData* )
	@param {String} mId
	@param {String} userId
	@param {object} encData
	###
	storeUserParams: ( mId, userId, encData ) =>
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.storeUserParams( #{ mId }, #{ userId }, encData )"
		@db.sadd "#{ @setname }-params", "#{ mId }:#{ userId }",
			replyHandler "sadd '#{ @setname }-params' -> '#{ mId }:#{ userId }'"
		@db.set "#{ @setname }-params:#{ mId }:#{ userId }", encData,
			replyHandler "set '#{ @setname }-params:#{ mId }:#{ userId }' -> [encData]"

	getUserParams: ( mId, userId, cb ) =>
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.getUserParams( #{ mId }, #{ userId } )"
		@db.get "#{ @setname }-params:#{ mId }:#{ userId }", cb

	getUserParamsIds: ( cb ) =>
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.getUserParamsIds()"
		@db.smembers "#{ @setname }-params", cb

	deleteUserParams: ( mId, userId ) =>
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.deleteUserParams( #{ mId }, #{ userId } )"
		@db.srem "#{ @setname }-params", "#{ mId }:#{ userId }",
			replyHandler "srem '#{ @setname }-params' -> '#{ mId }:#{ userId }'"
		@db.del "#{ @setname }-params:#{ mId }:#{ userId }",
			replyHandler "del '#{ @setname }-params:#{ mId }:#{ userId }'"

	###
	Stores user arguments for a function within a module. They are expected to be RSA encrypted with helps of
	the provided cryptico JS library and will only be decrypted right before the module is loaded!
	
	@private storeUserArguments( *userId, ruleId, mId, funcId, encData* )
	###
	storeUserArguments: ( userId, ruleId, mId, funcId, encData ) =>
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.storeUserArguments( #{ userId }, #{ ruleId }, #{ mId }, #{ funcId }, encData )"
		@db.sadd "#{ @setname }:#{ userId }:#{ ruleId }:#{ mId }:functions", funcId,
			replyHandler "sadd '#{ @setname }:#{ userId }:#{ ruleId }:#{ mId }:functions' -> '#{ funcId }'"
		@db.set "#{ @setname }:#{ userId }:#{ ruleId }:#{ mId }:function:#{ funcId }", encData,
			replyHandler "set '#{ @setname }:#{ userId }:#{ ruleId }:#{ mId }:function:#{ funcId }' -> [encData]"

	getUserArgumentsFunctions: ( userId, ruleId, mId, cb ) =>
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.getUserArgumentsFunctions( #{ userId }, #{ ruleId }, #{ mId } )"
		@db.get "#{ @setname }:#{ userId }:#{ ruleId }:#{ mId }:functions", cb

	getAllModuleUserArguments: ( userId, ruleId, mId, cb ) =>
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.getAllModuleUserArguments( #{ userId }, #{ ruleId }, #{ mId } )"
		@db.smembers "#{ @setname }:#{ userId }:#{ ruleId }:#{ mId }:functions", ( err, obj ) =>
			sem = obj.length
			oAnswer = {}
			if sem is 0
				cb null, oAnswer
			else
				for func in obj
					fRegisterFunction = ( func ) =>
						( err, obj ) =>
							if obj
								oAnswer[ func ] = obj
							if --sem is 0
								cb null, oAnswer
					@db.get "#{ @setname }:#{ userId }:#{ ruleId }:#{ mId }:function:#{ func }", fRegisterFunction func

	getUserArguments: ( userId, ruleId, mId, funcId, cb ) =>
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.getUserArguments( #{ userId }, #{ ruleId }, #{ mId }, #{ funcId } )"
		@db.get "#{ @setname }:#{ userId }:#{ ruleId }:#{ mId }:function:#{ funcId }", cb

	deleteUserArguments: ( userId, ruleId, mId ) =>
		log.info "DB:REDIS | (IdxedMods) #{ @setname }.deleteUserArguments( #{ userId }, #{ ruleId }, #{ mId } )"
		@db.smembers "#{ @setname }:#{ userId }:#{ ruleId }:#{ mId }:functions", ( err, obj ) =>
			for func in obj
				@db.del "#{ @setname }:#{ userId }:#{ ruleId }:#{ mId }:function:#{ func }",
					replyHandler "del '#{ @setname }:#{ userId }:#{ ruleId }:#{ mId }:function:#{ func }'"


###
## Rules
###


# ###
# Stores data for a module in a rule. This is used to allow persistance for moduöes in rules.

# @public log( *userId, ruleId, moduleId, field, data* )
# @param {String} userId
# @param {String} ruleId
# @param {String} moduleId
# @param {String} field
# @param {String} data
# ###
# exports.persistSetVar = ( userId, ruleId, moduleId, field, data ) =>
# 	@db.hmset "rulepersistence:#{ userId }:#{ ruleId }:#{ moduleId }", field, data,
# 		replyHandler "hmset 'rulepersistence:#{ userId }:#{ ruleId }:#{ moduleId }' -> #{ field } = [data]"


# ###
# Gets data for a module in a rule.

# @public log( *userId, ruleId, moduleId, field, cb* )
# @param {String} userId
# @param {String} ruleId
# @param {String} moduleId
# @param {String} field
# @param {function} cb
# ###
# exports.persistGetVar = ( userId, ruleId, moduleId, field, cb ) =>
# 	@db.hget "rulepersistence:#{ userId }:#{ ruleId }:#{ moduleId }", field, cb


###
Appends a log entry.

@public log( *userId, ruleId, moduleId, message* )
###
exports.logRule = ( userId, ruleId, moduleId, message ) =>
	@db.append "#{ userId }:#{ ruleId }:log", 
		"[UTC|#{ ( new Date() ).toISOString() }] {#{ moduleId }} #{ message.substring( 0, 500 ) }\n"

# Purge Logs
exports.logPoller = ( userId, moduleId, message ) =>
	@db.append "#{ userId }:poller:#{ moduleId }:log", 
		"[UTC|#{ ( new Date() ).toISOString() }] {#{ moduleId }} #{ message.substring( 0, 500 ) }\n"

###
Retrieves a log entry.

@public getLog( *userId, ruleId, cb* )
###
exports.getLog = ( userId, ruleId, cb ) =>
	@db.get "#{ userId }:#{ ruleId }:log", cb

###
Resets a log entry.
###
exports.resetLog = ( userId, ruleId ) =>
	@db.del "#{ userId }:#{ ruleId }:log", 
		replyHandler "del '#{ userId }:#{ ruleId }:log'"

###
Query the DB for a rule and pass it to cb(err, obj).
###
exports.getRule = ( userId, ruleId, cb ) =>
	log.info "DB:REDIS | getRule( '#{ userId }', '#{ ruleId }' )"
	@db.get "user:#{ userId }:rule:#{ ruleId }", cb

###
Query the DB for a rule and pass it to cb(err, obj).
###
exports.getAllRules = ( userId, cb ) =>
	log.info "DB:REDIS | getAllRules( '#{ userId }' )"
	# Attention! This is a nested callback hell! be cautious!
	getUserRule = ( ruleId, inCb ) ->
		exports.getRule userId, ruleId, inCb
	getSetRecords "user:#{ userId }:rules", getUserRule, cb

###
Store a string representation of a rule in the DB.
###
exports.storeRule = ( userId, ruleId, data ) =>
	log.info "DB:REDIS | storeRule( '#{ userId }', '#{ ruleId }' )"
	@db.sadd "user:#{ userId }:rules", "#{ ruleId }",
		replyHandler "sadd 'user:#{ userId }:rules' -> '#{ ruleId }'"
	@db.set "user:#{ userId }:rule:#{ ruleId }", data,
		replyHandler "set 'user:#{ userId }:rule:#{ ruleId }' -> [data]"

###
Returns all existing rule ID's for a user
###
exports.getRuleIds = ( userId, cb ) =>
	log.info "DB:REDIS | getRuleIds( '#{ userId }' )"
	@db.smembers "user:#{ userId }:rules", cb

###
Delete a string representation of a rule.
###
exports.deleteRule = ( userId, ruleId ) =>
	log.info "DB:REDIS | deleteRule( '#{ userId }', '#{ ruleId }' )"
	@db.srem "user:#{ userId }:rules", ruleId,
		replyHandler "srem 'user:#{ userId }:rules' -> '#{ ruleId }'"
	@db.del "user:#{ userId }:rule:#{ ruleId }",
		replyHandler "del 'user:#{ userId }:rule:#{ ruleId }'"
	#TODO remove module links and params and arguments
	

# ###
# Activate a rule.
# ###
# exports.activateRule = ( ruleId, userId ) =>
# 	log.info "DB:REDIS | activateRule: '#{ ruleId }' for '#{ userId }'"
# 	@db.sadd "rule:#{ ruleId }:active-users", userId,
# 		replyHandler "sadd 'rule:#{ ruleId }:active-users' -> '#{ userId }'"
# 	@db.sadd "user:#{ userId }:active-rules", ruleId,
# 		replyHandler "sadd 'user:#{ userId }:active-rules' -> '#{ ruleId }'"


# ###
# Deactivate a rule.
# ###
# exports.deactivateRule = ( ruleId, userId ) =>
# 	log.info "DB:REDIS | deactivateRule: '#{ ruleId }' for '#{ userId }'"
# 	@db.srem "rule:#{ ruleId }:active-users", userId,
# 		replyHandler "srem 'rule:#{ ruleId }:active-users' -> '#{ userId }'"
# 	@db.srem "user:#{ userId }:active-rules", ruleId,
# 		replyHandler "srem 'user:#{ userId }:active-rules' '#{ ruleId }'"

###
Fetch all active ruleIds and pass them to cb(err, obj).

@public getAllActivatedRuleIds( *cb* )
@param {function} cb
###
# TODO we should add an active flag to rules
exports.getAllActivatedRuleIdsPerUser = ( cb ) =>
	log.info "DB:REDIS | Fetching all active rules"
	@db.smembers 'users', ( err, obj ) =>
		result = {}
		if obj.length is 0
			cb null, result
		else
			semaphore = obj.length
			for user in obj
				fProcessAnswer = ( user ) ->
					( err, obj ) =>
						if obj.length > 0
							result[user] = obj
						if --semaphore is 0
							cb null, result
				@db.smembers "user:#{ user }:rules", fProcessAnswer user 

###
## Users
###

###
Store a user object (needs to be a flat structure).
The password should be hashed before it is passed to this function.

@public storeUser( *objUser* )
###
exports.storeUser = ( objUser ) =>
	log.info "DB:REDIS | storeUser: '#{ objUser.username }'"
	if objUser and objUser.username and objUser.password
		@db.sadd 'users', objUser.username,
			replyHandler "sadd 'users' -> '#{ objUser.username }'"
		@db.hmset "user:#{ objUser.username }", objUser,
			replyHandler "hmset 'user:#{ objUser.username }' -> [objUser]"
		true
	else
		log.warn new Error 'DB:REDIS | username or password was missing'
		false

###
Fetch all user IDs and pass them to cb(err, obj).

@public getUserIds( *cb* )
###
exports.getUserIds = ( cb ) =>
	log.info "DB:REDIS | getUserIds"
	@db.smembers "users", cb
	
###
Fetch all user IDs and pass them to cb(err, obj).

@public getUserIds( *cb* )
###

exports.getAllUsers = ( cb ) =>
	getSetRecords "users", exports.getUser, ( err, arrDat ) ->
		if err
			cb err
		else
			delete oUser.password for name, oUser of arrDat
			cb null, arrDat
	
###
Fetch a user by id and pass it to cb(err, obj).

@public getUser( *userId, cb* )
###
exports.getUser = ( userId, cb ) =>
	log.info "DB:REDIS | getUser: '#{ userId }'"
	@db.hgetall "user:#{ userId }", cb
	
###
Deletes a user and all his associated linked and active rules.

@public deleteUser( *userId* )
###
exports.deleteUser = ( userId ) =>
	log.info "DB:REDIS | deleteUser: '#{ userId }'"
	@db.srem "users", userId, replyHandler "srem 'users' -> '#{ userId }'"
	@db.del "user:#{ userId }", replyHandler "del 'user:#{ userId }'"

	# We also need to delete all linked rules
	@db.smembers "user:#{ userId }:rules", ( err, obj ) =>
		delLinkedRuleUser = ( ruleId ) =>
			@db.srem "rule:#{ ruleId }:users", userId,
				replyHandler "srem 'rule:#{ ruleId }:users' -> '#{ userId }'"
		delLinkedRuleUser id for id in obj
	@db.del "user:#{ userId }:rules",
		replyHandler "del 'user:#{ userId }:rules'"

	# We also need to delete all active rules
	@db.smembers "user:#{ userId }:active-rules", ( err, obj ) =>
		delActivatedRuleUser = ( ruleId ) =>
			@db.srem "rule:#{ ruleId }:active-users", userId,
				replyHandler "srem 'rule:#{ ruleId }:active-users' -> '#{ userId }'"
		delActivatedRuleUser id for id in obj
	@db.del "user:#{ userId }:active-rules",
		replyHandler "del user:#{ userId }:active-rules"

	# TODO we also need to delete this user's modules and stop them from running!

###
Checks the credentials and on success returns the user object to the
callback(err, obj) function. The password has to be hashed (SHA-3-512)
beforehand by the instance closest to the user that enters the password,
because we only store hashes of passwords for security reasons.

@public loginUser( *userId, password, cb* )
###
exports.loginUser = ( userId, password, cb ) =>
	log.info "DB:REDIS | User '#{ userId }' tries to log in"
	fCheck = ( pw ) =>
		( err, obj ) =>
			if err 
				cb err, null
			else if obj and obj.password
				if pw is obj.password
					log.info "DB:REDIS | User '#{ obj.username }' logged in!" 
					cb null, obj
				else
					cb (new Error 'Wrong credentials!'), null
			else
				cb (new Error 'User not found!'), null
	@db.hgetall "user:#{ userId }", fCheck password

###
TODO: user should be able to select whether the events being sent to the webhook are available to all.
private events need only to be checked against the user's rules
###

###
Stores a webhook.
###
exports.createWebhook = ( username, hookid, hookname, isPublic ) =>
	@db.sadd "webhooks", hookid, replyHandler "sadd 'webhooks' -> '#{ hookid }'"
	@db.sadd "user:#{ username }:webhooks", hookid,
		replyHandler "sadd 'user:#{ username }:webhooks' -> '#{ hookid }'"
	if isPublic
		@db.sadd "webhooks:public", hookid, replyHandler "sadd 'webhooks:public' -> '#{ hookid }'"
	@db.hmset "webhook:#{ hookid }", 'hookname', hookname, 'username', username, 'isPublic', isPublic,
		replyHandler "set webhook:#{ hookid } -> [#{ hookname }, #{ username }]"

###
Returns a webhook name.
###
exports.getWebhookName = ( hookid, cb ) =>
	@db.hget "webhook:#{ hookid }", "hookname", cb

###
Returns all webhook properties.
###
exports.getFullWebhook = ( hookid, cb ) =>
	@db.hgetall "webhook:#{ hookid }", cb

###
Returns all the user's webhooks by ID.
###
exports.getUserWebhookIDs = ( username, cb ) =>
	@db.smembers "user:#{ username }:webhooks", cb

###
Gets all the user's webhooks with names.
###
exports.getAllUserWebhooks = ( username, cb ) =>
	getSetRecords "user:#{ username }:webhooks", exports.getFullWebhook, cb

###
Gets all the user's visible webhooks with names.
###
exports.getAllVisibleWebhooks = ( username, cb ) =>
	getSetRecords "user:#{ username }:webhooks", exports.getFullWebhook, (err, oHooks) ->
		if err then cb err
		else
			getSetRecords "webhooks:public", exports.getFullWebhook, (err, oPubHooks) ->
				if oPubHooks
					delete oPubHooks[id] for id of oHooks
				cb err,
					private: oHooks
					public: oPubHooks

###
Returns all webhook IDs. Can be used to check for existing webhooks.
###
exports.getAllWebhookIDs = ( cb ) =>
	@db.smembers "webhooks", cb

###
Returns all webhooks with names.
###
exports.getAllWebhooks = ( cb ) =>
	getSetRecords "webhooks", exports.getFullWebhook, cb

###
Delete a webhook.
###
exports.deleteWebhook = ( username, hookid, cb ) =>
	db = @db #OMFG coffeescript... :-X
	db.sismember "user:#{ username }:webhooks", hookid, (err, isUsersHook) ->
		if isUsersHook
			db.srem "webhooks", hookid, replyHandler "srem 'webhooks' -> '#{ hookid }'"
			db.srem "webhooks:public", hookid, replyHandler "srem 'webhooks:public' -> '#{ hookid }'"
			db.srem "user:#{ username }:webhooks", hookid,
				replyHandler "srem 'user:#{ username }:webhooks' -> '#{ hookid }'"
			db.del "webhook:#{ hookid }", replyHandler "del webhook:#{ hookid }"
			cb null, 'Deleted'
		else
			cb 'This is not your webhook!'

###
Shuts down the db link.

@public shutDown()
###
exports.shutDown = () =>
	@db?.quit()
	# @db?.end()
