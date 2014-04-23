
# Helper constructs
#

exports.parseTextToJSON = ( text, infoEvent ) ->
	try
		pushEvent
			event: infoEvent
			payload: JSON.parse text
		log "Text successfully parsed"
	catch e
		log "Error during JSON parsing of #{ text }"
	