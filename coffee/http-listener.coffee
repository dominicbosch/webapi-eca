###

HTTP Listener
=============
> Receives the HTTP requests to the server at the given port. The requests
> (bound to a method) are then redirected to the appropriate handler which
> takes care of the request.

###

# **Requires:**

# - [Logging](logging.html)
log = require './logging'

# - [Request Handler](request-handler.html)
requestHandler = require './request-handler'

# - Node.js Modules: [path](http://nodejs.org/api/path.html) and
#   [querystring](http://nodejs.org/api/querystring.html)
path = require 'path'
qs = require 'querystring'

# - External Modules: [express](http://expressjs.com/api.html)
express = require 'express'
app = express()

#RedisStore = require('connect-redis')(express), # TODO use RedisStore for persistent sessions

###
Module call
-----------
Initializes the HTTP listener and its request handler.

@param {Object} args
###
exports = module.exports = ( args ) -> 
  args = args ? {}
  log args
  requestHandler args
  initRouting args[ 'http-port' ]
  module.exports

###
Initializes the request routing and starts listening on the given port.

@param {int} port
@private initRouting( *fShutDown* )
###
initRouting = ( port ) ->
  # Add cookie support for session handling.
  app.use express.cookieParser()
  #TODO The session secret appriach needs to be fixed!
  sess_sec = "149u*y8C:@kmN/520Gt\\v'+KFBnQ!\\r<>5X/xRI`sT<Iw"
  app.use express.session { secret: sess_sec }

  #At the moment there's no redis session backbone (didn't work straight away)
  log.print 'HL', 'no session backbone'

  # **Accepted requests to paths:**

  # GET Requests

  # - **`GET` to _"/"_:** Static redirect to the _"webpages/public"_ directory
  app.use '/', express.static path.resolve __dirname, '..', 'webpages', 'public'
  # - **`GET` to _"/admin"_:** Only admins can issue requests to this handler
  app.get '/admin', requestHandler.handleAdmin
  # - **`GET` to _"/forge\_modules"_:** Webpage that lets the user create modules
  app.get '/forge_modules', requestHandler.handleForgeModules
  # - **`GET` to _"/forge\_rules"_:** Webpage that lets the user create rules
  app.get '/forge_rules', requestHandler.handleForgeRules
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
    app.listen port # inbound event channel
  catch e
    e.addInfo = 'opening port'
    log.error e

###
Adds the shutdown handler to the admin commands.

@param {function} fshutDown
@public addShutdownHandler( *fShutDown* )
###
exports.addShutdownHandler = ( fShutDown ) ->
  requestHandler.addShutdownHandler fShutDown

###
Shuts down the http listener.

@public shutDown()
###
exports.shutDown = () ->
  log.print 'HL', 'Shutting down HTTP listener'
  process.exit() # This is a bit brute force...
