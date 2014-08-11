### 
ProBinder EVENT POLLER
----------------------

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
Calls the user's unread content service.
###
exports.unreadContentInfo = () ->
	callService
		service: '36'
		method: 'unreadcontent'
		callback: ( err, resp, body ) ->
			if not err and resp.statusCode is 200
				pushEvent oEntry for oEntry in body
			else
				log 'Error: ' + body.error.message

###
Fetches unread contents
###
exports.unreadContent = () ->
	exports.unreadContentInfo ( evt ) ->
		getContent
			contentId: evt.id
			contentServiceId: evt.serviceId
			callback: ( err, resp, body ) ->
				if not err and resp.statusCode is 200
					pushEvent
						id: body.id
						content: body.text
						object: body
				else
					log 'Error: ' + body.error.message


###
Calls the content get service with the content id and the service id provided. 
###
getContent = ( args ) ->
	if not args.callback
		args.callback = standardCallback 'getContent'
	callService
		service: '2'
		method: 'get'
		data: 
			id: args.contentId
			service: args.contentServiceId
		callback: args.callback

#		Returns an event of the form:

# 		{
# 		    "text": "test subject",
# 		    "id": 127815,
# 		    "createDate": "2014-04-19 16:27:45",
# 		    "lastModified": "2014-04-19 16:27:45",
# 		    "time": "5 days ago",
# 		    "userId": 10595,
# 		    "username": "Dominic Bosch",
# 		    "uri": "https://probinder.com/content/view/id/127815/",
# 		    "localUri": "https://probinder.com/content/view/id/127815/",
# 		    "title": "",
# 		    "serviceId": 27,
# 		    "userIds": [
# 		        10595
# 		    ],
# 		    "description": "",
# 		    "context": [
# 		        {
# 		            "id": 18749,
# 		            "name": "WebAPI ECA Test Binder",
# 		            "remove": true,
# 		            "uri": "/content/context/id/18749/webapi-eca-test-binder"
# 		        }
# 		    ]
# 		}

{
  "eventname": "ProBinder->unreadContent",
  "conditions":[
  	{
  		"selector":".context .id","operator":"==","compare":18749
  	}
  ],
  "actions": [
      "ProBinder->annotateTagEntries",
      "ProBinder->setRead"
  ]
}