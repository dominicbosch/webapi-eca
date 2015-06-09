
###

User Service
=============
> Manage the user

###

# **Loads Modules:**

# - [Logging](logging.html)
log = require '../logging'
# - [Persistence](persistence.html)
db = require '../persistence'
# - External Modules: [express](http://expressjs.com/api.html)
express = require 'express'

router = module.exports = express.Router()

router.post '/passwordchange', ( req, res ) ->
	db.getUser req.session.pub.username, ( err, oUser ) ->
		if req.body.oldpassword is oUser.password
			oUser.password = req.body.newpassword
			if db.storeUser oUser
				log.info 'SRVC | USER | Password changed for: ' + oUser.username
				res.send 'Password changed!'
			else
				res.status( 401 ).send 'Password changing failed!'
		else
			res.status( 409 ).send 'Wrong password!'

router.post '/getall', ( req, res ) ->
	db.getUserIds ( err, arrUsers ) ->
		if err
			res.status( 500 ).send 'Unable to fetch users!'
		else
			res.send arrUsers
