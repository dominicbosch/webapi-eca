### 
EmailYak ACTION INVOKER
------------------------
#
# Requires user params:
#  - apikey: The user's EmailYak API key
#  - sender: The email address belonging to your apikey
#  - receipient: The email address for the one that receives the mail
#  - subject: The subject of the mail
###

url = 'https://api.emailyak.com/v1/' + params.apikey + '/json/send/email/'

#
# The standard callback can be used if callback is not provided, e.g. if
# the function is called from outside
#
standardCallback = ( funcName ) ->
	( err, resp, body ) ->
		if err
			log "ERROR: During function '#{ funcName }'"
		else
			if resp.statusCode is 200
				log "Function '#{ funcName }' ran through without error"
			else
				debug body
				log "ERROR: During function '#{ funcName }': #{ body.error.message }"

###
Send a mail through Emailyak.

@param {Object} args.content the content to be posted in the mail body
###
exports.sendMail = ( args ) ->
	data =
		FromAddress: params.sender
		ToAddress: params.receipient
		Subject: params.subject
		TextBody: args.content
	needlereq 'post', url, data, json: true, standardCallback 'sendMail'

