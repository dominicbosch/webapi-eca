### 
Post Event to webhook
###
options =
	method: 'POST'
	json: true
	jar: true

###
Push an event to a webhook

 - {Object} evt The event object that will be transmitted.
###
exports.post = ( url, evt ) ->
	if not evt
		evt = {}
	options.url = url
	options.body = JSON.stringify evt
	request options, ( err, resp, body ) ->
		if err or resp.statusCode isnt 200
			log 'Error in pushing event!'
		else
			log 'Successfully posted an event'
