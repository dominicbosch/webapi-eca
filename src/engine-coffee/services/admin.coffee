
###

Administration Service
======================
> Handles admin requests, such as create new user

###

# **Loads Modules:**

# - Node.js Modules: [fs](http://nodejs.org/api/fs.html) and
# [path](http://nodejs.org/api/path.html)
fs = require 'fs'
path = require 'path'

# - [Logging](logging.html)
log = require '../logging'
# - [Persistence](persistence.html)
db = require '../persistence'
# - External Modules: [express](http://expressjs.com/api.html)
express = require 'express'

pathUsers = path.resolve __dirname, '..', '..', 'config', 'users.json'

router = module.exports = express.Router()

router.use '/*', ( req, res, next ) ->
	if req.session.pub.admin is 'true'
		next()
	else
		res.status( 401 ).send 'You are not admin, you böse bueb you!'

router.post '/createuser', ( req, res ) ->
	if req.body.username and req.body.password
		db.getUserIds ( err, arrUsers ) ->
			if arrUsers.indexOf( req.body.username ) > -1
				res.status( 409 ).send 'User already existing!' 
			else
				oUser = 
					username: req.body.username
					password: req.body.password
					admin: req.body.isAdmin
				db.storeUser oUser
				log.info 'New user "' + oUser.username + '" created by "' + req.session.pub.username + '"!'
				res.send 'New user "' + oUser.username + '" created!'
	else
		res.status( 400 ).send 'Missing parameter for this command!' 

router.post '/deleteuser', ( req, res ) ->
	if req.body.username is req.session.pub.username
		res.status( 403 ).send 'You dream du! You really shouldn\'t delete yourself!'
	else
		db.deleteUser req.body.username
		log.info 'User "' + req.body.username + '" deleted by "' + req.session.pub.username + '"!'
		res.send 'User "' + req.body.username + '" deleted!'
		# FIXME we also need to deactivate all running event pollers
