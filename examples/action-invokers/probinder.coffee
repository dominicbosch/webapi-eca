### 
ProBinder ACTION INVOKER
------------------------

Global variables
This module requires user-specific parameters:
- username
- password
- companyId: company where to post the binder entries
- contextId: context where to post the binder entries
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
		needlereq 'post', url, args.data, credentials, args.callback


###
Does everything to post something in a binder

@param {Object} args the object containing the content
@param {String} args.content the content to be posted
###
exports.newContent = ( args ) ->
	if not args.callback
		args.callback = standardCallback 'newContent'
	callService
		service: '27'
		method: 'save'
		data:
			companyId: params.companyId
			context: params.contextId
			text: args.content
		callback: args.callback

###
Does everything to post a file info in a binder tabe

@param {Object} args the object containing the content
@param {String} args.service the content service
@param {String} args.id the content id
###
exports.makeFileEntry = ( args ) ->
	if not args.callback
		args.callback = standardCallback 'makeFileEntry'
	getContent
		serviceid: args.service
		contentid: args.id
		callback: ( err, resp, body ) ->
			callService
				service: '27'
				method: 'save'
				data:
					companyId: params.companyId
					context: params.contextId
					text: "New file (#{ body.title }) in tab \"#{ body.context[0].name }\",
					find it <a href=\"https://probinder.com/file/#{ body.fileIds[0] }\">here</a>!'"
				callback: args.callback

###
Calls the content get service with the content id and the service id provided. 

@param {Object} args the object containing the service id and the content id,
   success and error callback methods
@param {String} args.serviceid the service id that is able to process this content
@param {String} args.contentid the content id
@param {function} [args.callback] receives the needle answer from the "call" function
###
getContent = ( args ) ->
	if not args.callback
		args.callback = standardCallback 'getContent'
	callService
		service: '2'
		method: 'get'
		data: 
			id: args.contentid
			service: args.serviceid
		callback: args.callback

###
Sets the content as read.

@param {Object} args the object containing the content
@param {String} args.content the content to be posted
###
exports.setRead = ( args ) ->
	if not args.callback
		args.callback = standardCallback 'setRead'
	callService
		service: '2'
		method: 'setread'
		data:
			id: args.id
		callback: args.callback