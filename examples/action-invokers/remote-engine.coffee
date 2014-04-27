### 
Remote Engine
-------------
#
# Requires user params:
#  - eventname: The event type to be pushed into the system
#  - webhook: 	The url to the emote webhook that will receive the event
###
options =
	method: 'POST'
	json: true
	jar: true

###
Push an event into a WebAPI engine.

@param {Object} evt The event object that will be transmitted.
###
exports.pushEvent = ( evt ) ->
	if not evt
		evt = {}
	evt.event = params.eventname

	options.url = params.webhook
	options.body = JSON.stringify evt
	request options, ( err, resp, body ) ->
		if err or resp.statusCode isnt 200
			log 'Error in pushing event!'
		else
			log 'Successfully posted an event'
