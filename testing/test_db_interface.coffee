
exports.setUp = ( cb ) =>
	@log = require '../js-coffee/logging'
	@db = require '../js-coffee/db_interface'
	@db logType: 2
	cb()

exports.availability =
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
		evt = 
			eventid: '1'
			event: 'mail'
		test.expect 2
		@db.pushEvent evt
		@db.purgeEventQueue()
		@db.popEvent ( err, obj ) =>
			test.ifError err, 'Error during pop after purging!'
			test.strictEqual obj, null, 'There was an event in the queue!?'
			test.done()

exports.events =
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
			test.ifError err, 'Error during pop after purging!'
			test.strictEqual obj, null, 'There was an event in the queue!?'
			test.done()

	testEmptyPushing: ( test ) =>
		test.expect 2
		@db.pushEvent null
		@db.popEvent ( err, obj ) =>
			test.ifError err, 'Error during non-empty pushing!'
			test.strictEqual obj, null, 'There was an event in the queue!?'
			test.done()

	testNonEmptyPopping: ( test ) =>
		test.expect 3
		@db.pushEvent @evt1
		@db.popEvent ( err, obj ) =>
			test.ifError err, 'Error during non-empty popping!'
			test.notStrictEqual obj, null, 'There was no event in the queue!'
			test.deepEqual @evt1, obj, 'Wrong event in queue!'
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
			test.ifError err, 'Error during multiple push and pop!'
			test.notStrictEqual obj, null, 'There was no event in the queue!'
			test.deepEqual @evt1, obj, 'Wrong event in queue!'
			forkEnds()
		@db.popEvent ( err, obj ) =>
			test.ifError err, 'Error during multiple push and pop!'
			test.notStrictEqual obj, null, 'There was no event in the queue!'
			test.deepEqual @evt2, obj, 'Wrong event in queue!'
			forkEnds()

exports.action_modules =
	# setUp: ( cb ) =>
	# 	@db logType: 1
	# 	cb()

	testModule: ( test ) =>
		test.expect 4
		action1name = 'test-action-module_1'
		action1 = 'unit-test action module 1 content'

		fCheckSetEntry = ( err , obj ) =>
			test.ok action1name in obj, 'Expected key not in action-modules set'
			@db.getActionModule action1name, fCheckModuleExists

		fCheckModuleExists = ( err , obj ) =>
			test.strictEqual obj, action1, 'Retrieved Action Module is not what we expected'
			@log.print 'delete action module'
			@db.deleteActionModule action1name
			@log.print 'tried to delete action module'
			@db.getActionModule action1name, fCheckModuleNotExists

		fCheckModuleNotExists = ( err , obj ) =>
			@log.print 'got action module'
			test.strictEqual obj, null, 'Action module still exists'
			@log.print 'compared action module'
			@db.getActionModuleIds fCheckModuleNotExistsInSet

		fCheckModuleNotExistsInSet = ( err , obj ) =>
			test.ok action1name not in obj, 'Action module key still exists in set'
			test.done()

		@db.storeActionModule action1name, action1
		@db.getActionModuleIds fCheckSetEntry
		
	testFetchSeveralModules: ( test ) =>
		semaphore = 2

		test.expect 3
		action1name = 'test-action-module_1'
		action2name = 'test-action-module_2'
		action1 = 'unit-test action module 1 content'
		action2 = 'unit-test action module 2 content'

		fCheckModule = ( mod ) ->
			myTest = test
			sem = semaphore
			forkEnds = () ->
				console.log 'fork ends'
				myTest.done() if --sem is 0
			console.log 'check module'
			( err, obj ) ->
				console.log 'db answered'
				myTest.strictEqual mod, obj, "Module does not equal the expected one"
				forkEnds()

		fCheckSetEntries = ( err, obj ) ->
			test.ok action1name in obj and action2name in obj, 'Not all action module Ids in set'
			console.log 'setentries fetched'
			@db.getActionModule action1name, fCheckModule(action1)
			@db.getActionModule action2name, fCheckModule(action2)

		@db.storeActionModule action1name, action1
		@db.storeActionModule action2name, action2
		@db.getActionModuleIds fCheckSetEntries


# 	testFetchModules: ( test ) =>
# 		test.expect 0
# 		test.done()

# 	testStoreParams: ( test ) =>
# 		test.expect 0
# 		test.done()

# 	testFetchParams: ( test ) =>
# 		test.expect 0
# 		test.done()

# exports.event_modules = 
# 	test: ( test ) =>
# 		test.expect 0
# 		test.done()


# exports.rules = 
# 	test: ( test ) =>
# 		test.expect 0
# 		test.done()

# exports.users = 
# 	test: ( test ) =>
# 		test.expect 0
# 		test.done()


exports.tearDown = ( cb ) =>
	@db.shutDown()
	cb()