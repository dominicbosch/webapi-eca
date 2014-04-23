#
# Pushes an event into the system each time the function is polled
#

# Requires the content to be posted
exports.push = ( content ) ->
	log 'Posting event with content: ' + content
	pushEvent
		content: content