
### 
EmailYak ACTION DISPATCHER
--------------------------
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

- sender The email address belonging to your apikey
- receipient The email address for the one that receives the mail
- subject The subject of the mail
- content The content of the mail
###
exports.sendMail = ( sender, receipient, subject, content ) ->
	if typeof content isnt "string"
		content = JSON.stringify content, undefined, 2
	data =
		FromAddress: sender
		ToAddress: receipient
		Subject: subject
		HtmlBody: content # optional
		TextBody: content.replace /<(?:.|\n)*?>/gm, '' # strip eventual html tags
	needle.request 'post', url, data, json: true, standardCallback 'sendMail'

