### 
EmailYak ACTION INVOKER
------------------------
#
# Requires user params:
#  - apikey: The user's EmailYak API key
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

@param sender The email address belonging to your apikey
@param receipient The email address for the one that receives the mail
@param subject The subject of the mail
@param content The content of the mail
###
exports.sendMail = ( sender, receipient, subject, content ) ->
	data =
		FromAddress: sender
		ToAddress: receipient
		Subject: subject
		TextBody: content
	needle.request 'post', url, data, json: true, standardCallback 'sendMail'

