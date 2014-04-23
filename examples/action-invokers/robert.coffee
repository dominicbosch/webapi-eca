

### 
ProBinder ACTION INVOKER
------------------------

Global variables
This module requires user-specific parameters:
- username
- password
###
urlService = 'https://probinder.com/service/'
credentials =
	username: params.username
	password: params.password

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
				log "ERROR: During function '#{ funcName }': #{ body.error.message }"

###
Call the ProBinder service with the given parameters.

@param {Object} args the required function arguments object
@param {Object} [args.data] the data to be posted
@param {String} args.service the required service identifier to be appended to the url
@param {String} args.method the required method identifier to be appended to the url
@param {function} [args.callback] the function to receive the request answer
###
callService = ( args ) ->
	if not args.service or not args.method
		log 'ERROR in call function: Missing arguments!'
	else
		if not args.callback
			args.callback = standardCallback 'call'
		url = urlService + args.service + '/' + args.method
		needle.request 'post', url, args.data, credentials, args.callback


###
Does everything to post something in a binder

@param {String} companyId the comany associated to the binder
@param {String} contextId the binder id
@param {String} content the content to be posted
###
exports.newStudent = ( obj ) ->
	log 'Got new user object: ' + typeof obj
	log JSON.stringify obj, undefined, 2