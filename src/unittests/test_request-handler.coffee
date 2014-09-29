http = require 'http'
fs = require 'fs'
path = require 'path'
events = require 'events'
cp = require 'child_process'


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
opts =
	logger: log
opts[ 'db-port' ] = 6379
db = require path.join '..', 'js', 'persistence'
db opts

rh = require path.join '..', 'js', 'request-handler'
opts[ 'request-service' ] = ( usr, obj, cb ) ->
	test.ok false, 'testEvent should not cause a service request call'
opts[ 'shutdown-function' ] = () ->
	test.ok false, 'testEvent should not cause a system shutdown'
rh opts

createRequest = ( query, origUrl ) ->
	req = new events.EventEmitter()
	req.query = query
	req.originalUrl = origUrl
	req.session = {}
	req

createLoggedInRequest = ( query, origUrl ) ->
	req = createRequest query, origUrl
	req.session =
		user: objects.users.userOne
	req

createAdminRequest = ( query, origUrl ) ->
	req = createRequest()
	req.session =
		user: objects.users.userAdmin
	req

postRequestData = ( req, data ) ->
	req.emit 'data', data 
	req.emit 'end'

# cb want's to get a response like { code, msg }
createResponse = ( cb ) ->
	resp =
		send: ( code, msg ) ->
			if msg
				code = parseInt code
			else
				msg = code
				code = 200
			cb code, msg

exports.session =
	setUp: ( cb ) =>
		@oUsr = objects.users.userOne
		db.storeUser @oUsr
		cb()

	tearDown: ( cb ) =>
		db.deleteUser @oUsr.username
		db.purgeEventQueue()
		cb()

	testLoginAndOut: ( test ) =>
		test.expect 6

		req = createRequest()
		resp = createResponse ( code, msg ) =>

			# Check Login
			test.strictEqual code, 200, 'Login failed'
			test.deepEqual req.session.user, @oUsr, 'Session user not what we expected'
			req = createLoggedInRequest()
			resp = createResponse ( code, msg ) =>

				# Check Login again
				test.strictEqual code, 200, 'Login again did nothing different'
				test.deepEqual req.session.user, @oUsr, 'Session user not what we expected after relogin'
				req = createRequest()
				resp = createResponse ( code, msg ) ->

					# Check logout
					test.strictEqual code, 200, 'Logout failed'
					test.strictEqual req.session.user, null, 'User not removed from session'
					test.done()
				rh.handleLogout req, resp # set the handler to listening
			rh.handleLogin req, resp # set the handler to listening
			postRequestData req, JSON.stringify @oUsr # emit the data post event

		rh.handleLogin req, resp # set the handler to listening
		postRequestData req, JSON.stringify @oUsr # emit the data post event


	testWrongLogin: ( test ) =>
		test.expect 2

		req = createRequest()
		resp = createResponse ( code, msg ) =>
			test.strictEqual code, 401, 'Login did not fail?'
			test.strictEqual req.session.user, undefined, 'User in session?'
			test.done()

		usr =
			username: @oUsr.username
			password: 'wrongpassword'
		rh.handleLogin req, resp # set the handler to listening
		postRequestData req, JSON.stringify usr # emit the data post event

exports.events =
	setUp: ( cb ) ->
		db.purgeEventQueue()
		cb()

# This test seems to hang sometimes... maybe it's also happening somewhere else...
	testCorrectEvent: ( test ) ->
		test.expect 2

		oEvt = objects.events.eventOne

		semaphore = 2
		fPopEvent = () ->
			fCb = ( err, obj ) ->
				test.deepEqual obj, oEvt, 'Caught event is not what we expected'
				if --semaphore is 0
					test.done()
			db.popEvent fCb

		req = createLoggedInRequest()
		resp = createResponse ( code, msg ) ->
			test.strictEqual code, 200
			if --semaphore is 0
				test.done()

		rh.handleEvent req, resp # set the handler to listening
		postRequestData req, JSON.stringify oEvt # emit the data post event
		setTimeout fPopEvent, 200 # try to fetch the db entry

	testIncorrectEvent: ( test ) ->
		test.expect 2

		oEvt = 
			data: 'event misses event type property'

		semaphore = 2
		fPopEvent = () ->
			fCb = ( err, obj ) ->
				test.deepEqual obj, null, 'We caught an event!?'
				if --semaphore is 0
					test.done()
			db.popEvent fCb

		req = createLoggedInRequest()
		resp = createResponse ( code, msg ) ->
			test.strictEqual code, 400
			if --semaphore is 0
				test.done()

		rh.handleEvent req, resp # set the handler to listening
		postRequestData req, JSON.stringify oEvt # emit the data post event
		setTimeout fPopEvent, 200 # try to fetch the db entry

exports.testLoginOrPage = ( test ) ->
	test.expect 3

	req = createRequest()
	req.query =
		page: 'forge_event'
	resp = createResponse ( code, msg ) ->
		 
		# Ensure we have to login first
		test.ok msg.indexOf( 'document.title = \'Login\'' ) > 0, 'Didn\'t get login page?'
		req = createLoggedInRequest()
		req.query =
			page: 'forge_event'
		resp = createResponse ( code, msg ) ->

			# After being logged in we should get the expected page
			test.ok msg.indexOf( 'document.title = \'Push Events!\'' ) > 0, 'Didn\' get forge page?'
			req = createLoggedInRequest()
			req.query =
				page: 'wrongpage'
			resp = createResponse ( code, msg ) ->

				# A wrong page request should give back an error page
				test.ok msg.indexOf( 'document.title = \'Error!\'' ) > 0, 'Didn\' get forge page?'
				test.done()

			rh.handleForge req, resp # set the handler to listening
		rh.handleForge req, resp # set the handler to listening
	rh.handleForge req, resp # set the handler to listening


exports.testUserCommandsNoLogin = ( test ) ->
	test.expect 1

	req = createRequest()
	resp = createResponse ( code, msg ) ->
		test.strictEqual code, 401, 'Login did not fail?'
		test.done()
	rh.handleUserCommand req, resp # set the handler to listening


exports.testUserCommands = ( test ) ->
	test.expect 3

	oReqData = 
		command: 'get_something'
		# store_action
		# store_event
		# store_rule
		# get_eventmodules
		# get_actionmodules

	oRespData =
		code: 200
		some: 'very'
		important: 'data'

	args = 
		logger: log 
	args[ 'request-service' ] = ( usr, obj, cb ) ->
		test.ok true, 'Yay we got the request!'
		cb oRespData
	rh args

	req = createLoggedInRequest()
	resp = createResponse ( code, msg ) ->
		test.strictEqual code, 200, 'Service wasn\'t happy with our request'
		test.deepEqual msg, oRespData, 'Service didn\'t return expected'
		test.done()
	rh.handleUserCommand req, resp # set the handler to listening
	postRequestData req, JSON.stringify oReqData # emit the data post event
	
