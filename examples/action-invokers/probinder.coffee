

### 
ProBinder ACTION DISPATCHER
---------------------------

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

 - {Object} args the required function arguments object
 - {Object} [args.data] the data to be posted
 - {String} args.service the required service identifier to be appended to the url
 - {String} args.method the required method identifier to be appended to the url
 - {function} [args.callback] the function to receive the request answer
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

 - {String} companyId the comany associated to the binder
 - {String} contextId the binder id
 - {String} content the content to be posted
###
exports.newContent = ( companyId, contextId, content ) ->
	if arguments[ 4 ]
		callback = arguments[ 4 ]
	else
		callback = standardCallback 'newContent'
	callService
		service: '27'
		method: 'save'
		data:
			companyId: companyId
			context: contextId
			text: content
		callback: callback

###
Does everything to post a file info in a binder tab

 - {String} fromService the content service which grabs the content
 - {String} fromId the content id from which the information is grabbed
###
exports.makeFileEntry = ( fromService, fromId, toCompany, toContext ) ->
	getContent
		serviceid: fromService
		contentid: fromId
		callback: ( err, resp, body ) ->
			content = "New file (#{ body.title }) in tab \"#{ body.context[0].name }\",
					find it here!'"
			exports.newContent toCompanyId, toContextId, content, standardCallback 'makeFileEntry'


###
Calls the content get service with the content id and the service id provided. 

 - {Object} args the object containing the service id and the content id,
	 success and error callback methods
 - {String} args.serviceid the service id that is able to process this content
 - {String} args.contentid the content id
 - {function} [args.callback] receives the needle answer from the "call" function
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

 - {Object} id the content id to be set to read.
###
exports.setRead = ( id ) ->
	callService
		service: '2'
		method: 'setread'
		data:
			id: id
		callback: standardCallback 'setRead'

getWikiTitle = ( title, cb ) ->
	titleUrl = 'http://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&exchars=200&explaintext&titles='
	needle.get titleUrl + encodeURIComponent( title ), ( err, resp, obj ) ->
		if err or resp.statusCode isnt 200 or not obj.query or not obj.query.pages or obj.query.pages['-1']
			cb new Error 'Unable to fetch data'
		else
			for id, page of obj.query.pages
				cb null, page.extract

getWikiSearch = ( text, cb ) ->
	searchUrl = 'http://en.wikipedia.org/w/api.php?format=json&action=query&list=search&srwhat=text&srlimit=3&srsearch='
	needle.get searchUrl + encodeURIComponent( text ), ( err, resp, obj ) ->
		if err or resp.statusCode isnt 200 or not obj.query or not obj.query.search or obj.query.search.length is 0
			cb new Error 'Nothing found'
		else
			for result in obj.query.search
				cb null, result.snippet.replace /<(?:.|\n)*?>/gm, ''

exports.annotateTagEntries = ( entryId, tags ) ->
	arrTags = tags.split( "#" ).slice 1
	for tag in arrTags
		tag = tag.trim().replace /\\"/g, ''
		tag = tag.trim().replace /\\/g, ''
		fProcessTitleAnswer = ( loopTag ) -> 
			( err, result ) ->
				if not err and result
					exports.commentEntry entryId, result
				else
					getWikiSearch loopTag, ( err, result ) ->
						exports.commentEntry entryId, result

		getWikiTitle tag, fProcessTitleAnswer tag

exports.commentEntry = ( entryId, text ) ->
	log "Adding Commment '#{ text }' to ##{ entryId }"
	callService
		service: 'content'
		method: 'addcomment'
		data:
			contentId: entryId
			text: text