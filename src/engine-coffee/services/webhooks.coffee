
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
	db.getAllUserWebhooks req.session.pub.username, ( err, arr ) ->
		log.info 'Webhooks' + JSON.stringify arr
	res.send 'TODO!'

router.post '/getall', ( req, res ) ->
	log.warn 'SRVC | WEBHOOKS | implemnt getAll'
	db.getAllUserWebhooks req.session.pub.username, ( err, arr ) ->
		if err
			res.status( 500 ).send 'Fetching all webhooks failed'
		else
			res.send arr

router.post '/create', ( req, res ) ->
	if not req.body.hookname
		res.status( 400 ).send 'Please provide event name'
	else
		user = req.session.pub;
		console.log req.body
		db.getAllUserWebhooks user.username, ( err, arrHooks ) =>
			hookExists = false
			hookExists = true for hookid, hookname of arrHooks when hookname is req.body.hookname
			if hookExists
				res.status( 409 ).send 'Webhook already existing: ' + req.body.hookname
			else
				db.getAllWebhookIDs ( err, arrHooks ) ->
					genHookID = ( arrHooks ) ->
						hookid = ''
						for i in [ 0..1 ]
							hookid += Math.random().toString( 36 ).substring 2
						if arrHooks and arrHooks.indexOf( hookid ) > -1
							hookid = genHookID arrHooks
						hookid
					hookid = genHookID arrHooks
					db.createWebhook user.username, hookid, req.body.hookname, (req.body.isPublic is 'true')
					# rh.activateWebhook user.username, hookid, req.body.hookname
					res.status( 200 ).send
						hookid: hookid
						hookname: req.body.hookname


router.post '/delete/:id', ( req, res ) ->
	log.warn 'SRVC | WEBHOOKS | implemnt delete id'
	db.getAllUserWebhooks req.session.username, ( arr ) ->
		log.info 'Webhooks' + JSON.stringify arr
	res.send 'TODO!'