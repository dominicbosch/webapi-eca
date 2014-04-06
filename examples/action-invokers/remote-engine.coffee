### 
Remote Engine
-------------
#
# Requires user params:
#  - username:	username to the remote system
#  - password:	password to the remote system
#  - event: 	The event type to be pushed into the system
#  - url: 		The url to the WebAPI engine that will receive the event
###
hashedPassword = cryptoJS.SHA3( params.password, outputLength: 512 ).toString()
options =
	method: 'POST'
	json: true
	jar: true

fPushEvent = ( evt ) ->
	options.url = params.url + '/event'
	options.body = JSON.stringify evt
	request options, ( err, resp, body ) ->
		if err or resp.statusCode isnt 200
			log 'Error in pushing event!'
		else
			log 'Successfully posted an event'


###
Push an event into a WebAPI engine.

@param {Object} evt The event object that will be transmitted.
###
exports.pushEvent = ( evt ) ->
	if not evt
		evt = {}
	evt.event = params.event

	data =
		username: params.username
		password: hashedPassword
	options.url = params.url + '/login'
	options.body = JSON.stringify data
	request options, ( err, resp, body ) ->
		if err or resp.statusCode isnt 200
			log 'Error in pushing event!'
		else
			fPushEvent evt


# http://localhost:8125