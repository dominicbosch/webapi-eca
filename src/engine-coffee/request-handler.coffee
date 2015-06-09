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

# - External Modules: [crypto-js](https://github.com/evanvosberg/crypto-js)
crypto = require 'crypto-js'

pathUsers = path.resolve __dirname, '..', 'config', 'users.json'

# Prepare the user command handlers which are invoked via HTTP requests.
dirHandlers = path.resolve __dirname, '..', 'webpages', 'handlers'
exports = module.exports
exports.init = () ->
	# Load the standard users from the user config file
	users = JSON.parse fs.readFileSync pathUsers, 'utf8'
	fStoreUser = ( username, oUser ) ->
		oUser.username = username
		db.storeUser oUser
	fStoreUser user, oUser for user, oUser of users



# Register the shutdown handler to the admin command. 
@objAdminCmds =
	shutdown: ( obj, cb ) ->
		data =
			code: 200
			message: 'Shutting down... BYE!'
		setTimeout process.exit, 500
		cb null, data

	newuser: ( obj, cb ) ->
		data =
			code: 200
			message: 'User stored thank you!'
		if obj.username and obj.password
			oUser = 
				username: obj.username
				password: obj.password
				admin: (obj.admin is true)
			db.storeUser oUser

			fPersistNewUser = ( oUser ) ->
				( err, data ) -> 
					users = JSON.parse data
					users[ oUser.username ] =
						password: oUser.password
						admin: oUser.admin
					fs.writeFile pathUsers, JSON.stringify( users, undefined, 2 ), 'utf8', ( err ) ->
						if err
							log.error "RH | Unable to write new user file! "
							log.error err

			fs.readFile pathUsers, 'utf8', fPersistNewUser oUser
		else
			data.code = 401
			data.message = 'Missing parameter for this command' 
		cb null, data




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
			req.session.user.admin
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
		resp.status( 401 ).send 'You need to be logged in as admin!'
