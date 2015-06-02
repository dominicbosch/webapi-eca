
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
router.post '/get/:id', ( req, res ) ->
	log.warn 'SRVC | WEBHOOKS | implemnt get id'
	db.getAllUserWebhookNames req.session.username, ( arr ) ->
		log.info 'Webhooks' + JSON.stringify arr
	res.send 'TODO!'

router.post '/getall', ( req, res ) ->
	log.warn 'SRVC | WEBHOOKS | implemnt getAll'
	db.getAllUserWebhookNames req.session.username, ( arr ) ->
		log.info 'Webhooks' + JSON.stringify arr
	res.send 'TODO!'

router.post '/create/:id', ( req, res ) ->
	log.warn 'SRVC | WEBHOOKS | implemnt create Id'
	db.getAllUserWebhookNames req.session.username, ( arr ) ->
		log.info 'Webhooks' + JSON.stringify arr
	res.send 'TODO!'


router.post '/delete/:id', ( req, res ) ->
	log.warn 'SRVC | WEBHOOKS | implemnt delete id'
	db.getAllUserWebhookNames req.session.username, ( arr ) ->
		log.info 'Webhooks' + JSON.stringify arr
	res.send 'TODO!'