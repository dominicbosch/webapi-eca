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
log = logger.getLogger()
	# nolog: true
opts =
	logger: log

engine = require path.join '..', 'js', 'engine'
engine opts

cm = require path.join '..', 'js', 'components-manager'
cm opts

cm.addRuleListener engine.internalEvent

db = require path.join '..', 'js', 'persistence'
db opts

oUser = objects.users.userOne
oRuleOne = objects.rules.ruleOne
oRuleTwo = objects.rules.ruleTwo
oRuleThree = objects.rules.ruleThree
oEpOne = objects.eps.epOne
oEpTwo = objects.eps.epTwo
oAiTwo = objects.ais.aiTwo
oAiThree = objects.ais.aiThree

exports.tearDown = ( cb ) ->
	db.deleteRule oRuleOne.id
	db.deleteRule oRuleTwo.id
	db.deleteRule oRuleThree.id
	setTimeout cb, 100

exports.requestProcessing =
	testEmptyPayload: ( test ) =>
		test.expect 1

		request =
			command: 'get_event_pollers'

		cm.processRequest oUser, request, ( answ ) =>
			test.strictEqual 200, answ.code, 'Empty payload did not return 200'
			test.done()

	testCorruptPayload: ( test ) =>
		test.expect 1

		request =
			command: 'get_event_pollers'
			payload: 'no-json'

		cm.processRequest oUser, request, ( answ ) =>
			test.strictEqual 404, answ.code, 'Corrupt payload did not return 404'
			test.done()

exports.testListener = ( test ) =>
	test.expect 3

	strRuleOne =  JSON.stringify oRuleOne
	strRuleTwo =  JSON.stringify oRuleTwo
	strRuleThree =  JSON.stringify oRuleThree

	db.storeUser oUser
	db.storeRule oRuleOne.id, strRuleOne
	db.linkRule oRuleOne.id, oUser.username
	db.activateRule oRuleOne.id, oUser.username
	
	db.storeRule oRuleTwo.id, strRuleTwo
	db.linkRule oRuleTwo.id, oUser.username
	db.activateRule oRuleTwo.id, oUser.username

	request =
		command: 'forge_rule'
		payload: strRuleThree

	cm.addRuleListener ( evt ) =>
		strEvt = JSON.stringify evt.rule
		if evt.event is 'init'
			if strEvt is strRuleOne or strEvt is strRuleTwo
				test.ok true, 'Dummy true to fill expected tests!'

			if strEvt is strRuleThree
				test.ok false, 'Init Rule found test rule number two??'

		if evt.event is 'new'
			if strEvt is strRuleOne or strEvt is strRuleTwo
				test.ok false, 'New Rule got test rule number one??'

			if strEvt is strRuleThree
				test.ok true, 'Dummy true to fill expected tests!'



	fWaitForInit = ->
		cm.processRequest oUser, request, ( answ ) =>
			if answ.code isnt 200
				test.ok false, 'testListener failed: ' + answ.message
				test.done()
		setTimeout test.done, 500

	setTimeout fWaitForInit, 200

exports.moduleHandling =
	tearDown: ( cb ) ->
		db.eventPollers.deleteModule oEpOne.id
		db.eventPollers.deleteModule oEpTwo.id
		db.actionInvokers.deleteModule oAiTwo.id
		setTimeout cb, 100

	testGetModules: ( test ) ->
		test.expect 2

		db.eventPollers.storeModule oUser.username, oEpOne
		db.eventPollers.storeModule oUser.username, oEpTwo
		request =
			command: 'get_event_pollers'
 
		cm.processRequest oUser, request, ( answ ) =>
			test.strictEqual 200, answ.code, 'GetModules failed...' 
			oExpected = {}
			oExpected[oEpOne.id] = JSON.parse oEpOne.functions
			oExpected[oEpTwo.id] = JSON.parse oEpTwo.functions
			test.deepEqual oExpected, JSON.parse(answ.message),
				'GetModules retrieved modules is not what we expected'
			test.done()

	testGetModuleParams: ( test ) ->
		test.expect 2

		db.eventPollers.storeModule oUser.username, oEpOne

		request =
			command: 'get_event_poller_params'
			payload: 
				id: oEpOne.id
		request.payload = JSON.stringify request.payload
		cm.processRequest oUser, request, ( answ ) =>
			test.strictEqual 200, answ.code,
				'Required Module Parameters did not return 200'
			test.strictEqual oEpOne.params, answ.message,
				'Required Module Parameters did not match'
			test.done()

	testForgeModule: ( test ) ->
		test.expect 2

		oTmp = {}
		for key, val of oAiTwo
			oTmp[key] = val if key isnt 'functions' and key isnt 'functionParameters'

		request =
			command: 'forge_action_invoker'
			payload: JSON.stringify oTmp
 
		cm.processRequest oUser, request, ( answ ) =>
			test.strictEqual 200, answ.code, 'Forging Module did not return 200'

			db.actionInvokers.getModule oAiTwo.id, ( err, obj ) ->
				test.deepEqual obj, oAiTwo, 'Forged Module is not what we expected'
				test.done()


exports.testForgeRule = ( test ) ->
	test.expect 1

	db.storeUser oUser
	db.actionInvokers.storeModule oUser.username, oAiThree

	pw = 'This password should come out cleartext'
	userparams = JSON.stringify password: pw
	oEncrypted = cryptico.encrypt userparams, strPublicKey

	db.actionInvokers.storeUserParams oAiThree.id, oUser.username, oEncrypted.cipher

	request =
		command: 'forge_rule'
		payload: JSON.stringify oRuleThree

	cm.processRequest oUser, request, ( answ ) =>
		test.strictEqual 200, answ.code, "Forging Rule returned #{ answ.code }: #{ answ.message }"

	fWaitForPersistence = () ->
		evt = objects.events.eventReal
		evt.eventid = 'event_testid'
		db.pushEvent evt
		console.log 'pushed'

		fWaitAgain = () ->
			console.log 'waited'
			db.getLog oUser.username, oRuleThree.id, ( err, data ) ->
				console.log data
				try
					logged = data.split( '] ' )[1]
					logged = logged.split( "\n" )[0]
					test.strictEqual logged, "{#{ oAiThree.id }} " + pw, 'Did not log the right thing'
				catch e
					test.ok false, 'Parsing log failed'

				setTimeout test.done, 200

		setTimeout fWaitAgain, 200

	setTimeout fWaitForPersistence, 200

