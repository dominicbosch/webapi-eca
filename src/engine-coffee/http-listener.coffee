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

# - Node.js Modules: [path](http://nodejs.org/api/path.html) and
# 	[fs](http://nodejs.org/api/fs.html)
path = require 'path'
fs = require 'fs'

# - External Modules: [express](http://expressjs.com/api.html)
#   [body-parser](https://github.com/expressjs/body-parser)
#	[swig](http://paularmstrong.github.io/swig/)

express = require 'express'
session = require 'express-session'
bodyParser = require 'body-parser'
swig = require 'swig'

app = express()

###
Initializes the request routing and starts listening on the given port.

@param {int} port
@private initRouting( *fShutDown* )
###
exports.init = ( conf ) =>
	requestHandler.init()

	if conf.mode is 'productive'
		process.on 'uncaughtException', ( e ) ->
			log.error 'This is a general exception catcher, but should really be removed in the future!'
			log.error 'Error: '
			log.error e
	else
		app.set 'view cache', false
		swig.setDefaults cache: false

	app.engine 'html', swig.renderFile
	app.set 'view engine', 'html'
	app.set 'views', __dirname + '/views'

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

	# **Requests Routing table:**

	
	# Redirect the views that will be loaded by the swig templating engine
	app.get '/', ( req, res ) ->
		res.render 'index', req.session.pub

	app.get '/views/*', ( req, res ) ->
		res.render req.params[ 0 ], req.session.pub

	# - ** _"/"_:** Static redirect to the _"webpages/public"_ directory
	app.use '/', express.static path.resolve __dirname, '..', 'static'

	# Dynamically load all services from the services folder
	log.info 'LOADING WEB SERVICES: '
	arrServices = fs.readdirSync( path.resolve __dirname, 'services' ).filter ( d ) ->
		d.substring( d.length - 3 ) is '.js'

	for fileName in arrServices
		log.info '  -> ' + fileName
		servicePath = fileName.substring 0, fileName.length - 3
		app.use '/service/' + servicePath, require path.resolve __dirname, 'services', fileName

	# - **`GET` to _"/forge"_:** Displays different forge pages
	app.get '/forge', requestHandler.handleForge


	## FIXME remove all redundant routes

	app.post '/admincommand', requestHandler.handleAdminCommand
	# - **`POST` to _"/event/*"_:** event posting, mainly a webhook for the webpage
	app.post '/event', requestHandler.handleEvent
	# - **`POST` to _"/webhooks/*"_:** Webhooks retrieve remote events
	app.post '/webhooks/*', requestHandler.handleWebhooks

	# If the routing is getting down here, then we didn't find anything to do and
	# tell the user that he ran into a 404, Not found
	app.get '*', ( req, res, next ) ->
		err = new Error()
		err.status = 404
		next err

	# Handle 404 errors
	app.use ( err, req, res, next ) ->
		res.status 404 
		res.render 'error'

	prt = parseInt( conf[ 'http-port' ] ) || 8111 # inbound event channel
	server = app.listen prt
	log.info "HL | Started listening on port #{ prt }"

	server.on 'listening', () =>
		addr = server.address()
		if addr.port isnt conf[ 'http-port' ]
			log.error addr.port, conf[ 'http-port' ]
			log.error 'HL | OPENED HTTP-PORT IS NOT WHAT WE WANTED!!! Shutting down!'
			process.exit()

	server.on 'error', ( err ) =>
		###
		Error handling of the express port listener requires special attention,
		thus we have to catch the error, which is issued if the port is already in use.
		###
		switch err.errno
			when 'EADDRINUSE'
				log.error err, 'HL | HTTP-PORT ALREADY IN USE!!! Shutting down!'
			when 'EACCES'
				log.error err, 'HL | HTTP-PORT NOT ACCSESSIBLE!!! Shutting down!'
			else
				log.error err, 'HL | UNHANDLED SERVER ERROR!!! Shutting down!'
		process.exit()



