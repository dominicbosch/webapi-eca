lastCheck = ""
lastCheckObj = {}

exports.detectedChange = ( url, selector ) ->
	log 'checking'
	needle.get url, ( err, resp, body ) ->
		log 'body'
		diffrnc = diff.diffChars lastCheck, body
		diffrnc.forEach ( part ) ->
			stat = part.added ? 'added' :
				part.removed ? 'removed' : 'common'
			log stat + ': ' + part.value

		log JSON.stringify diffrnc

		if selector is ""
			selector = "*"
		# https://www.npmjs.org/package/jsdom
		
		# Really loads URL? if yes we still would need this diff service to work for other data formats aas well such as json and xml
		# best would be to load the URL and then pass it to the objectifying method such as json.parse or jsdom.env
		jsdom.env body, ( errors, window ) ->
			log JSON.stringify errors
			log JSON.stringify window
			differences = deepdiff lastCheckObj, window
			log JSON.stringify differences
			pushEvent
				changes: differences
			lastCheckObj = window