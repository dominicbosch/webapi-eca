###

Tests the ProBinder API. Requires user credentials:

- username
- password

###
url = "https://probinder.com/service/"
testLog = ""
testSuccess = true
testTimeout = 15000
options = {}

exports.testProBinder = ( requestTimeoutMilliSeconds ) ->
	testLog = ""
	testSuccess = true
	testTimeout = parseInt( requestTimeoutMilliSeconds ) || testTimeout
	options =
		username: params.username
		password: params.password
		timeout: testTimeout

	arrTestFuncs = [
		testLogin
		testNotLoggedInUnreadContentCount
		testLoggedInUnreadContentCount
	]

	semaphore = arrTestFuncs.length
	for fTest, i in arrTestFuncs
		log 'Testing function #' + i
		fTest () ->
			if --semaphore is 0
				if testSuccess
					summary = "All tests passed!"
				else
					summary = "At least one test failed!"
				pushEvent
					success: testSuccess 
					log: testLog
					summary: summary
				log 'Test completed: ' + summary 

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
			testLog += "FAIL | #{ testName }: Timeout!<br/>"
			testSuccess = false
		else if resp.statusCode isnt expectedCode
			testLog += "FAIL | #{ testName }: Response 
				#{ resp.statusCode }(expected: #{ expectedCode }), #{ body.error.message }<br/>"
			testSuccess = false
		else
			testLog += "SUCCESS | #{ testName }<br/>"
		cb?()