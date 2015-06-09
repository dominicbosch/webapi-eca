
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

@allowedHooks = {}
db.getAllWebhooks ( err, oHooks ) =>
	if oHooks
		log.info "SRVC | WEBHOOKS | Initializing #{ Object.keys( oHooks ).length } Webhooks"  
		@allowedHooks = oHooks

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
	log.info 'SRVC | WEBHOOKS | Fetching all Webhooks'
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


# http://localhost:8080/service/webhooks/event/v0lruppnxsdwt5h8ybny7gb9rh9smz6cwfudwqptnxbf0f6r
router.post '/event/:id', ( req, res ) ->

	# ###
	# Handles webhook posts
	# ###
	# exports.handleWebhooks = ( req, resp ) =>
	# 	hookid = req.url.substring( 10 ).split( '/' )[ 0 ]
	# 	oHook = @allowedHooks[ hookid ]
	# 	if oHook
	# 		body = ''
	# 		req.on 'data', ( data ) ->
	# 			body += data
	# 		req.on 'end', () ->
	# 			body.engineReceivedTime = (new Date()).getTime()
	# 			obj =
	# 				eventname: oHook.hookname
	# 				body: body
	# 			if oHook.username
	# 				obj.username = oHook.username
	# 			db.pushEvent obj
	# 			resp.send 200, JSON.stringify
	# 				message: "Thank you for the event: '#{ oHook.hookname }'"
	# 				evt: obj
	# 	else
	# 		resp.send 404, "Webhook not existing!"

router.post '/delete/:id', ( req, res ) ->
	log.warn 'SRVC | WEBHOOKS | implemnt delete id'
	db.getAllUserWebhooks req.session.username, ( arr ) ->
		log.info 'Webhooks' + JSON.stringify arr
	res.send 'TODO!'
	# # Deactivate a webhook
	# exports.deactivateWebhook = ( hookid ) =>
	# 	@log.info "HL | Webhook '#{ hookid }' deactivated"
	# 	delete @allowedHooks[ hookid ]



# WEBHOOKS
# --------

	# delete_webhook: ( user, oBody, callback ) ->
	# 	answ = hasRequiredParams [ 'hookid' ], oBody
	# 	if answ.code isnt 200
	# 		callback answ
	# 	else
	# 		rh.deactivateWebhook oBody.hookid
	# 		db.deleteWebhook user.username, oBody.hookid
	# 		callback
	# 			code: 200
	# 			message: 'OK!'
	# 	