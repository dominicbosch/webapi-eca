
###

Serve Code Plugin
=================
> Answers code plugin requests from the user

###

# **Loads Modules:**

# - [Logging](logging.html)
log = require './logging'
# - [Persistence](persistence.html)
db = require './persistence'
# - External Modules: [express](http://expressjs.com/api.html)
express = require 'express'

router = module.exports = express.Router()


###
Present the admin console to the user if he's allowed to see it.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleForge( *req, resp* )
###
router.post 'get', ( req, resp ) ->
	if not req.session.user
		page = 'login'
	#TODO isAdmin should come from the db role
	else if req.session.user.roles.indexOf( "admin" ) is -1
		page = 'login'
		msg = 'You need to be admin for this page!'
	else
		page = 'admin'
	renderPage page, req, resp, msg
