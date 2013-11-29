###

HTTP Listener
=============
> Receives the HTTP requests to the server at the port specified by the
> [config](config.html) file. These requests (bound to a method) are then 
> redirected to the appropriate handler which then takes care of the request.

###

# **Requires:**

# - [Logging](logging.html)
log = require './logging'

# - [Config](config.html)
config = require './config'

# - [User Handler](user_handler.html)
requestHandler = require './request_handler'

# - Node.js Modules: [path](http://nodejs.org/api/path.html) and
#   [querystring](http://nodejs.org/api/querystring.html)
path = require 'path'
qs = require 'querystring'

# - External Modules: [express](http://expressjs.com/api.html)
express = require 'express'
app = express()

#RedisStore = require('connect-redis')(express), # TODO use RedisStore for persistent sessions

# Just to have at least something. I know all of you know it now ;-P
sess_sec = '#C[>;j`@".TXm2TA;A2Tg)'


###
Module call
-----------
Initializes the HTTP Listener and its child modules Logging,
Configuration and Request Handler, then tries to fetch the session
key from the configuration.

@param {Object} args
###
exports = module.exports = ( args ) -> 
  args = args ? {}
  log args
  config args
  requestHandler args
  #TODO check whether this really does what it's supposed to do (fetch wrong sess property)
  sess_sec = config.getSessionSecret() || sess_sec 
  module.exports

exports.addHandlers = ( fShutDown ) ->
  requestHandler.addHandlers fShutDown
  # Add cookie support for session handling.
  app.use express.cookieParser()
  app.use express.session { secret: sess_sec }
  # At the moment there's no redis session backbone (didn't work straight away)
  log.print 'HL', 'no session backbone'

  # **Accepted requests to paths:**

  # GET Requests

  # - **`GET` to _"/"_:** Static redirect to the _"webpages/public"_ directory
  app.use '/', express.static path.resolve __dirname, '..', 'webpages', 'public'
  # - **`GET` to _"/admin"_:** Only admins can issue requests to this handler
  app.get '/admin', requestHandler.handleAdmin
  # - **`GET` to _"/forge\_modules"_:** Webpages that lets the user to create modules
  app.get '/forge_modules', requestHandler.handleForgeModules
  # - **`GET` to _"/invoke\_event"_:** Webpage that lets the user invoke events
  app.get '/invoke_event', requestHandler.handleInvokeEvent

  # POST Requests

  # - **`POST` to _"/event"_:** Events coming from remote systems are passed to the engine
  app.post '/event', requestHandler.handleEvent
  # - **`POST` to _"/login"_:** Credentials will be verified
  app.post '/login', requestHandler.handleLogin
  # - **`POST` to _"/logout"_:** User will be logged out
  app.post '/logout', requestHandler.handleLogout
  # - **`POST` to _"/user"_:** User requests are possible for all users with an account
  app.post '/usercommand', requestHandler.handleUserCommand
  try
    http_port = config.getHttpPort()
    if http_port
      app.listen http_port # inbound event channel
    else
      log.error 'HL', new Error 'No HTTP port found!? Nothing to listen on!...'
  catch e
    e.addInfo = 'opening port'
    log.error e

exports.shutDown = () ->
  log.print 'HL', 'Shutting down HTTP listener'
  process.exit() # This is a bit brute force...

