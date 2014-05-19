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
