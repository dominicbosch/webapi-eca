
#
# EmailYak EVENT POLLER
# ---------------------
#
# Requires user params:
#  - apikey: The user's EmailYak API key
#

url = 'https://api.emailyak.com/v1/' + params.apikey + '/json/get/new/email/'

exports.newMail = ( pushEvent ) ->

	# needlereq allows the user to make calls to API's
	# Refer to https://github.com/tomas/needle for more information
	# 
	# Syntax: needle.request method, url, data, [options], callback
	#
	needle.request 'get', url, null, null, ( err, resp, body ) ->
		if err
			log 'Error in EmailYak EM newMail: ' + err.message
		else
			log body
			if resp.statusCode is 200
				pushEvent mail for mail in body.Emails

