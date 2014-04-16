
cp = require 'child_process'
path = require 'path'

# TODO test http shutdown command
# TODO test wrong/invalid config file

exports.testShutDown = ( test ) ->
	test.expect 1

	isRunning = true
	pth = path.resolve 'js', 'webapi-eca'
	engine = cp.fork pth, [ '-n', '-w', '8640'  ] # [ '-i' , 'warn' ]

	engine.on 'error', ( err ) ->
		console.log err
	engine.on 'exit', ( code, signal ) ->
		test.ok true, 'Engine stopped'
		isRunning = false
		test.done()
	
	fWaitForStartup = () ->
		engine.send 'die'
		setTimeout fWaitForDeath, 5000
		
	# Garbage collect eventually still running process
	fWaitForDeath = () ->
		if isRunning
			test.ok false, '"testShutDown" Engine didn\'t shut down!'
			engine.kill()
			setTimeout test.done, 100

	setTimeout fWaitForStartup, 1000

exports.testKill = ( test ) ->
	test.expect 1

	pth = path.resolve 'js', 'webapi-eca'
	engine = cp.fork pth, [ '-n', '-w', '8641' ] # [ '-i' , 'warn' ]
	engine.on 'error', ( err ) ->
		console.log err

	fWaitForStartup = () ->
		engine.kill()
		setTimeout fWaitForDeath, 1000
		
	# Garbage collect eventually still running process
	fWaitForDeath = () ->
		test.ok engine.killed, '"testKill" Engine didn\'t shut down!'
		test.done()

	setTimeout fWaitForStartup, 1000

exports.testHttpPortAlreadyUsed = ( test ) =>
	test.expect 1
	isRunning = true
	pth = path.resolve 'js', 'webapi-eca'
	
	# Strange! why can't we make these variables local without
	# the tests failing in one of the next tests...
	@engine_one = cp.fork pth, [ '-n', '-w', '8642' ] # [ '-i' , 'warn' ]
	@engine_one.on 'error', ( err ) ->
		console.log err

	fWaitForFirstStartup = () =>
		@engine_two = cp.fork pth, [ '-n', '-w', '8642' ] # [ '-i' , 'warn' ]
		@engine_two.on 'error', ( err ) ->
			console.log err

		@engine_two.on 'exit', ( code, signal ) ->
			test.ok true, 'Engine stopped'
			isRunning = false
			test.done()
	
		setTimeout fWaitForDeath, 12000
	
	# Garbage collect eventually still running process
	fWaitForDeath = () =>
		if isRunning
			test.ok false, '"testHttpPortAlreadyUsed" Engine didn\'t shut down!'
			test.done()

		@engine_one.kill()
		@engine_two.kill()

	setTimeout fWaitForFirstStartup, 1000

exports.testHttpPortInvalid = ( test ) ->
	test.expect 1
	
	isRunning = true
	pth = path.resolve 'js', 'webapi-eca'
	engine = cp.fork pth, [ '-n', '-w', '1' ] # [ '-i' , 'warn' ]
	engine.on 'exit', ( code, signal ) ->
		test.ok true, 'Engine stopped'
		isRunning = false
		test.done()
	engine.on 'error', ( err ) ->
		console.log err

	# Garbage collect eventually still running process
	fWaitForDeath = () ->
		if isRunning
			test.ok false, '"testHttpPortInvalid" Engine didn\'t shut down!'
			test.done()
		# engine.kill()

	setTimeout fWaitForDeath, 12000

exports.testDbPortInvalid = ( test ) ->
	test.expect 1
	
	isRunning = true
	pth = path.resolve 'js', 'webapi-eca'
	engine = cp.fork pth, [ '-n', '-d', '10'] # [ '-i' , 'warn' ]
	engine.on 'error', ( err ) ->
		console.log err
	engine.on 'exit', ( code, signal ) ->
		test.ok true, 'Engine stopped'
		isRunning = false
		test.done()

	# Garbage collect eventually still running process
	fWaitForDeath = () ->
		engine.kill()
		if isRunning
			test.ok false, '"testHttpPortInvalid" Engine didn\'t shut down!'
			test.done()

	setTimeout fWaitForDeath, 12000
