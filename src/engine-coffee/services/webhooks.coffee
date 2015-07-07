
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

allowedHooks = {}
db.getAllWebhooks ( err, oHooks ) =>
	if oHooks
		log.info "SRVC | WEBHOOKS | Initializing #{ Object.keys( oHooks ).length } Webhooks"  
		allowedHooks = oHooks

# # User requests a webhook
# router.post '/get/:id', ( req, res ) ->
# 	log.warn 'SRVC | WEBHOOKS | implement get id'
# 	db.getAllUserWebhooks req.session.pub.username, ( err, arr ) ->
# 		log.info 'Webhooks' + JSON.stringify arr
# 	res.send 'TODO!'

# User fetches all his existing webhooks
router.post '/getallvisible', ( req, res ) ->
	log.info 'SRVC | WEBHOOKS | Fetching all Webhooks'
	db.getAllVisibleWebhooks req.session.pub.username, ( err, arr ) ->
		if err
			res.status( 500 ).send 'Fetching all webhooks failed'
		else
			res.send arr

# User wants to create a new webhook
router.post '/create', ( req, res ) ->
	if not req.body.hookname
		res.status( 400 ).send 'Please provide event name'
	else
		user = req.session.pub;
		db.getAllUserWebhooks user.username, ( err, oHooks ) =>
			hookExists = false
			hookExists = true for hookid, oHook of oHooks when oHook.hookname is req.body.hookname
			if hookExists
				res.status( 409 ).send 'Webhook already existing: ' + req.body.hookname
			else
				genHookID = () ->
					hookid = ''
					for i in [ 0..1 ]
						hookid += Math.random().toString( 36 ).substring 2
					if oHooks and Object.keys( oHooks ).indexOf( hookid ) > -1
						hookid = genHookID()
					hookid
				hookid = genHookID()
				db.createWebhook user.username, hookid, req.body.hookname, (req.body.isPublic is 'true')
				allowedHooks[ hookid ] =
					hookname: req.body.hookname
					username: user.username
				log.info "SRVC | WEBHOOKS '#{ hookid }' created and activated"
				res.status( 200 ).send
					hookid: hookid
					hookname: req.body.hookname

# User wants to delete a webhook
router.post '/delete/:id', ( req, res ) ->
	hookid = req.params.id
	log.info 'SRVC | WEBHOOKS | Deleting Webhook ' + hookid
	db.deleteWebhook req.session.pub.username, hookid, (err, msg) ->
		if not err
			delete allowedHooks[ hookid ]
			res.send 'OK!'
		else
			res.status(400).send err

# A remote service pushes an event over a webhook to our system
# http://localhost:8080/service/webhooks/event/v0lruppnxsdwt5h8ybny7gb9rh9smz6cwfudwqptnxbf0f6r
router.post '/event/:id', ( req, res ) ->
	oHook = allowedHooks[ req.params.id ]
	if oHook
		req.body.engineReceivedTime = (new Date()).getTime()
		obj =
			eventname: oHook.hookname
			body: req.body
		db.pushEvent obj
		resp.send 200, JSON.stringify
			message: "Thank you for the event: '#{ oHook.hookname }'"
			evt: obj
	else
		res.send 404, 'Webhook not existing!'
