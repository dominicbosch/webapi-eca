###

HTTP Listener
=============
> Receives the HTTP requests to the server at the given port. The requests
> (bound to a method) are then redirected to the appropriate handler which
> takes care of the request.

###

# **Loads Modules:**

# - [Request Handler](request-handler.html)
requestHandler = require './request-handler'
# - [Persistence](persistence.html)
db = require './persistence'

# - Node.js Modules: [path](http://nodejs.org/api/path.html) and
#   [querystring](http://nodejs.org/api/querystring.html)
path = require 'path'
qs = require 'querystring'
fs = require 'fs'
path = require 'path'

# - External Modules: [express](http://expressjs.com/api.html)
express = require 'express'
app = express()

#TODO use RedisStore for persistent sessions
#RedisStore = require('connect-redis')(express),

###
Module call
-----------
Initializes the HTTP listener and its request handler.

@param {Object} args
###
exports = module.exports = ( args ) =>
	@log = args.logger
	@arrWebhooks = args.webhooks
	@shutDownSystem = args[ 'shutdown-function' ]
	requestHandler args
	initRouting args[ 'http-port' ]
	module.exports

indexEvent = ( event, body, resp ) ->
		if typeof body is 'string'
			try
				obj = qs.parse body
			catch err
				try
					obj = JSON.parse body
				catch err
					resp.send 400, 'Badly formed event!'
					return
		else
			obj = body
		timestamp = ( new Date() ).toISOString()
		rand = ( Math.floor Math.random() * 10e9 ).toString( 16 ).toUpperCase()
		obj.event = event
		obj.eventid = "#{ obj.event }_UTC|#{ timestamp }_#{ rand }"
		db.pushEvent obj
		resp.send 200, "Thank you for the event: #{ obj.eventid }"

# Activate a webhook. the body will be JSON parsed, the name of the webhook will
# be the event name given to the event object, a timestamp will be added
activateWebHook = ( app, name ) =>
	@log.info "HL | Webhook activated for #{ name }"
	app.post "/webhooks/#{ name }", ( req, resp ) ->
		body = ''
		req.on 'data', ( data ) ->
			body += data

		req.on 'end', ->
			indexEvent name, body, resp
			# This is a hack to quickly allow storing of public accessible data
			if name is 'uptimestatistics'
				fPath = path.resolve __dirname, '..', 'webpages', 'public', 'data', 'histochart.json'
				fs.writeFile fPath, JSON.stringify( JSON.parse( body ), undefined, 2 ), 'utf8'

###
Initializes the request routing and starts listening on the given port.

@param {int} port
@private initRouting( *fShutDown* )
###
initRouting = ( port ) =>
	# Add cookie support for session handling.
	app.use express.cookieParser()
	#TODO The session secret approach needs to be fixed!
	sess_sec = "149u*y8C:@kmN/520Gt\\v'+KFBnQ!\\r<>5X/xRI`sT<Iw"
	app.use express.session { secret: sess_sec }

	#At the moment there's no redis session backbone (didn't work straight away)
	@log.info 'HL | no session backbone'

	# **Accepted requests to paths:**

	# GET Requests

	# - **`GET` to _"/"_:** Static redirect to the _"webpages/public"_ directory
	app.use '/', express.static path.resolve __dirname, '..', 'webpages', 'public'
	# - **`GET` to _"/admin"_:** Displays the admin console if user is admin
	app.get '/admin', requestHandler.handleAdmin
	# - **`GET` to _"/forge"_:** Displays different forge pages
	app.get '/forge', requestHandler.handleForge

	# POST Requests

	# - **`POST` to _"/event"_:** Events coming from remote systems are passed to the engine
	app.post '/event', requestHandler.handleEvent
	# - **`POST` to _"/login"_:** Credentials will be verified
	app.post '/login', requestHandler.handleLogin
	# - **`POST` to _"/logout"_:** User will be logged out
	app.post '/logout', requestHandler.handleLogout
	# - **`POST` to _"/usercommand"_:** User requests are possible for all users with an account
	app.post '/usercommand', requestHandler.handleUserCommand
	# - **`POST` to _"/admincommand"_:** Admin requests are only possible for admins
	app.post '/admincommand', requestHandler.handleAdminCommand
	# - **`POST` to _"/webhooks/*"_:** Webhooks can be added in the config file
	activateWebHook app, hookName for hookName in @arrWebhooks 

	server = app.listen parseInt( port ) || 8111 # inbound event channel

	server.on 'listening', () =>
		addr = server.address()
		if addr.port isnt port
			@shutDownSystem()
	server.on 'error', ( err ) =>
		###
		Error handling of the express port listener requires special attention,
		thus we have to catch the error, which is issued if the port is already in use.
		###
		switch err.errno
			when 'EADDRINUSE'
				@log.error err, 'HL | http-port already in use, shutting down!'
			when 'EACCES'
				@log.error err, 'HL | http-port not accessible, shutting down!'
			else
				@log.error err, 'HL | Error in server, shutting down!'
		@shutDownSystem()


#
# Shuts down the http listener.
# There's no way to gracefully stop express from running, thus we
# call process.exit() at the very end of our existance.
# ... but process.exit cancels the unit tests ...
# thus we do it in the main module and use a cli flag for the unit tests 
#
# exports.shutDown = () =>
#   log?.warn 'HL | Shutting down HTTP listener'
#   console.log 'exiting...'
#   process.exit()

