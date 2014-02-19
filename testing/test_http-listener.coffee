
path = require 'path'
needle = require 'needle'
logger = require path.join '..', 'js-coffee', 'logging'
log = logger.getLogger
  nolog: true


exports.testShutDown = ( test ) =>
  test.expect 1

  http = require path.join '..', 'js-coffee', 'http-listener'
  http.addShutdownHandler () ->
    console.log 'shutdown handler called!'
    http.shutDown()
    test.done()
    process.exit()
  args = {
    logger: log
  }
  args[ 'http-port' ] = 8080
  http args
  test.ok true, 'yay'

  fWait = () ->

    needle.get 'localhost:8080/forge_modules', (err, resp, body) ->
      console.log 'http'
      # console.log http
      # console.log test
      # console.log err
      # console.log resp
      # console.log body
      test.done()
      if err
        console.log 'got an error on request'
        console.log err
      else
        console.log 'no err'
        if resp and resp.statusCode is 200
          console.log 'yay got valid answer'
        else console.log 'got an'
      try
        console.log 'trying to shutdown'
        console.log http
        http.shutDown()
      catch e
        console.log e
        

  setTimeout fWait, 1000

exports.testWrongPort = ( test ) =>
  test.expect 1
  test.ok true, 'yay'
  test.done()
  # http = require path.join '..', 'js-coffee', 'http-listener'
  # http.addShutDownHandler () ->
    
  #   test.done()
  # engine = cp.fork pth, [ '-n' ] # [ '-i' , 'warn' ]

  # engine.on 'exit', ( code, signal ) ->
  #   test.ok true, 'Engine stopped'
  #   isRunning = false
  #   test.done()
  
  # fWaitForStartup = () ->
  #   engine.send 'die'
  #   setTimeout fWaitForDeath, 5000
    
  # # Garbage collect eventually still running process
  # fWaitForDeath = () ->
  #   if isRunning
  #     test.ok false, '"testShutDown" Engine didn\'t shut down!'
  #     engine.kill()
  #     test.done()

  # setTimeout fWaitForStartup, 1000
