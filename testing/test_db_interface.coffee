
exports.setUp = ( cb ) =>
	@db = require '../js-coffee/db_interface'
	@db logType: 2
	cb()
	
exports.tearDown = ( cb ) =>
	@db.shutDown()
	cb()


###
# Test AVAILABILITY
###
exports.Availability =
	testRequire: ( test ) =>
		test.expect 1

		test.ok @db, 'DB interface loaded'
		test.done()

	testConnect: ( test ) =>
		test.expect 1

		@db.isConnected ( err ) ->
			test.ifError err, 'Connection failed!'
			test.done()

	testNoConfig: ( test ) =>
		test.expect 1

		@db 
			configPath: 'nonexistingconf.file'
		@db.isConnected ( err ) ->
			test.ok err, 'Still connected!?'
			test.done()

	testWrongConfig: ( test ) =>
		test.expect 1

		@db { configPath: 'testing/jsonWrongConfig.json' }
		@db.isConnected ( err ) ->
			test.ok err, 'Still connected!?'
			test.done()

	testPurgeQueue: ( test ) =>
		test.expect 2

		evt = 
			eventid: '1'
			event: 'mail'
		@db.pushEvent evt
		@db.purgeEventQueue()
		@db.popEvent ( err, obj ) =>
			test.ifError err, 'Error during pop after purging!'
			test.strictEqual obj, null, 'There was an event in the queue!?'
			test.done()


###
# Test EVENT QUEUE
###
exports.EventQueue =
	setUp: ( cb ) =>
		@evt1 = 
			eventid: '1'
			event: 'mail'
		@evt2 = 
			eventid: '2'
			event: 'mail'
		@db.purgeEventQueue()
		cb()

	testEmptyPopping: ( test ) =>
		test.expect 2

		@db.popEvent ( err, obj ) =>
			test.ifError err,
				'Error during pop after purging!'
			test.strictEqual obj, null,
				'There was an event in the queue!?'
			test.done()

	testEmptyPushing: ( test ) =>
		test.expect 2

		@db.pushEvent null
		@db.popEvent ( err, obj ) =>
			test.ifError err,
				'Error during non-empty pushing!'
			test.strictEqual obj, null,
				'There was an event in the queue!?'
			test.done()

	testNonEmptyPopping: ( test ) =>
		test.expect 3

		@db.pushEvent @evt1
		@db.popEvent ( err, obj ) =>
			test.ifError err,
				'Error during non-empty popping!'
			test.notStrictEqual obj, null,
				'There was no event in the queue!'
			test.deepEqual @evt1, obj,
				'Wrong event in queue!'
			test.done()

	testMultiplePushAndPops: ( test ) =>
		test.expect 6

		semaphore = 2
		forkEnds = () ->
			test.done() if --semaphore is 0

		@db.pushEvent @evt1
		@db.pushEvent @evt2
		# eventually it would be wise to not care about the order of events
		@db.popEvent ( err, obj ) =>
			test.ifError err,
				'Error during multiple push and pop!'
			test.notStrictEqual obj, null,
				'There was no event in the queue!'
			test.deepEqual @evt1, obj,
				'Wrong event in queue!'
			forkEnds()
		@db.popEvent ( err, obj ) =>
			test.ifError err,
				'Error during multiple push and pop!'
			test.notStrictEqual obj, null,
				'There was no event in the queue!'
			test.deepEqual @evt2, obj,
				'Wrong event in queue!'
			forkEnds()


###
# Test ACTION INVOKER
###
exports.ActionInvoker =
	testCreateAndRead: ( test ) =>
		test.expect 3

		id = 'test-action-invoker'
		action = 'unit-test action invoker content'

		# store an entry to start with 
		@db.storeActionInvoker id, action

		# test that the ID shows up in the set
		@db.getActionInvokerIds ( err , obj ) =>
			test.ok id in obj,
				'Expected key not in action-invokers set'
			
			# the retrieved object really is the one we expected
			@db.getActionInvoker id, ( err , obj ) =>
				test.strictEqual obj, action,
					'Retrieved Action Invoker is not what we expected'
				
				# Ensure the action invoker is in the list of all existing ones
				@db.getActionInvokers ( err , obj ) =>
					test.deepEqual action, obj[id],
						'Action Invoker ist not in result set'
					@db.deleteActionInvoker id
					test.done()
					
	testUpdate: ( test ) =>
		test.expect 2

		id = 'test-action-invoker'
		action = 'unit-test action invoker content'
		actionNew = 'unit-test action invoker new content'

		# store an entry to start with 
		@db.storeActionInvoker id, action
		@db.storeActionInvoker id, actionNew

		# the retrieved object really is the one we expected
		@db.getActionInvoker id, ( err , obj ) =>
			test.strictEqual obj, actionNew,
				'Retrieved Action Invoker is not what we expected'
				
			# Ensure the action invoker is in the list of all existing ones
			@db.getActionInvokers ( err , obj ) =>
				test.deepEqual actionNew, obj[id],
					'Action Invoker ist not in result set'
				@db.deleteActionInvoker id
				test.done()

	testDelete: ( test ) =>
		test.expect 2

		id = 'test-action-invoker'
		action = 'unit-test action invoker content'

		# store an entry to start with 
		@db.storeActionInvoker id, action

		# Ensure the action invoker has been deleted
		@db.deleteActionInvoker id
		@db.getActionInvoker id, ( err , obj ) =>
			test.strictEqual obj, null,
				'Action Invoker still exists'
			
			# Ensure the ID has been removed from the set
			@db.getActionInvokerIds ( err , obj ) =>
				test.ok id not in obj,
					'Action Invoker key still exists in set'
				test.done()
	

	testFetchSeveral: ( test ) =>
		test.expect 3

		semaphore = 2
		action1name = 'test-action-invoker_1'
		action2name = 'test-action-invoker_2'
		action1 = 'unit-test action invoker 1 content'
		action2 = 'unit-test action invoker 2 content'

		fCheckInvoker = ( modname, mod ) =>
			myTest = test
			forkEnds = () ->
				myTest.done() if --semaphore is 0
			( err, obj ) =>
				myTest.strictEqual mod, obj,
					"Invoker #{ modname } does not equal the expected one"
				@db.deleteActionInvoker modname
				forkEnds()

		@db.storeActionInvoker action1name, action1
		@db.storeActionInvoker action2name, action2
		@db.getActionInvokerIds ( err, obj ) =>
			test.ok action1name in obj and action2name in obj,
				'Not all action invoker Ids in set'
			@db.getActionInvoker action1name, fCheckInvoker action1name, action1 
			@db.getActionInvoker action2name, fCheckInvoker action2name, action2


###
# Test ACTION INVOKER PARAMS
###
exports.ActionInvokerParams =
	testCreateAndRead: ( test ) =>
		test.expect 2

		userId = 'tester1'
		actionId = 'test-action-invoker_1'
		params = 'shouldn\'t this be an object?'

		# store an entry to start with 
		@db.storeActionParams actionId, userId, params
		
		# test that the ID shows up in the set
		@db.getActionParamsIds ( err, obj ) =>
			test.ok actionId+':'+userId in obj,
				'Expected key not in action-params set'
			
			# the retrieved object really is the one we expected
			@db.getActionParams actionId, userId, ( err, obj ) =>
				test.strictEqual obj, params,
					'Retrieved action params is not what we expected'
				@db.deleteActionParams actionId, userId
				test.done()

	testUpdate: ( test ) =>
		test.expect 1

		userId = 'tester1'
		actionId = 'test-action-invoker_1'
		params = 'shouldn\'t this be an object?'
		paramsNew = 'shouldn\'t this be a new object?'

		# store an entry to start with 
		@db.storeActionParams actionId, userId, params
		@db.storeActionParams actionId, userId, paramsNew

		# the retrieved object really is the one we expected
		@db.getActionParams actionId, userId, ( err, obj ) =>
			test.strictEqual obj, paramsNew,
				'Retrieved action params is not what we expected'
			@db.deleteActionParams actionId, userId
			test.done()

	testDelete: ( test ) =>
		test.expect 2

		userId = 'tester1'
		actionId = 'test-action-invoker_1'
		params = 'shouldn\'t this be an object?'

		# store an entry to start with and delte it right away
		@db.storeActionParams actionId, userId, params
		@db.deleteActionParams actionId, userId
		
		# Ensure the action params have been deleted
		@db.getActionParams  actionId, userId, ( err, obj ) =>
			test.strictEqual obj, null,
				'Action params still exists'
			# Ensure the ID has been removed from the set
			@db.getActionParamsIds ( err, obj ) =>
				test.ok actionId+':'+userId not in obj,
					'Action Params key still exists in set'
				test.done()


###
# Test EVENT POLLER
###
exports.EventPoller =
	testCreateAndRead: ( test ) =>
		test.expect 3

		id = 'test-event-poller'
		event = 'unit-test event poller content'

		# store an entry to start with 
		@db.storeEventPoller id, event

		# test that the ID shows up in the set
		@db.getEventPollerIds ( err , obj ) =>
			test.ok id in obj,
				'Expected key not in event-pollers set'
			
			# the retrieved object really is the one we expected
			@db.getEventPoller id, ( err , obj ) =>
				test.strictEqual obj, event,
					'Retrieved Event Poller is not what we expected'
				
				# Ensure the event poller is in the list of all existing ones
				@db.getEventPollers ( err , obj ) =>
					test.deepEqual event, obj[id],
						'Event Poller ist not in result set'
					@db.deleteEventPoller id
					test.done()
					
	testUpdate: ( test ) =>
		test.expect 2

		id = 'test-event-poller'
		event = 'unit-test event poller content'
		eventNew = 'unit-test event poller new content'

		# store an entry to start with 
		@db.storeEventPoller id, event
		@db.storeEventPoller id, eventNew

		# the retrieved object really is the one we expected
		@db.getEventPoller id, ( err , obj ) =>
			test.strictEqual obj, eventNew,
				'Retrieved Event Poller is not what we expected'
				
			# Ensure the event poller is in the list of all existing ones
			@db.getEventPollers ( err , obj ) =>
				test.deepEqual eventNew, obj[id],
					'Event Poller ist not in result set'
				@db.deleteEventPoller id
				test.done()

	testDelete: ( test ) =>
		test.expect 2

		id = 'test-event-poller'
		event = 'unit-test event poller content'

		# store an entry to start with 
		@db.storeEventPoller id, event

		# Ensure the event poller has been deleted
		@db.deleteEventPoller id
		@db.getEventPoller id, ( err , obj ) =>
			test.strictEqual obj, null,
				'Event Poller still exists'
			
			# Ensure the ID has been removed from the set
			@db.getEventPollerIds ( err , obj ) =>
				test.ok id not in obj,
					'Event Poller key still exists in set'
				test.done()
	

	testFetchSeveral: ( test ) =>
		test.expect 3

		semaphore = 2
		event1name = 'test-event-poller_1'
		event2name = 'test-event-poller_2'
		event1 = 'unit-test event poller 1 content'
		event2 = 'unit-test event poller 2 content'

		fCheckPoller = ( modname, mod ) =>
			myTest = test
			forkEnds = () ->
				myTest.done() if --semaphore is 0
			( err, obj ) =>
				myTest.strictEqual mod, obj,
					"Invoker #{ modname } does not equal the expected one"
				@db.deleteEventPoller modname
				forkEnds()

		@db.storeEventPoller event1name, event1
		@db.storeEventPoller event2name, event2
		@db.getEventPollerIds ( err, obj ) =>
			test.ok event1name in obj and event2name in obj,
				'Not all event poller Ids in set'
			@db.getEventPoller event1name, fCheckPoller event1name, event1 
			@db.getEventPoller event2name, fCheckPoller event2name, event2


###
# Test EVENT POLLER PARAMS
###
exports.EventPollerParams =
	testCreateAndRead: ( test ) =>
		test.expect 2

		userId = 'tester1'
		eventId = 'test-event-poller_1'
		params = 'shouldn\'t this be an object?'

		# store an entry to start with 
		@db.storeEventParams eventId, userId, params
		
		# test that the ID shows up in the set
		@db.getEventParamsIds ( err, obj ) =>
			test.ok eventId+':'+userId in obj,
				'Expected key not in event-params set'
			
			# the retrieved object really is the one we expected
			@db.getEventParams eventId, userId, ( err, obj ) =>
				test.strictEqual obj, params,
					'Retrieved event params is not what we expected'
				@db.deleteEventParams eventId, userId
				test.done()

	testUpdate: ( test ) =>
		test.expect 1

		userId = 'tester1'
		eventId = 'test-event-poller_1'
		params = 'shouldn\'t this be an object?'
		paramsNew = 'shouldn\'t this be a new object?'

		# store an entry to start with 
		@db.storeEventParams eventId, userId, params
		@db.storeEventParams eventId, userId, paramsNew

		# the retrieved object really is the one we expected
		@db.getEventParams eventId, userId, ( err, obj ) =>
			test.strictEqual obj, paramsNew,
				'Retrieved event params is not what we expected'
			@db.deleteEventParams eventId, userId
			test.done()

	testDelete: ( test ) =>
		test.expect 2

		userId = 'tester1'
		eventId = 'test-event-poller_1'
		params = 'shouldn\'t this be an object?'

		# store an entry to start with and delete it right away
		@db.storeEventParams eventId, userId, params
		@db.deleteEventParams eventId, userId
		
		# Ensure the event params have been deleted
		@db.getEventParams eventId, userId, ( err, obj ) =>
			test.strictEqual obj, null,
				'Event params still exists'
			# Ensure the ID has been removed from the set
			@db.getEventParamsIds ( err, obj ) =>
				test.ok eventId+':'+userId not in obj,
					'Event Params key still exists in set'
				test.done()


###
# Test RULES
###
exports.Rules =
	setUp: ( cb ) =>
		# @db logType: 1
		@userId = 'tester-1'
		@ruleId = 'test-rule_1'
		@rule = 
		  "id": "rule_id",
		  "event": "custom",
		  "condition":
		  	"property": "yourValue",
		  "actions": []
		@ruleNew = 
		  "id": "rule_new",
		  "event": "custom",
		  "condition":
		  	"property": "yourValue",
		  "actions": []
		cb()

	tearDown: ( cb ) =>
		@db.deleteRule @ruleId
		cb()

	testCreateAndRead: ( test ) =>
		test.expect 3

		# store an entry to start with 
		@db.storeRule @ruleId, JSON.stringify(@rule)
		
		# test that the ID shows up in the set
		@db.getRuleIds ( err, obj ) =>
			test.ok @ruleId in obj,
				'Expected key not in rule key set'
			
			# the retrieved object really is the one we expected
			@db.getRule @ruleId, ( err, obj ) =>
				test.deepEqual JSON.parse(obj), @rule,
					'Retrieved rule is not what we expected'

				# Ensure the rule is in the list of all existing ones
				@db.getRules ( err , obj ) =>
					test.deepEqual @rule, JSON.parse(obj[@ruleId]),
						'Rule not in result set'
					@db.deleteRule @ruleId
					test.done()

	testUpdate: ( test ) =>
		test.expect 1

		# store an entry to start with 
		@db.storeRule @ruleId, JSON.stringify(@rule)
		@db.storeRule @ruleId, JSON.stringify(@ruleNew)

		# the retrieved object really is the one we expected
		@db.getRule @ruleId, ( err, obj ) =>
			test.deepEqual JSON.parse(obj), @ruleNew,
				'Retrieved rule is not what we expected'
			@db.deleteRule @ruleId
			test.done()

	testDelete: ( test ) =>
		test.expect 2

		# store an entry to start with and delete it right away
		@db.storeRule @ruleId, JSON.stringify(@rule)
		@db.deleteRule @ruleId
		
		# Ensure the event params have been deleted
		@db.getRule @ruleId, ( err, obj ) =>
			test.strictEqual obj, null,
				'Rule still exists'

			# Ensure the ID has been removed from the set
			@db.getRuleIds ( err, obj ) =>
				test.ok @ruleId not in obj,
					'Rule key still exists in set'
				test.done()

	testLink: ( test ) =>
		test.expect 2

		# link a rule to the user
		@db.linkRule @ruleId, @userId

			# Ensure the user is linked to the rule
		@db.getRuleLinkedUsers @ruleId, ( err, obj ) =>
			test.ok @userId in obj,
				"Rule not linked to user #{ @userId }"

			# Ensure the rule is linked to the user
			@db.getUserLinkedRules @userId, ( err, obj ) =>
				test.ok @ruleId in obj,
					"User not linked to rule #{ @ruleId }"
				test.done()

	testUnlink: ( test ) =>
		test.expect 2

		# link and unlink immediately afterwards
		@db.linkRule @ruleId, @userId
		@db.unlinkRule @ruleId, @userId

			# Ensure the user is linked to the rule
		@db.getRuleLinkedUsers @ruleId, ( err, obj ) =>
			test.ok @userId not in obj,
				"Rule still linked to user #{ @userId }"

			# Ensure the rule is linked to the user
			@db.getUserLinkedRules @userId, ( err, obj ) =>
				test.ok @ruleId not in obj,
					"User still linked to rule #{ @ruleId }"
				test.done()

	testActivate: ( test ) =>
		test.expect 4

		usr =
			username: "tester-1"
			password: "tester-1"
		@db.storeUser usr
		@db.activateRule @ruleId, @userId
		# activate a rule for a user

			# Ensure the user is activated to the rule
		@db.getRuleActivatedUsers @ruleId, ( err, obj ) =>
			test.ok @userId in obj,
				"Rule not activated for user #{ @userId }"

			# Ensure the rule is linked to the user
			@db.getUserActivatedRules @userId, ( err, obj ) =>
				test.ok @ruleId in obj,
					"User not activated for rule #{ @ruleId }"

				# Ensure the rule is showing up in all active rules
				@db.getAllActivatedRuleIdsPerUser ( err, obj ) =>
					test.notStrictEqual obj[@userId], undefined,
						"User #{ @userId } not in activated rules set"
					if obj[@userId]
						test.ok @ruleId in obj[@userId],
							"Rule #{ @ruleId } not in activated rules set"
					else
						test.ok true,
							"Dummy so we meet the expected num of tests"
					test.done()

	testDeactivate: ( test ) =>
		test.expect 3

		# store an entry to start with and link it to te user
		@db.activateRule @ruleId, @userId
		@db.deactivateRule @ruleId, @userId

			# Ensure the user is linked to the rule
		@db.getRuleActivatedUsers @ruleId, ( err, obj ) =>
			test.ok @userId not in obj,
				"Rule still activated for user #{ @userId }"

			# Ensure the rule is linked to the user
			@db.getUserActivatedRules @userId, ( err, obj ) =>
				test.ok @ruleId not in obj,
					"User still activated for rule #{ @ruleId }"

				# Ensure the rule is showing up in all active rules
				@db.getAllActivatedRuleIdsPerUser ( err, obj ) =>
					if obj[@userId]
						test.ok @ruleId not in obj[@userId],
							"Rule #{ @ruleId } still in activated rules set"
					else
						test.ok true,
							"We are fine since there are no entries for this user anymore"
					test.done()

	testUnlinkAndDeactivateAfterDeletion: ( test ) =>
		test.expect 2

		# store an entry to start with and link it to te user
		@db.storeRule @ruleId, JSON.stringify(@rule)
		@db.linkRule @ruleId, @userId
		@db.activateRule @ruleId, @userId

		# We need to wait here and there since these calls are asynchronous
		fWaitForTest = () =>

			# Ensure the user is unlinked to the rule
			@db.getUserLinkedRules @userId, ( err, obj ) =>
				test.ok @ruleId not in obj,
					"Rule #{ @ruleId } still linked to user #{ @userId }"

				# Ensure the rule is deactivated for the user
				@db.getUserActivatedRules @userId, ( err, obj ) =>
					test.ok @ruleId not in obj,
						"Rule #{ @ruleId } still activated for user #{ @userId }"
					test.done()

		fWaitForDeletion = () =>
			@db.deleteRule @ruleId
			setTimeout fWaitForTest, 100

		setTimeout fWaitForDeletion, 100


###
# Test USER
###
exports.User = 
	setUp: ( cb ) =>
		@db logType: 1
		@oUser =
			username: "tester-1"
			password: "password"
		cb()
	tearDown: ( cb ) =>
		@db.deleteUser @oUser.username
		cb()

	testCreateInvalid: ( test ) =>
		test.expect 4
		
		oUserInvOne =
			username: "tester-1-invalid"
		oUserInvTwo =
			password: "password"

		# try to store invalid users, ensure they weren't 
		@db.storeUser oUserInvOne
		@db.storeUser oUserInvTwo

		@db.getUser oUserInvOne.username, ( err, obj ) =>
			test.strictEqual obj, null,
				'User One was stored!?'

			@db.getUser oUserInvTwo.username, ( err, obj ) =>
				test.strictEqual obj, null,
					'User Two was stored!?'

				@db.getUserIds ( err, obj ) =>
					test.ok oUserInvOne.username not in obj,
						'User key was stored!?'
					test.ok oUserInvTwo.username not in obj,
						'User key was stored!?'
					test.done()

	testDelete: ( test ) =>
		test.expect 2

		# Store the user
		@db.storeUser @oUser

		@db.getUser @oUser.username, ( err, obj ) =>
			test.deepEqual obj, @oUser,
				"User #{ @oUser.username } is not what we expect!"

			@db.getUserIds ( err, obj ) =>
				test.ok @oUser.username in obj,
					'User key was not stored!?'
				test.done()

	testUpdate: ( test ) =>
		test.expect 2

		oUserOne =
			username: "tester-1-update"
			password: "password"

		# Store the user
		@db.storeUser oUserOne
		oUserOne.password = "password-update"
		@db.storeUser oUserOne

		@db.getUser oUserOne.username, ( err, obj ) =>
			test.deepEqual obj, oUserOne,
				"User #{ @oUser.username } is not what we expect!"

			@db.getUserIds ( err, obj ) =>
				test.ok oUserOne.username in obj,
					'User key was not stored!?'
				@db.deleteUser oUserOne.username
				test.done()

	testDelete: ( test ) =>
		test.expect 2

		# Wait until the user and his rules and roles are stored
		fWaitForPersistence = () =>
			@db.deleteUser @oUser.username
			setTimeout fWaitForDeletion, 200

		# Wait until the user and his rules and roles are deleted
		fWaitForDeletion = () =>
			@db.getUserIds ( err, obj ) =>
				test.ok @oUser.username not in obj,
					'User key still in set!'

				@db.getUser @oUser.username, ( err, obj ) =>
					test.strictEqual obj, null,
						'User key still exists!'
					test.done()

		# Store the user and make some links
		@db.storeUser @oUser
		@db.linkRule 'rule-1', @oUser.username
		@db.linkRule 'rule-2', @oUser.username
		@db.linkRule 'rule-3', @oUser.username
		@db.activateRule 'rule-1', @oUser.username
		@db.storeUserRole @oUser.username, 'tester'
		setTimeout fWaitForPersistence, 100


###
# Test ROLES
###
# exports.Roles = 
	# setUp: ( cb ) =>
	# 	@db logType: 1
	# 	@oUser =
	# 		username: "tester-1"
	# 		password: "password"
	# 	cb()
	# tearDown: ( cb ) =>
	# 	@db.deleteUser @oUser.username
	# 	cb()
