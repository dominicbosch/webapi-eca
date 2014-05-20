###

Tests the ProBinder API. Requires user credentials:

- username
- password

###
url = "https://probinder.com/service/"
arrFailed = []
testLog = ""
testTimeout = 15000
options = {}

exports.testProBinder = ( requestTimeoutMilliSeconds ) ->
	arrFailed = []
	testLog = ""
	testTimeout = parseInt( requestTimeoutMilliSeconds ) || testTimeout
	options =
		username: params.username
		password: params.password
		timeout: testTimeout

	oTestFuncs =
		testLogin: testLogin
		testNotLoggedInUnreadContentCount: testNotLoggedInUnreadContentCount
		testLoggedInUnreadContentCount: testLoggedInUnreadContentCount

	semaphore = 0
	for name, fTest of oTestFuncs
		semaphore++
		log "Testing function '#{ name }'"
		fTest () ->
			if --semaphore is 0
				testSuccess = arrFailed.length is 0
				if testSuccess
					summary = "All tests passed!"
				else
					summary = arrFailed.length + " test(s) failed: " + arrFailed.join ", "
				pushEvent
					success: testSuccess 
					log: testLog
					summary: summary
				log summary 

testLoggedInUnreadContentCount = ( cb ) ->
	turl = url + "user/unreadcontentcount"
	needle.get turl, options, responseHandler cb, 'testLoggedInUnreadContentCount', 200

testNotLoggedInUnreadContentCount = ( cb ) ->
	turl = url + "user/unreadcontentcount"
	needle.get turl, timeout: testTimeout, responseHandler cb, 'testNotLoggedInUnreadContentCount', 400

testLogin = ( cb ) ->
	turl = url + "auth/login/email/#{ params.username }/password/#{ params.password }"
	needle.get turl, timeout: testTimeout, responseHandler cb, 'testLogin', 200

responseHandler = ( cb, testName, expectedCode ) ->
	( err, resp, body ) ->
		if err
			testLog += "<b> - FAIL | #{ testName }: Timeout! Server didn't answer within #{ testTimeout / 1000 } seconds</b><br/>"
			arrFailed.push testName
		else if resp.statusCode isnt expectedCode
			testLog += "<b> - FAIL | #{ testName }: Response 
				#{ resp.statusCode }(expected: #{ expectedCode }), #{ body.error.message }</b><br/>"
			arrFailed.push testName
		else
			testLog += " + SUCCESS | #{ testName }<br/>"
		cb?()