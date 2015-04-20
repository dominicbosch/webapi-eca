###

Request Handler
============
> The request handler (surprisingly) handles requests made through HTTP to
> the [HTTP Listener](http-listener.html). It will handle user requests for
> pages as well as POST requests such as user login, module storing, event
> invocation and also admin commands.

###

# **Loads Modules:**

# - [Logging](logging.html)
log = require './logging'
# - [Persistence](persistence.html)
db = require './persistence'

# - Node.js Modules: [fs](http://nodejs.org/api/fs.html),
#   [path](http://nodejs.org/api/path.html) and
fs = require 'fs'
path = require 'path'

# - External Modules: [mustache](https://github.com/janl/mustache.js) and
#   [crypto-js](https://github.com/evanvosberg/crypto-js)
mustache = require 'mustache'
crypto = require 'crypto-js'

pathUsers = path.resolve __dirname, '..', 'config', 'users.json'

# Prepare the user command handlers which are invoked via HTTP requests.
dirHandlers = path.resolve __dirname, '..', 'webpages', 'handlers'
exports = module.exports
exports.init = ( args ) => 

	# Register the shutdown handler to the admin command. 
	@objAdminCmds =
		shutdown: ( obj, cb ) ->
			data =
				code: 200
				message: 'Shutting down... BYE!'
			setTimeout args[ 'shutdown-function' ], 500
			cb null, data

		newuser: ( obj, cb ) ->
			data =
				code: 200
				message: 'User stored thank you!'
			if obj.username and obj.password
				if obj.roles
					try
						roles = JSON.parse obj.roles
					catch err
						log 'RH | error parsing newuser roles: ' + err.message
						roles = []
				else
					roles = []
				oUser = 
					username: obj.username
					password: obj.password
					roles: roles
				db.storeUser oUser

				fPersistNewUser = ( username, password, roles ) ->
					( err, data ) -> 
						users = JSON.parse data
						users[ username ] =
							password: password
							roles: roles
						fs.writeFile pathUsers, JSON.stringify( users, undefined, 2 ), 'utf8', ( err ) ->
							if err
								log.error "RH | Unable to write new user file! "
								log.error err

				fs.readFile pathUsers, 'utf8', fPersistNewUser obj.username, obj.password, roles
			else
				data.code = 401
				data.message = 'Missing parameter for this command' 
			cb null, data

	# Load the standard users from the user config file
	users = JSON.parse fs.readFileSync pathUsers, 'utf8'
	fStoreUser = ( username, oUser ) ->
		oUser.username = username
		db.storeUser oUser
	fStoreUser user, oUser for user, oUser of users


	@allowedHooks = {}
	db.getAllWebhooks ( err, oHooks ) =>
		if oHooks
			log.info "RH | Initializing #{ Object.keys( oHooks ).length } Webhooks"  
			@allowedHooks = oHooks
	module.exports


###
Handles possible events that were posted to this server and pushes them into the
event queue.
@public handleEvent( *req, resp* )
###
exports.handleEvent = ( req, resp ) ->
	body = ''
	req.on 'data', ( data ) ->
		body += data

	req.on 'end', ->
		try
			obj = JSON.parse body
		catch err
			resp.send 400, 'Badly formed event!'
		# If required event properties are present we process the event #
		if obj and obj.eventname and not err
			answ =
				code: 200
				message: "Thank you for the event: #{ obj.eventname }"
			resp.send answ.code, answ
			db.pushEvent obj
		else
			resp.send 400, 'Your event was missing important parameters!'


###
Resolves the path to a handler webpage.

@private getHandlerPath( *name* )
@param {String} name
###
getHandlerPath = ( name ) ->
	path.join dirHandlers, name + '.html'

###
Fetches a template.

@private getTemplate( *name* )
@param {String} name
###
getTemplate = ( name ) ->
	pth = path.join dirHandlers, 'templates', name + '.html'
	fs.readFileSync pth, 'utf8'
	
###
Fetches a script.

@private getScript( *name* )
@param {String} name
###
getScript = ( name ) ->
	pth = path.join dirHandlers, 'js', name + '.js'
	fs.readFileSync pth, 'utf8'
	
###
Fetches remote scripts snippets.

@private getRemoteScripts( *name* )
@param {String} name
###
getRemoteScripts = ( name ) ->
	pth = path.join dirHandlers, 'remote-scripts', name + '.html'
	fs.readFileSync pth, 'utf8'
	
###
Renders a page, with helps of mustache, depending on the user session and returns it.

@private renderPage( *name, sess, msg* )
@param {String} name
@param {Object} sess
@param {Object} msg
###
renderPage = ( name, req, resp, msg ) ->
	# Grab the skeleton
	pathSkel = path.join dirHandlers, 'skeleton.html'
	skeleton = fs.readFileSync pathSkel, 'utf8'
	code = 200
	data =
		message: msg
		user: req.session.user

	# Try to grab the script belonging to this page. But don't bother if it's not existing
	try
		script = getScript name
	# Try to grab the remote scripts belonging to this page. But don't bother if it's not existing
	try
		remote_scripts = getRemoteScripts name

	# Now try to find the page the user requested.
	try
		content = getTemplate name
	catch err
		# If the page doesn't exist we return the error page, load the error script into it
		# and render the error page with some additional data
		content = getTemplate 'error'
		script = getScript 'error'
		code = 404
		data.message = 'Invalid Page!'

	if req.session.user
		menubar = getTemplate 'menubar'

	pageElements =
		content: content
		script: script
		remote_scripts: remote_scripts
		menubar: menubar

	# First we render the page by including all page elements into the skeleton
	page = mustache.render skeleton, pageElements

	# Then we complete the rendering by adding the data, and send the result to the user
	resp.send code, mustache.render page, data

###
Present the desired forge page to the user.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleForge( *req, resp* )
###
exports.handleForge = ( req, resp ) ->
	page = req.query.page
	if not req.session.user
		page = 'login'
	renderPage page, req, resp


###
Handles the admin command requests.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleAdminCommand( *req, resp* )
###
exports.handleAdminCommand = ( req, resp ) =>
	if req.session and
			req.session.user and
			req.session.user.roles.indexOf( "admin" ) > -1
		body = ''
		req.on 'data', ( data ) ->
			body += data
		req.on 'end', =>
			console.log 'RH | body is ' + typeof body
			obj = body
			# obj = qs.parse body
			@log.info 'RH | Received admin request: ' + obj.command
			arrCmd = obj.command.split( ' ' )
			if not arrCmd[ 0 ] or not @objAdminCmds[ arrCmd[ 0 ] ]
				resp.send 404, 'Command unknown!'
			else
				arrParams = arrCmd.slice 1
				oParams = {}
				for keyVal in arrParams
					arrKV = keyVal.split ":"
					if arrKV.length is 2
						oParams[ arrKV[ 0 ] ] = arrKV[ 1 ]
				@objAdminCmds[ arrCmd[ 0 ] ] oParams, ( err, obj ) ->
					resp.send obj.code, obj
	else
		resp.send 401, 'You need to be logged in as admin!'


###
Handles webhook posts
###
exports.handleWebhooks = ( req, resp ) =>
	hookid = req.url.substring( 10 ).split( '/' )[ 0 ]
	oHook = @allowedHooks[ hookid ]
	if oHook
		body = ''
		req.on 'data', ( data ) ->
			body += data
		req.on 'end', () ->
			obj =
				eventname: oHook.hookname
				body: body
			if oHook.username
				obj.username = oHook.username
			db.pushEvent obj
			resp.send 200, JSON.stringify
				message: "Thank you for the event: '#{ oHook.hookname }'"
				evt: obj
	else
		resp.send 404, "Webhook not existing!"


# Activate a webhook. the body will be JSON parsed, the name of the webhook will
# be the event name given to the event object, a timestamp will be added
exports.activateWebhook = ( user, hookid, name ) =>
	@log.info "HL | Webhook '#{ hookid }' activated"
	@allowedHooks[ hookid ] =
		hookname: name
		username: user


# Deactivate a webhook
exports.deactivateWebhook = ( hookid ) =>
	@log.info "HL | Webhook '#{ hookid }' deactivated"
	delete @allowedHooks[ hookid ]
