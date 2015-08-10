
###

Serve ACTION DISPATCHERS
========================

###

# **Loads Modules:**

# - [Logging](logging.html)
log = require '../logging'
# - [Persistence](persistence.html)
db = require '../persistence'
# - External Modules: [express](http://expressjs.com/api.html)
express = require 'express'

router = module.exports = express.Router()

router.post '/getall', ( req, res ) ->
	log.info 'SRVC | ACTION DISPATCHERS | Fetching all'
	db.actionDispatchers.getAllModules req.session.pub.username, (err, oADs) ->
		if err
			res.status(500).send err
		else
			res.send oADs
