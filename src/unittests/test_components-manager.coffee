fs = require 'fs'
path = require 'path'

cryptico = require 'my-cryptico'

passPhrase = 'UNIT TESTING PASSWORD'
numBits = 1024
oPrivateRSAkey = cryptico.generateRSAKey passPhrase, numBits
strPublicKey = cryptico.publicKeyString oPrivateRSAkey

try
	data = fs.readFileSync path.resolve( 'testing', 'files', 'testObjects.json' ), 'utf8'
	try
		objects = JSON.parse data
	catch err
		console.log 'Error parsing standard objects file: ' + err.message
catch err
	console.log 'Error fetching standard objects file: ' + err.message

logger = require path.join '..', 'js', 'logging'
log = logger.getLogger
	nolog: true
opts =
	logger: log
	keygen: passPhrase

engine = require path.join '..', 'js', 'engine'
engine opts

cm = require path.join '..', 'js', 'components-manager'
cm opts

cm.addRuleListener engine.internalEvent

db = require path.join '..', 'js', 'persistence'
db opts

encryption = require path.join '..', 'js', 'encryption'
encryption opts

oUser = objects.users.userOne
oRuleOne = objects.rules.ruleOne
oRuleTwo = objects.rules.ruleTwo
oRuleThree = objects.rules.ruleThree
oEventOne = objects.events.eventOne
oEpOne = objects.eps.epOne
oEpTwo = objects.eps.epTwo
oAiOne = objects.ais.aiOne
oAiTwo = objects.ais.aiTwo
oAiThree = objects.ais.aiThree

exports.setUp = ( cb ) ->
	engine.startEngine()
	cb()

exports.tearDown = ( cb ) ->
	engine.shutDown()
	db.deleteUser oUser.username
	db.deleteRule oUser.username, oRuleOne.id
	db.deleteRule oUser.username, oRuleTwo.id
	db.deleteRule oUser.username, oRuleThree.id
	db.eventPollers.deleteModule oUser.username, oEpOne.id
	db.eventPollers.deleteModule oUser.username, oEpTwo.id
	db.actionInvokers.deleteModule oUser.username, oAiOne.id
	db.actionInvokers.deleteModule oUser.username, oAiTwo.id
	db.actionInvokers.deleteModule oUser.username, oAiThree.id
	db.actionInvokers.deleteUserParams oAiThree.id, oUser.username

	setTimeout cb, 100

exports.requestProcessing =
	testEmptyBody: ( test ) =>
		test.expect 1

		request =
			command: 'get_event_pollers'

		cm.processRequest oUser, request, ( answ ) =>
			test.strictEqual 200, answ.code, 'Empty body did not return 200'
			test.done()

	testCorruptBody: ( test ) =>
		test.expect 1

		request =
			command: 'get_event_pollers'
			body: 'no-json'

		cm.processRequest oUser, request, ( answ ) =>
			test.strictEqual 404, answ.code, 'Corrupt body did not return 404'
			test.done()

exports.testListener = ( test ) =>
	test.expect 4

	strRuleOne =  JSON.stringify oRuleOne
	strRuleTwo =  JSON.stringify oRuleTwo
	strRuleThree =  JSON.stringify oRuleThree

	db.storeUser oUser
	db.storeRule oUser.username, oRuleOne.id, strRuleOne
	# db.linkRule oRuleOne.id, oUser.username
	# db.activateRule oRuleOne.id, oUser.username
	
	db.storeRule oUser.username, oRuleTwo.id, strRuleTwo
	# db.linkRule oRuleTwo.id, oUser.username
	# db.activateRule oRuleTwo.id, oUser.username
	db.actionInvokers.storeModule oUser.username, oAiThree

	request =
		command: 'forge_rule'
		body: strRuleThree

	cm.addRuleListener ( evt ) =>
		strEvt = JSON.stringify evt.rule
		if evt.intevent is 'init'
			if strEvt is strRuleOne or strEvt is strRuleTwo
				test.ok true, 'Dummy true to fill expected tests!'

			if strEvt is strRuleThree
				test.ok false, 'Init Rule found test rule number two??'

		if evt.intevent is 'new'
			if strEvt is strRuleOne or strEvt is strRuleTwo
				test.ok false, 'New Rule got test rule number one??'

			if strEvt is strRuleThree
				test.ok true, 'Dummy true to fill expected tests!'



	fWaitForInit = ->
		cm.processRequest oUser, request, ( answ ) =>
			if answ.code is 200
				test.ok true, 'request processed correctly'
			else
				test.ok false, 'testListener failed: ' + answ.message
				test.done()
		setTimeout test.done, 500

	setTimeout fWaitForInit, 200

# exports.moduleHandling =
# 	testGetModules: ( test ) ->
# 		test.expect 2

# 		db.eventPollers.storeModule oUser.username, oEpOne
# 		db.eventPollers.storeModule oUser.username, oEpTwo
# 		request =
# 			command: 'get_event_pollers'
 
# 		cm.processRequest oUser, request, ( answ ) =>
# 			test.strictEqual 200, answ.code, 'GetModules failed...' 
# 			oExpected = {}
# 			oExpected[oEpOne.id] = JSON.parse oEpOne.functions
# 			oExpected[oEpTwo.id] = JSON.parse oEpTwo.functions
# 			test.deepEqual oExpected, JSON.parse(answ.message),
# 				'GetModules retrieved modules is not what we expected'
# 			test.done()

# 	testGetModuleParams: ( test ) ->
# 		test.expect 2

# 		db.eventPollers.storeModule oUser.username, oEpOne

# 		request =
# 			command: 'get_event_poller_params'
# 			body: 
# 				id: oEpOne.id
# 		request.body = JSON.stringify request.body
# 		cm.processRequest oUser, request, ( answ ) =>
# 			test.strictEqual 200, answ.code,
# 				'Required Module Parameters did not return 200'
# 			test.strictEqual oEpOne.params, answ.message,
# 				'Required Module Parameters did not match'
# 			test.done()

# 	testForgeModule: ( test ) ->
# 		test.expect 2

# 		oTmp = {}
# 		for key, val of oAiTwo
# 			oTmp[key] = val if key isnt 'functions' and key isnt 'functionParameters'

# 		request =
# 			command: 'forge_action_invoker'
# 			body: JSON.stringify oTmp
 
# 		cm.processRequest oUser, request, ( answ ) =>
# 			test.strictEqual 200, answ.code, 'Forging Module did not return 200'

# 			db.actionInvokers.getModule oUser.username, oAiTwo.id, ( err, obj ) ->
# 				test.deepEqual obj, oAiTwo, 'Forged Module is not what we expected'
# 				test.done()


# exports.ruleForge =
# 	testUserParams: ( test ) ->
# 		test.expect 3

# 		db.storeUser oUser
# 		db.actionInvokers.storeModule oUser.username, oAiThree

# 		pw = 'This password should come out cleartext'
# 		oEncrypted = cryptico.encrypt pw, strPublicKey
# 		userparams = JSON.stringify password:
# 			shielded: false
# 			value: oEncrypted.cipher

# 		db.actionInvokers.storeUserParams oAiThree.id, oUser.username, userparams

# 		request =
# 			command: 'forge_rule'
# 			body: JSON.stringify oRuleThree

# 		cm.processRequest oUser, request, ( answ ) =>
# 			test.strictEqual 200, answ.code, "Forging Rule returned #{ answ.code }: #{ answ.message }"

# 		fWaitForPersistence = () ->
# 			evt = objects.events.eventReal
# 			db.pushEvent evt

# 			fWaitAgain = () ->
# 				db.getLog oUser.username, oRuleThree.id, ( err, data ) ->
# 					try
# 						arrRows = data.split "\n"
# 						logged = arrRows[ 1 ].split( '] ' )[1]
# 						test.strictEqual logged, "{#{ oAiThree.id }} " + pw, 'Did not log the right thing'
# 					catch e
# 						test.ok false, 'Parsing log failed'

# 					request =
# 						command: 'delete_rule'
# 						body: JSON.stringify id: oRuleThree.id

# 					cm.processRequest oUser, request, ( answ ) =>
# 						test.strictEqual 200, answ.code, "Deleting Rule returned #{ answ.code }: #{ answ.message }"
# 						setTimeout test.done, 200

# 			setTimeout fWaitAgain, 500

# 		setTimeout fWaitForPersistence, 200


# 	testEvent: ( test ) ->
# 		test.expect 3

# 		db.storeUser oUser
# 		db.actionInvokers.storeModule oUser.username, oAiOne

# 		request =
# 			command: 'forge_rule'
# 			body: JSON.stringify oRuleOne

# 		cm.processRequest oUser, request, ( answ ) =>
# 			test.strictEqual 200, answ.code, "Forging Rule returned #{ answ.code }: #{ answ.message }"

# 		fWaitForPersistence = () ->
# 			db.pushEvent oEventOne

# 			fWaitAgain = () ->
# 				db.getLog oUser.username, oRuleOne.id, ( err, data ) ->
# 					try
# 						arrRows = data.split "\n"
# 						logged = arrRows[ 1 ].split( '] ' )[1]
# 						test.strictEqual logged, "{#{ oAiOne.id }} " + oEventOne.body.property,
# 							'Did not log the right thing'
# 					catch e
# 						test.ok false, 'Parsing log failed'

# 					request =
# 						command: 'delete_rule'
# 						body: JSON.stringify id: oRuleOne.id

# 					cm.processRequest oUser, request, ( answ ) =>
# 						test.strictEqual 200, answ.code, "Deleting Rule returned #{ answ.code }: #{ answ.message }"
# 						setTimeout test.done, 200

# 			setTimeout fWaitAgain, 200

# 		setTimeout fWaitForPersistence, 200

# # TODO we have to implement a lot of extensive testing for the component manager since it is a core feature