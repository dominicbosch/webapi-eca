###

Tests whether a given URL is reachable and pushes a status
event into the system.

###
exports.testReachableUrl = ( method, url, timeout ) ->
	if method.toUpperCase() isnt 'POST'
		method = 'GET'
	needle.request method, url, timeout: timeout, ( err, resp, body ) ->
		pushEvent
			url: url
			status: resp.statusCode
			err: err
			body: body

pingHost = ( url, cb ) ->
	isDown = true
	semaphore = 5
	for i in [1..5]
		needle.get url, ( err, resp ) ->
			if not err
				isDown = false
			if --semaphore is 0
				cb
					timestamp: (new Date()).toISOString()
					url: url
					isdown: isDown

wasDown = false
# Checks whether a remote host is down
exports.pingedRemoteHost = ( url ) ->
	pingHost url, ( evt ) ->
		if evt.isdown and not wasDown
			wasDown = true
			pushEvent evt
		if not evt.isdown
			wasDown = false


# Checks a host uptime and maintains a history which is pushed as an event
oStats = {}
exports.hostUptime = ( url ) ->
	pingHost url, ( evt ) ->
		oStats[ evt.timestamp ] = evt
		pushEvent oStats