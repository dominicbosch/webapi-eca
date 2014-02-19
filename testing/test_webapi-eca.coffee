
cp = require 'child_process'
path = require 'path'

# exports.setUp = ( cb ) =>
#   cb()
  
# exports.tearDown = ( cb ) =>
#   @engine.send('die')
#   cb()

# # TODO wrong db-port or http-port will make the engine stop properly before starting
# # goes hand in hand with wrong config file
# # http command shutdown does it properly, as well as sending the process the die command

exports.testShutDown = ( test ) =>
  test.expect 1

  isRunning = true
  pth = path.resolve 'js-coffee', 'webapi-eca'
  engine = cp.fork pth, [ '-n' ] # [ '-i' , 'warn' ]

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
      test.ok false, 'Engine didn\'t shut down!'
      engine.kill()
      test.done()

  setTimeout fWaitForStartup, 1000

exports.testKill = ( test ) =>
  test.expect 1

  pth = path.resolve 'js-coffee', 'webapi-eca'
  engine = cp.fork pth, [ '-n' ] # [ '-i' , 'warn' ]
  
  fWaitForStartup = () ->
    engine.kill()
    setTimeout fWaitForDeath, 1000
    
  # Garbage collect eventually still running process
  fWaitForDeath = () ->
    test.ok engine.killed, 'Engine didn\'t shut down!'
    test.done()

  setTimeout fWaitForStartup, 1000

exports.testHttpPortAlreadyUsed = ( test ) =>
  test.expect 1
  isRunning = true
  pth = path.resolve 'js-coffee', 'webapi-eca'
  @engine_one = cp.fork pth, ['-n'] # [ '-i' , 'warn' ]

  fWaitForFirstStartup = () =>
    @engine_two = cp.fork pth, ['-n'] # [ '-i' , 'warn' ]

    @engine_two.on 'exit', ( code, signal ) ->
      test.ok true, 'Engine stopped'
      isRunning = false
      test.done()
  
    setTimeout fWaitForDeath, 3000
  
  # Garbage collect eventually still running process
  fWaitForDeath = () =>
    if isRunning
      test.ok false, 'Engine didn\'t shut down!'
      test.done()

    @engine_one.kill()
    @engine_two.kill()

  setTimeout fWaitForFirstStartup, 1000

exports.testHttpPortInvalid = ( test ) =>
  test.expect 1
  
  isRunning = true
  pth = path.resolve 'js-coffee', 'webapi-eca'
  engine = cp.fork pth, ['-n', '-w', '-1'] # [ '-i' , 'warn' ]
  engine.on 'exit', ( code, signal ) ->
    test.ok true, 'Engine stopped'
    isRunning = false
    test.done()

  # Garbage collect eventually still running process
  fWaitForDeath = () =>
    if isRunning
      test.ok false, 'Engine didn\'t shut down!'
      test.done()

    engine.kill()

  setTimeout fWaitForDeath, 1000
