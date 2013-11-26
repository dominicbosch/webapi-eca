###

HTTP Listener
=============
> Handles the HTTP requests to the server at the port specified by the
> [config](config.html) file.

###

path = require 'path'
express = require 'express'
app = express()
# } RedisStore = require('connect-redis')(express), # TODO use RedisStore for persistent sessions
qs = require 'querystring'

# Requires:

# - The [Logging](logging.html) module
log = require './logging'
# - The [Config](config.html) module
config = require './config'
# - The [User Handler](user_handler.html) module
userHandler = require './user_handler'
sess_sec = '#C[>;j`@".TXm2TA;A2Tg)'


# The module needs to be called as a function to initialize it.
# After that it fetches the http\_port, db\_port & sess\_sec properties
# from the configuration file.
exports = module.exports = ( args ) -> 
  args = args ? {}
  log args
  config args
  userHandler args
  # TODO check whether this really does what it's supposed to do (fetch wrong sess property)
  sess_sec = config.getSessionSecret() || sess_sec 
  module.exports

exports.addHandlers = ( fEvtHandler, fShutDown ) =>
  userHandler.addShutdownHandler fShutDown
  @eventHandler = fEvtHandler
  # Add cookie support for session handling.
  app.use express.cookieParser()
  app.use express.session { secret: sess_sec }
  log.print 'HL', 'no session backbone'
  
  # Redirect the requests to the appropriate handler.
  app.use '/', express.static path.resolve __dirname, '..', 'webpages'
  app.get '/rulesforge', userHandler.handleRequest
  app.get '/admin', userHandler.handleRequest
  app.post '/login', userHandler.handleLogin
  app.post '/push_event', onPushEvent
  try
    http_port = config.getHttpPort()
    if http_port
      app.listen http_port # inbound event channel
    else
      log.error 'HL', new Error 'No HTTP port found!? Nothing to listen on!...'
  catch e
    e.addInfo = 'opening port'
    log.error e

#
# If a post request reaches the server, this function handles it and treats the request as a possible event.
#
onPushEvent = ( req, resp ) =>
  body = ''
  req.on 'data', ( data ) ->
    body += data
  req.on 'end', =>
    obj = qs.parse body
    # If required event properties are present we process the event #
    if obj and obj.event and obj.eventid
      resp.write 'Thank you for the event (' + obj.event + '[' + obj.eventid + '])!'
      @eventHandler obj
    else
      resp.writeHead 400, { "Content-Type": "text/plain" }
      resp.write 'Your event was missing important parameters!'
    resp.end()


exports.shutDown = () ->
  log.print 'HL', 'Shutting down HTTP listener'
  process.exit() # This is a bit brute force...

