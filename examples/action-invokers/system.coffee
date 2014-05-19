###
Pushes an event back into the system
###
exports.pushEvent = ( eventname, body ) ->
	log 'Pushing: ' + typeof body
	log JSON.stringify body
	pushEvent
		eventname: eventname
		body: body