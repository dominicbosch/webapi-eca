
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
router.post '/get/:name', ( req, res ) ->
	log.info 'SRVC | WEBHOOKS | implemnt getAll'
	db.getAllUserWebhookNames req.session.username, ( arr ) ->
		log.info 'Webhooks' + JSON.stringify arr
	res.send 'TODO!'