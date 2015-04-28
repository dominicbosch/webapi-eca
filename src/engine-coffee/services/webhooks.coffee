
###

Serve Webhooks
==============
> Answers webhook requests from the user

###

# **Loads Modules:**

# - [Logging](logging.html)
log = require '../logging'
# - [Persistence](persistence.html)
db = require '../persistence'
# - External Modules: [express](http://expressjs.com/api.html)
express = require 'express'

router = module.exports = express.Router()

###
A post request retrieved on this handler causes the user object to be
purged from the session, thus the user will be logged out.
###
router.post '/getAll', ( req, res ) ->
	log.debug 'SRVC | WEBHOOKS | implemnt getAll'
	res.send 'TODO!'