http = require 'http'
path = require 'path'
events = require 'events'
cp = require 'child_process'
logger = require path.join '..', 'js-coffee', 'logging'
log = logger.getLogger
  nolog: true
i = 0

createRequest = ( query, origUrl ) ->
  req = new events.EventEmitter()
  req.query = query
  req.originalUrl = origUrl
  req.session = {}
  req

createLoggedInRequest = ( query, origUrl ) ->
  req = createRequest()
  req.session =
    user:
      name: 'unittester'
  req

createAdminRequest = ( query, origUrl ) ->
  req = createRequest()
  req.session =
    user:
      name: 'adminunittester'
      isAdmin: true
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

exports.setUp = ( cb ) =>
  @rh = require path.join '..', 'js-coffee', 'request-handler'
  cb()

# test: ( test ) ->
#   test.expect 1

#   args =
#     logger: log
#   args[ 'request-service' ] = ( usr, obj, cb ) ->
#     console.log 'got a request to answer!'
#   args[ 'shutdown-function' ] = () ->
#     console.log 'request handler wants us to shutdown!'
#   @rh args

#   test.ok true, 'yay'
#   test.done()

exports.events =
  setUp: ( cb ) =>
    @db = require path.join '..', 'js-coffee', 'persistence'
    args = 
      logger: log 
    args[ 'db-port' ] = 6379
    @db args
    cb()

  tearDown: ( cb ) =>
    @db.shutDown()
    cb()

  testEvent: ( test ) =>
    test.expect 1

    doPolling = true
    fPollEventQueue = ( cb ) =>
      console.log 'polling'
      if doPolling
        @db.popEvent cb
        setTimeout fPollEventQueue, 5

    fPollEventQueue ( err, obj ) ->
      console.log 'got something? :'
      console.log err
      console.log obj

    args =
      logger: log
    args[ 'request-service' ] = ( usr, obj, cb ) ->
      test.ok false, 'testEvent should not cause a service request call'
    args[ 'shutdown-function' ] = () ->
      test.ok false, 'testEvent should not cause a system shutdown'
    @rh args

    evt = 'event=unittest&eventid=unittest0'
    req = createRequest()
    console.log req
    resp = createResponse ( code, msg ) ->
      console.log 'got response: ' + msg
      doPolling = false
    @rh.handleEvent req, resp
    fWait = () ->
      postRequestData req, evt
      
    setTimeout fWait, 50
    # req.emit 'data', evt
    # req.emit 'end'


    test.ok true, 'yay'
    test.done()

