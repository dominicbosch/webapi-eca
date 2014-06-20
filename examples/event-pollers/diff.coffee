lastCheck = ""
lastCheckObj = {}

exports.detectedChange = ( url ) ->
	# needle.get url, ( err, resp, body ) ->
		# log err
		# log 'got body'
	conf =
		url: url
		scripts: ['http://code.jquery.com/jquery-1.6.min.js']
		done: ( err, window ) ->
			log 'jsenv'
			$ = window.jQuery
			log $ is null
			log $
			nbody = $ 'body'
			log 'nbody'
			log nbody
			try
				differences = deepdiff lastCheckObj, nbody
				log JSON.stringify differences
				lastCheckObj = nbody
			catch err
				log err
	jsdom.env conf 
