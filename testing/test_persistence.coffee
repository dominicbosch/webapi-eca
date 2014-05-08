fs = require 'fs'
path = require 'path'
try
	data = fs.readFileSync path.resolve( 'testing', 'files', 'testObjects.json' ), 'utf8'
	try
		objects = JSON.parse data
	catch err
		console.log 'Error parsing standard objects file: ' + err.message
catch err
	console.log 'Error fetching standard objects file: ' + err.message

logger = require path.join '..', 'js', 'logging'
log = logger.getLogger
	nolog: true
db = require path.join '..', 'js', 'persistence'
opts =
	logger: log
opts[ 'db-port' ] = 6379
db opts


oEvtOne = objects.events.eventOne
oEvtTwo = objects.events.eventTwo
oUser = objects.users.userOne
oEpOne = objects.eps.epOne
oEpTwo = objects.eps.epTwo
oRuleOne = objects.rules.ruleOne
oRuleTwo = objects.rules.ruleTwo

exports.tearDown = ( cb ) ->
	db.deleteUser oUser.username
	db.deleteRole 'tester'
	setTimeout cb, 100

###
# Test AVAILABILITY
###
exports.Availability =
	testRequire: ( test ) ->
		test.expect 1
		test.ok db, 'DB interface loaded'
		test.done()

	testConnect: ( test ) ->
		test.expect 1
		db.isConnected ( err ) ->
			test.ifError err, 'Connection failed!'
			test.done()

	# We cannot test for no db-port, since node-redis then assumes standard port
	testWrongDbPort: ( test ) ->
		test.expect 1
		 
		db.initPort 13410
		db.isConnected ( err ) ->
			test.ok err, 'Still connected!?'
			db.initPort 6379
			test.done()

	testPurgeQueue: ( test ) ->
		test.expect 2

		db.pushEvent oEvtOne
		db.purgeEventQueue()
		db.popEvent ( err, obj ) ->
			test.ifError err, 'Error during pop after purging!'
			test.strictEqual obj, null, 'There was an event in the queue!?'
			test.done()

###
# Test EVENT QUEUE
###
exports.EventQueue =

	testEmptyPopping: ( test ) ->
		test.expect 2
		
		db.purgeEventQueue()
		db.popEvent ( err, obj ) ->
			test.ifError err,
				'Error during pop after purging!'
			test.strictEqual obj, null,
				'There was an event in the queue!?'
			test.done()

	testEmptyPushing: ( test ) ->
		test.expect 2

		db.pushEvent null
		db.popEvent ( err, obj ) ->
			test.ifError err,
				'Error during non-empty pushing!'
			test.strictEqual obj, null,
				'There was an event in the queue!?'
			
			test.done()

	testNonEmptyPopping: ( test ) ->
		test.expect 3

		db.pushEvent oEvtOne
		db.popEvent ( err, obj ) ->
			test.ifError err,
				'Error during non-empty popping!'
			test.notStrictEqual obj, null,
				'There was no event in the queue!'
			test.deepEqual oEvtOne, obj,
				'Wrong event in queue!'
			
			test.done()

	testMultiplePushAndPops: ( test ) ->
		test.expect 6

		semaphore = 2
		forkEnds = () ->
			if --semaphore is 0
				
				test.done()

		db.pushEvent oEvtOne
		db.pushEvent oEvtTwo
		# eventually it would be wise to not care about the order of events
		db.popEvent ( err, obj ) ->
			test.ifError err,
				'Error during multiple push and pop!'
			test.notStrictEqual obj, null,
				'There was no event in the queue!'
			test.deepEqual oEvtOne, obj,
				'Wrong event in queue!'
			forkEnds()
		db.popEvent ( err, obj ) ->
			test.ifError err,
				'Error during multiple push and pop!'
			test.notStrictEqual obj, null,
				'There was no event in the queue!'
			test.deepEqual oEvtTwo, obj,
				'Wrong event in queue!'
			forkEnds()


###
# Test Indexed Module from persistence. Testing only Event Poller is sufficient
# since Action Invoker uses the same class
###
exports.EventPoller =
 
	tearDown: ( cb ) ->
		db.eventPollers.deleteModule oUser.username, oEpOne.id
		db.eventPollers.deleteModule oUser.username, oEpTwo.id
		cb()

	testCreateAndRead: ( test ) ->
		test.expect 2
		db.eventPollers.storeModule oUser.username, oEpOne
		
				# test that the ID shows up in the set
		db.eventPollers.getModuleIds oUser.username, ( err , obj ) ->
			test.ok oEpOne.id in obj,
				'Expected key not in event-pollers set'
			
			# the retrieved object really is the one we expected
			db.eventPollers.getModule oUser.username, oEpOne.id, ( err , obj ) ->
				test.deepEqual obj, oEpOne,
					'Retrieved Event Poller is not what we expected'
				
				# # Ensure the event poller is in the list of all existing ones
				# db.eventPollers.getModules oUser.username, ( err , obj ) ->
				# 	test.deepEqual oEpOne, obj[oEpOne.id],
				# 		'Event Poller ist not in result set'
				test.done()
					
	testUpdate: ( test ) ->
		test.expect 1

		oTmp = {}
		oTmp[key] = val for key, val of oEpOne
		oTmp.public = 'true'

		# store an entry to start with 
		db.eventPollers.storeModule oUser.username, oEpOne
		db.eventPollers.storeModule oUser.username, oTmp

		# the retrieved object really is the one we expected
		db.eventPollers.getModule oUser.username, oEpOne.id, ( err , obj ) ->
			test.deepEqual obj, oTmp,
				'Retrieved Event Poller is not what we expected'
				
			# # Ensure the event poller is in the list of all existing ones
			# db.eventPollers.getModules oUser.username, ( err , obj ) ->
			# 	test.deepEqual oTmp, obj[oEpOne.id],
			# 		'Event Poller ist not in result set'
				
			test.done()

	testDelete: ( test ) ->
		test.expect 2

		# store an entry to start with 
		db.eventPollers.storeModule oUser.username, oEpOne

		# Ensure the event poller has been deleted
		db.eventPollers.deleteModule oUser.username, oEpOne.id
		db.eventPollers.getModule oUser.username, oEpOne.id, ( err , obj ) ->
			test.strictEqual obj, null,
				'Event Poller still exists'
			
			# Ensure the ID has been removed from the set
			db.eventPollers.getModuleIds oUser.username, ( err , obj ) ->
				test.ok oEpOne.id not in obj,
					'Event Poller key still exists in set'
				
				test.done()
	

	testFetchSeveral: ( test ) ->
		test.expect 3
		semaphore = 2

		fCheckInvoker = ( modname, mod ) ->
			myTest = test
			forkEnds = () ->
				if --semaphore is 0
					
					myTest.done()
			( err, obj ) ->
				myTest.deepEqual mod, obj,
					"Invoker #{ modname } does not equal the expected one"
				forkEnds()

		db.eventPollers.storeModule oUser.username, oEpOne
		db.eventPollers.storeModule oUser.username, oEpTwo
		db.eventPollers.getModuleIds oUser.username, ( err, obj ) ->
			test.ok oEpOne.id in obj and oEpTwo.id in obj,
				'Not all event poller Ids in set'
			db.eventPollers.getModule oUser.username, oEpOne.id, fCheckInvoker oEpOne.id, oEpOne 
			db.eventPollers.getModule oUser.username, oEpTwo.id, fCheckInvoker oEpTwo.id, oEpTwo


###
# Test EVENT POLLER PARAMS
###
exports.EventPollerParams =
	testCreateAndRead: ( test ) ->
		test.expect 2

		eventId = 'test-event-poller_1'
		params = 'shouldn\'t this be an object?'

		# store an entry to start with 
		db.eventPollers.storeUserParams eventId, oUser.username, params
		
		# test that the ID shows up in the set
		db.eventPollers.getUserParamsIds ( err, obj ) ->
			test.ok eventId+':'+oUser.username in obj,
				'Expected key not in event-params set'
			
			# the retrieved object really is the one we expected
			db.eventPollers.getUserParams eventId, oUser.username, ( err, obj ) ->
				test.strictEqual obj, params,
					'Retrieved event params is not what we expected'
				db.eventPollers.deleteUserParams eventId, oUser.username
				test.done()

	testUpdate: ( test ) ->
		test.expect 1

		eventId = 'test-event-poller_1'
		params = 'shouldn\'t this be an object?'
		paramsNew = 'shouldn\'t this be a new object?'

		# store an entry to start with 
		db.eventPollers.storeUserParams eventId, oUser.username, params
		db.eventPollers.storeUserParams eventId, oUser.username, paramsNew

		# the retrieved object really is the one we expected
		db.eventPollers.getUserParams eventId, oUser.username, ( err, obj ) ->
			test.strictEqual obj, paramsNew,
				'Retrieved event params is not what we expected'
			db.eventPollers.deleteUserParams eventId, oUser.username
			
			test.done()

	testDelete: ( test ) ->
		test.expect 2

		eventId = 'test-event-poller_1'
		params = 'shouldn\'t this be an object?'

		# store an entry to start with and delete it right away
		db.eventPollers.storeUserParams eventId, oUser.username, params
		db.eventPollers.deleteUserParams eventId, oUser.username
		
		# Ensure the event params have been deleted
		db.eventPollers.getUserParams eventId, oUser.username, ( err, obj ) ->
			test.strictEqual obj, null,
				'Event params still exists'
			# Ensure the ID has been removed from the set
			db.eventPollers.getUserParamsIds ( err, obj ) ->
				test.ok eventId+':'+oUser.username not in obj,
					'Event Params key still exists in set'
				
				test.done()


###
# Test RULES
###
exports.Rules =
	tearDown: ( cb ) ->
		db.deleteRule 'tester1', oRuleOne.id
		cb()

	testCreateAndRead: ( test ) ->
		test.expect 3

		db.storeUser oUser
		# store an entry to start with 
		db.storeRule oUser.username, oRuleOne.id, JSON.stringify oRuleOne
		
		# test that the ID shows up in the set
		db.getRuleIds oUser.username, ( err, obj ) ->
			test.ok oRuleOne.id in obj,
				'Expected key not in rule key set'
			
			# the retrieved object really is the one we expected
			db.getRule oUser.username, oRuleOne.id, ( err, obj ) ->
				test.deepEqual JSON.parse(obj), oRuleOne,
					'Retrieved rule is not what we expected'
					
				# Ensure the rule is in the list of all existing ones
				db.getAllActivatedRuleIdsPerUser ( err , obj ) ->
					test.ok oRuleOne.id in obj[oUser.username], 'Rule not in result set'
					
					test.done()

	testUpdate: ( test ) ->
		test.expect 1

		# store an entry to start with 
		db.storeRule oUser.username, oRuleOne.id, JSON.stringify oRuleOne
		db.storeRule oUser.username, oRuleOne.id, JSON.stringify oRuleTwo

		# the retrieved object really is the one we expected
		db.getRule oUser.username, oRuleOne.id, ( err, obj ) ->
			test.deepEqual JSON.parse( obj ), oRuleTwo,
				'Retrieved rule is not what we expected'
			
			test.done()

	testDelete: ( test ) ->
		test.expect 2


		# store an entry to start with and delete it right away
		db.storeRule oUser.username, oRuleOne.id, JSON.stringify oRuleOne
		db.deleteRule oUser.username, oRuleOne.id
		
		# Ensure the event params have been deleted
		db.getRule oUser.username, oRuleOne.id, ( err, obj ) ->
			test.strictEqual obj, null,
				'Rule still exists'

			# Ensure the ID has been removed from the set
			db.getRuleIds oUser.username, ( err, obj ) ->
				test.ok oRuleOne.id not in obj,
					'Rule key still exists in set'
				
				test.done()

## TODO activation should be handled through a rule object property set true or false
	# testLink: ( test ) ->
	# 	test.expect 2

	# 	# link a rule to the user
	# 	db.linkRule oRuleOne.id, oUser.username

	# 		# Ensure the user is linked to the rule
	# 	db.getRuleLinkedUsers oRuleOne.id, ( err, obj ) ->
	# 		test.ok oUser.username in obj,
	# 			"Rule not linked to user #{ oUser.username }"

	# 		# Ensure the rule is linked to the user
	# 		db.getUserLinkedRules oUser.username, ( err, obj ) ->
	# 			test.ok oRuleOne.id in obj,
	# 				"User not linked to rule #{ oRuleOne.id }"
				
	# 			test.done()

	# testUnlink: ( test ) ->
	# 	test.expect 2

	# 	# link and unlink immediately afterwards
	# 	db.linkRule oRuleOne.id, oUser.username
	# 	db.unlinkRule oRuleOne.id, oUser.username

	# 		# Ensure the user is linked to the rule
	# 	db.getRuleLinkedUsers oRuleOne.id, ( err, obj ) ->
	# 		test.ok oUser.username not in obj,
	# 			"Rule still linked to user #{ oUser.username }"

	# 		# Ensure the rule is linked to the user
	# 		db.getUserLinkedRules oUser.username, ( err, obj ) ->
	# 			test.ok oRuleOne.id not in obj,
	# 				"User still linked to rule #{ oRuleOne.id }"
				
	# 			test.done()

	# testActivate: ( test ) ->
	# 	test.expect 4

	# 	usr =
	# 		username: "tester-1"
	# 		password: "tester-1"
	# 	db.storeUser usr
	# 	db.activateRule oRuleOne.id, oUser.username
	# 	# activate a rule for a user

	# 		# Ensure the user is activated to the rule
	# 	db.getRuleActivatedUsers oRuleOne.id, ( err, obj ) ->
	# 		test.ok oUser.username in obj,
	# 			"Rule not activated for user #{ oUser.username }"

	# 		# Ensure the rule is linked to the user
	# 		db.getUserActivatedRules oUser.username, ( err, obj ) ->
	# 			test.ok oRuleOne.id in obj,
	# 				"User not activated for rule #{ oRuleOne.id }"

	# 			# Ensure the rule is showing up in all active rules
	# 			db.getAllActivatedRuleIdsPerUser ( err, obj ) ->
	# 				test.notStrictEqual obj[oUser.username], undefined,
	# 					"User #{ oUser.username } not in activated rules set"
	# 				if obj[oUser.username]
	# 					test.ok oRuleOne.id in obj[oUser.username],
	# 						"Rule #{ oRuleOne.id } not in activated rules set"
	# 				# else
	# 				#   test.ok true,
	# 				#     "Dummy so we meet the expected num of tests"
					
	# 				test.done()

	# testDeactivate: ( test ) ->
	# 	test.expect 3

	# 	# store an entry to start with and link it to te user
	# 	db.activateRule oRuleOne.id, oUser.username
	# 	db.deactivateRule oRuleOne.id, oUser.username

	# 		# Ensure the user is linked to the rule
	# 	db.getRuleActivatedUsers oRuleOne.id, ( err, obj ) ->
	# 		test.ok oUser.username not in obj,
	# 			"Rule still activated for user #{ oUser.username }"

	# 		# Ensure the rule is linked to the user
	# 		db.getUserActivatedRules oUser.username, ( err, obj ) ->
	# 			test.ok oRuleOne.id not in obj,
	# 				"User still activated for rule #{ oRuleOne.id }"

	# 			# Ensure the rule is showing up in all active rules
	# 			db.getAllActivatedRuleIdsPerUser ( err, obj ) ->
	# 				if obj[oUser.username]
	# 					test.ok oRuleOne.id not in obj[oUser.username],
	# 						"Rule #{ oRuleOne.id } still in activated rules set"
	# 				else
	# 					test.ok true,
	# 						"We are fine since there are no entries for this user anymore"
					
	# 				test.done()

	# testUnlinkAndDeactivateAfterDeletion: ( test ) ->
	# 	test.expect 2

	# 	# store an entry to start with and link it to te user
	# 	db.storeRule oRuleOne.id, JSON.stringify oRuleOne
	# 	db.linkRule oRuleOne.id, oUser.username
	# 	db.activateRule oRuleOne.id, oUser.username

	# 	# We need to wait here and there since these calls are asynchronous
	# 	fWaitForTest = () ->

	# 		# Ensure the user is unlinked to the rule
	# 		db.getUserLinkedRules oUser.username, ( err, obj ) ->
	# 			test.ok oRuleOne.id not in obj,
	# 				"Rule #{ oRuleOne.id } still linked to user #{ oUser.username }"

	# 			# Ensure the rule is deactivated for the user
	# 			db.getUserActivatedRules oUser.username, ( err, obj ) ->
	# 				test.ok oRuleOne.id not in obj,
	# 					"Rule #{ oRuleOne.id } still activated for user #{ oUser.username }"
					
	# 				test.done()

	# 	fWaitForDeletion = () ->
	# 		db.deleteRule oRuleOne.id
	# 		setTimeout fWaitForTest, 500

	# 	setTimeout fWaitForDeletion, 100


###
# Test USER
###
exports.User = 
	testCreateInvalid: ( test ) ->
		test.expect 4
		
		oUserInvOne =
			username: "tester-1-invalid"
		oUserInvTwo =
			password: "password"

		# try to store invalid users, ensure they weren't 
		db.storeUser oUserInvOne
		db.storeUser oUserInvTwo

		db.getUser oUserInvOne.username, ( err, obj ) ->
			test.strictEqual obj, null,
				'User One was stored!?'

			db.getUser oUserInvTwo.username, ( err, obj ) ->
				test.strictEqual obj, null,
					'User Two was stored!?'

				db.getUserIds ( err, obj ) ->
					test.ok oUserInvOne.username not in obj,
						'User key was stored!?'
					test.ok oUserInvTwo.username not in obj,
						'User key was stored!?'
					test.done()

	testDelete: ( test ) ->
		test.expect 2

		# Store the user
		db.storeUser oUser

		db.getUser oUser.username, ( err, obj ) ->
			test.deepEqual obj, oUser,
				"User #{ oUser.username } is not what we expect!"

			db.getUserIds ( err, obj ) ->
				test.ok oUser.username in obj,
					'User key was not stored!?'
				
				test.done()

	testUpdate: ( test ) ->
		test.expect 2

		# Store the user
		db.storeUser oUser
		oUser.password = "password-update"
		db.storeUser oUser

		db.getUser oUser.username, ( err, obj ) ->
			test.deepEqual obj, oUser,
				"User #{ oUser.username } is not what we expect!"

			db.getUserIds ( err, obj ) ->
				test.ok oUser.username in obj,
					'User key was not stored!?'
				test.done()

	testDelete: ( test ) ->
		test.expect 2

		# Wait until the user and his rules and roles are deleted
		fWaitForDeletion = () ->
			db.getUserIds ( err, obj ) ->
				test.ok oUser.username not in obj,
					'User key still in set!'

				db.getUser oUser.username, ( err, obj ) ->
					test.strictEqual obj, null,
						'User key still exists!'
					test.done()

		# Store the user and make some links
		db.storeUser oUser
		db.deleteUser oUser.username
		setTimeout fWaitForDeletion, 100


	testDeleteLinks: ( test ) ->
		test.expect 3

		# Wait until the user and his rules and roles are stored
		fWaitForPersistence = () ->
			db.deleteUser oUser.username
			setTimeout fWaitForDeletion, 200

		# Wait until the user and his rules and roles are deleted
		fWaitForDeletion = () ->
			db.getRoleUsers 'tester', ( err, obj ) ->
				test.ok oUser.username not in obj,
					'User key still in role tester!'

				db.getUserRoles oUser.username, ( err, obj ) ->
					test.ok obj.length is 0,
						'User still associated to roles!'
					
					# db.getUserLinkedRules oUser.username, ( err, obj ) ->
					# 	test.ok obj.length is 0,
					# 		'User still associated to rules!'
					db.getRuleIds oUser.username, ( err, obj ) ->
						test.ok obj.length is 0,
							'User still associated to activated rules!'
						db.deleteRole 'tester'
						test.done()

		# Store the user and make some links
		db.storeUser oUser
		# db.linkRule 'rule-1', oUser.username
		# db.linkRule 'rule-2', oUser.username
		# db.linkRule 'rule-3', oUser.username
		# db.activateRule 'rule-1', oUser.username
		db.storeUserRole oUser.username, 'tester'
		# Verify role is deleted
		
		setTimeout fWaitForPersistence, 100


	testLogin: ( test ) ->
		test.expect 3

		# Store the user and make some links
		db.storeUser oUser
		db.loginUser oUser.username, oUser.password, ( err, obj ) ->
			test.deepEqual obj, oUser,
				'User not logged in!'

			db.loginUser 'dummyname', oUser.password, ( err, obj ) ->
				test.strictEqual obj, null,
					'User logged in?!'

				db.loginUser oUser.username, 'wrongpass', ( err, obj ) ->
					test.strictEqual obj, null,
						'User logged in?!'
					
					test.done()


###
# Test ROLES
###
exports.Roles = 
	testStore: ( test ) ->
		test.expect 2

		db.storeUser oUser
		db.storeUserRole oUser.username, 'tester'

		db.getUserRoles oUser.username, ( err, obj ) ->
			test.ok 'tester' in obj,
				'User role tester not stored!'

			db.getRoleUsers 'tester', ( err, obj ) ->
				test.ok oUser.username in obj,
					"User #{ oUser.username } not stored in role tester!"
				
				test.done()

	testDelete: ( test ) ->
		test.expect 2

		db.storeUser oUser
		db.storeUserRole oUser.username, 'tester'
		db.removeUserRole oUser.username, 'tester'

		db.getUserRoles oUser.username, ( err, obj ) ->
			test.ok 'tester' not in obj,
				'User role tester not stored!'

			db.getRoleUsers 'tester', ( err, obj ) ->
				test.ok oUser.username not in obj,
					"User #{ oUser.username } not stored in role tester!"
				
				test.done()
		# store an entry to start with 
