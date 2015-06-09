
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
								res.status( 500 ).send 'User not persisted!'
							else
								res.send 'New user "' + oUser.username + '" created!'

				fs.readFile pathUsers, 'utf8', fPersistNewUser oUser

	else
		res.status( 401 ).send 'Missing parameter for this command!' 




# # - External Modules: [crypto-js](https://github.com/evanvosberg/crypto-js)
# crypto = require 'crypto-js'

# # Prepare the user command handlers which are invoked via HTTP requests.
# exports = module.exports


# # Register the shutdown handler to the admin command. 
# @objAdminCmds =
# 	shutdown: ( obj, cb ) ->
# 		data =
# 			code: 200
# 			message: 'Shutting down... BYE!'
# 		setTimeout process.exit, 500
# 		cb null, data

