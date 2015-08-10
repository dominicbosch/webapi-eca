
###

Serve Session
=============
> Answers session requests from the user

###

# **Loads Modules:**

# - [Logging](logging.html)
log = require '../logging'
# - [Persistence](persistence.html)
db = require '../persistence'
# - [Encryption](encryption.html)
encryption = require '../encryption'
# - External Modules: [express](http://expressjs.com/api.html)
express = require 'express'

router = module.exports = express.Router()

###
Associates the user object with the session if login is successful.
###
router.post '/login', ( req, res ) =>
	db.loginUser req.body.username, req.body.password, ( err, usr ) =>
		if err
			# Tapping on fingers, at least in log...
			log.warn "RH | AUTH-UH-OH ( #{ req.body.username } ): #{ err.message }"
		else
			# no error, so we can associate the user object from the DB to the session
			req.session.pub = usr
		if req.session.pub
			res.send 'OK!'
		else
			res.status( 401 ).send 'NO!'

###
A post request retrieved on this handler causes the user object to be
purged from the session, thus the user will be logged out.
###
router.post '/logout', ( req, res ) ->
	if req.session 
		delete req.session.pub
		res.send 'Bye!'

router.post '/publickey', ( req, res ) ->
	res.send encryption.getPublicKey()
