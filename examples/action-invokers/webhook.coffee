
# Webhook ACTION DISPATCHER
# -------------------------

# Sends data to a remote Webhook

options =
	method: 'POST'
	json: true
	jar: true

exports.post = ( url, data ) ->
	if not data
		data = {}

	options.url = url
	options.body = data
	request options, ( err, resp, body ) ->
		if err or resp.statusCode isnt 200
			log "Error in pushing data to webhook '#{ url }'!"
		else
			log "Successfully posted data to '#{ url }'"
