###
Pushes an event back into the system
###
exports.pushEvent = ( eventname, body ) ->
	log 'Pushing: ' + eventname
	pushEvent
		eventname: eventname
		body: body