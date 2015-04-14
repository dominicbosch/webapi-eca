###

HTTP Listener
=============
> Receives the HTTP requests to the server at the given port. The requests
> (bound to a method) are then redirected to the appropriate handler which
> takes care of the request.

###

# **Loads Modules:**

# - [Logging](logging.html)
log = require './logging'
# - [Request Handler](request-handler.html)
requestHandler = require './request-handler'
# - [Persistence](persistence.html)
db = require './persistence'

serveSession = require './serve-session'
serveRules = require './serve-rules'
serveWebhooks = require './serve-webhooks'
serveCodePlugins = require './serve-codeplugins'
serveAdmin = require './serve-admin'

# - Node.js Modules: [path](http://nodejs.org/api/path.html)
path = require 'path'

# - External Modules: [express](http://expressjs.com/api.html)
#   [body-parser](https://github.com/expressjs/body-parser)

express = require 'express'
session = require 'express-session'
bodyParser = require 'body-parser'

app = express()

###
Module call
-----------
Initializes the HTTP listener and its request handler.

@param {Object} args
###
exports = module.exports
exports.init = ( args ) =>
	@shutDownSystem = args[ 'shutdown-function' ]
	requestHandler.init args
	initRouting args[ 'http-port' ]

###
Initializes the request routing and starts listening on the given port.

@param {int} port
@private initRouting( *fShutDown* )
###
initRouting = ( port ) =>
	sess_sec = "149u*y8C:@kmN/520Gt\\v'+KFBnQ!\\r<>5X/xRI`sT<Iw"
	sessionMiddleware = session 
		secret: sess_sec
		resave: false
		saveUninitialized: true
	app.use sessionMiddleware

	app.use bodyParser.json()
	app.use bodyParser.urlencoded extended: true

	#At the moment there's no redis session backbone (didn't work straight away)
	log.info 'HL | no session backbone'

	# **Accepted requests to paths:**

	# GET Requests

	# - **`GET` to _"/"_:** Static redirect to the _"webpages/public"_ directory
	app.use '/', express.static path.resolve __dirname, '..', 'webpages', 'public'
	# - **`GET` to _"/admin"_:** Displays the admin console if user is admin
	app.get '/admin', requestHandler.handleAdmin
	# - **`GET` to _"/forge"_:** Displays different forge pages
	app.get '/forge', requestHandler.handleForge

	# POST Requests

	# - **`POST` to _"/session"_:** Session handling
	app.use '/session', serveSession
	app.use '/rules', serveRules
	app.use '/webhooks', serveWebhooks
	app.use '/codeplugin', serveCodePlugins
	app.use '/admin', serveAdmin
	# - **`POST` to _"/usercommand"_:** User requests are possible for all users with an account
	# app.use '/usercommand', @userCommandRouter

	## FIXME remove all redundant routes

	# - **`POST` to _"/admincommand"_:** Admin requests are only possible for admins
	app.post '/admincommand', requestHandler.handleAdminCommand
	# - **`POST` to _"/event/*"_:** event posting, mainly a webhook for the webpage
	app.post '/event', requestHandler.handleEvent
	# - **`POST` to _"/webhooks/*"_:** Webhooks retrieve remote events
	app.post '/webhooks/*', requestHandler.handleWebhooks

	prt = parseInt( port ) || 8111 # inbound event channel
	server = app.listen prt
	log.info "HL | Started listening on port #{ prt }"

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
				log.error err, 'HL | http-port already in use, shutting down!'
			when 'EACCES'
				log.error err, 'HL | http-port not accessible, shutting down!'
			else
				log.error err, 'HL | Error in server, shutting down!'
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

