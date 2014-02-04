
exports.setUp = ( cb ) =>
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

	testPushing: ( test ) =>
		test.expect 1
		fPush = ->
			@db.pushEvent null
			@db.pushEvent @evt1
		test.throws fPush, Error, 'This should not throw an error'
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
	setUp: ( cb ) =>
		@action1 = '
			exports.testFunctionOne = function( args ) {
			  var data = { 
			    companyId: \'961\',
			    context: \'17936\',
			    text: \'Binder entry based on event: \' + args.info
			  };
			  needle.post(\'https://probinder.com/service/27/save\', data);
			};'
		@action2 = '
		  // This is just a console.log which should fail
		  console.log(\'Why is this being printed??\');
			exports.testFunctionTwo = function( args ) {
				// empty function)
			};'
		cb()

	testStoreModule: ( test ) =>
		test.expect 1
		fStore = ->
			@db.storeActionModule 'test-action-module_null', null
			@db.storeActionModule 'test-action-module_1', @action1
		test.throws fStore, Error, 'Storing Action Module should not throw an error'
		test.done()

	testFetchModule: ( test ) =>
		test.expect 0
		test.done()

	testFetchModules: ( test ) =>
		test.expect 0
		test.done()

	testStoreParams: ( test ) =>
		test.expect 0
		test.done()

	testFetchParams: ( test ) =>
		test.expect 0
		test.done()

exports.event_modules = 
	test: ( test ) =>
		test.expect 0
		test.done()


exports.rules = 
	test: ( test ) =>
		test.expect 0
		test.done()

exports.users = 
	test: ( test ) =>
		test.expect 0
		test.done()


exports.tearDown = ( cb ) =>
	@db.shutDown()
	cb()