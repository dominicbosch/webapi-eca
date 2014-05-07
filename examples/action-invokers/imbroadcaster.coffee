arrHooks = []

broadcast = ( msg ) ->
	log 'broadcasting: ' + msg
	for hook in arrHooks
		log '... to ' + hook
		options =
			method: 'POST'
			json: true
			jar: true
			url: hook
			body:
				message: msg
		request options, ( err, resp, body ) ->
			if err or resp.statusCode isnt 200
				log "Error in pushing data to webhook '#{ hook }'!"
			else
				log "Successfully posted data to '#{ hook }'"

exports.message = ( msg ) ->
	if msg.webhook
		hook = msg.webhook.replace /(\r\n|\n|\r|\s)/gm, ""
		log 'Registering new IM webhook: ' + hook
		arrHooks.push hook
	else if msg.message
		broadcast msg.message
