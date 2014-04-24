#
# EmailYak EVENT POLLER
# ---------------------
#
# Requires user params:
#  - apikey: The user's EmailYak API key
#

url = 'https://api.emailyak.com/v1/' + params.apikey + '/json/get/new/email/'

exports.newMail = () ->

	# needlereq allows the user to make calls to API's
	# Refer to https://github.com/tomas/needle for more information
	# 
	# Syntax: needle.request method, url, data, [options], callback
	#
	needle.request 'get', url, null, null, ( err, resp, body ) ->
		if err
			log 'Error in EmailYak EM newMail: ' + err.message
		else
			if resp.statusCode is 200
				if body.Emails.length > 0
					log "#{ body.Emails.length } mail events pushed into the system"
				pushEvent mail for mail in body.Emails

				###
				This will emit events of the form:
				( Refer to http://docs.emailyak.com/get-new-email.html for more information. )

				{
					"EmailID": "xquukd5z",
					"Received": "2014-04-19T11:27:11",
					"ToAddress": "test@mscliveweb.simpleyak.com",
					"ParsedData": [
						{
							"Data": "Best Regards\nTest User",
							"Part": 0,
							"Type": "Email"
						}
					],
					"FromName": "Test User",
					"ToAddressList": "test@mscliveweb.simpleyak.com",
					"FromAddress": "test.address@provider.com",
					"HtmlBody": "Best Regards\nTest User",
					"CcAddressList": "",
					"TextBody": "Best Regards\nTest User",
					"Subject": "test subject"
				}
				###