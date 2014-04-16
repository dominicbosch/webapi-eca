fs = require 'fs'
path = require 'path'

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

engine = require path.join '..', 'js', 'engine'
engine opts

db = require path.join '..', 'js', 'persistence'
db opts

listRules = engine.getListUserRules()

oUser = objects.users.userOne
oRuleOne = objects.rules.ruleOne
oRuleTwo = objects.rules.ruleTwo
oAiOne = objects.ais.aiOne
oAiTwo = objects.ais.aiTwo

exports.setUp = ( cb ) ->
	engine.startEngine()
	cb()
	
exports.tearDown = ( cb ) ->
	db.deleteRule oRuleOne.id
	db.actionInvokers.deleteModule oAiOne.id
	db.actionInvokers.deleteModule oAiTwo.id
	# TODO if user is deleted all his modules should be unlinked and deleted
	db.deleteUser oUser.username

	engine.internalEvent
		event: 'del'
		user: oUser.username
		rule: oRuleOne

	engine.internalEvent
		event: 'del'
		user: oUser.username
		rule: oRuleTwo
	engine.shutDown()

	setTimeout cb, 200

exports.ruleEvents =
	testInitAddDeleteMultiple: ( test ) ->
		test.expect 2 + 2 * oRuleOne.actions.length + oRuleTwo.actions.length

		db.storeUser oUser
		db.storeRule oRuleOne.id, JSON.stringify oRuleOne
		db.linkRule oRuleOne.id, oUser.username
		db.activateRule oRuleOne.id, oUser.username
		db.actionInvokers.storeModule oUser.username, oAiOne
		db.actionInvokers.storeModule oUser.username, oAiTwo

		test.strictEqual listRules[oUser.username], undefined, 'Initial user object exists!?'

		engine.internalEvent
			event: 'new'
			user: oUser.username
			rule: oRuleOne

		fWaitForPersistence = () ->

			for act in oRuleOne.actions
				mod = ( act.split ' -> ' )[0]
				test.ok listRules[oUser.username][oRuleOne.id].actions[mod], 'Missing action!'
	

			engine.internalEvent
				event: 'new'
				user: oUser.username
				rule: oRuleTwo

			fWaitAgainForPersistence = () ->

				for act in oRuleTwo.actions
					mod = ( act.split ' -> ' )[0]
					test.ok listRules[oUser.username][oRuleTwo.id].actions[mod], 'Missing action!'
		
				engine.internalEvent
					event: 'del'
					user: oUser.username
					rule: null
					ruleId: oRuleTwo.id

				for act in oRuleOne.actions
					mod = ( act.split ' -> ' )[0]
					test.ok listRules[oUser.username][oRuleOne.id].actions[mod], 'Missing action!'
		
				engine.internalEvent
					event: 'del'
					user: oUser.username
					rule: null
					ruleId: oRuleOne.id

				test.strictEqual listRules[oUser.username], undefined, 'Final user object exists!?'
				test.done()

			setTimeout fWaitAgainForPersistence, 200

		setTimeout fWaitForPersistence, 200

# #TODO
#   testUpdate: ( test ) ->
#     test.expect 0

#     test.done()

#     db.storeUser oUser
#     db.storeRule oRuleOne.id, JSON.stringify oRuleOne
#     db.linkRule oRuleOne.id, oUser.username
#     db.activateRule oRuleOne.id, oUser.username
#     db.actionInvokers.storeModule oUser.username, oAiOne


#     db.getAllActivatedRuleIdsPerUser ( err, obj ) ->
#       console.log 'existing'
#       console.log obj

#       engine.internalEvent
#         event: 'init'
#         user: oUser.username
#         rule: oRuleOne

#       fCheckRules = () ->
#         db.getAllActivatedRuleIdsPerUser ( err, obj ) ->
#           console.log 'after init'
#           console.log obj

#       setTimeout fCheckRules, 500

exports.engine =
	testMatchingEvent: ( test ) ->
		test.expect 1
		db.storeUser oUser
		db.storeRule oRuleOne.id, JSON.stringify oRuleOne
		db.linkRule oRuleOne.id, oUser.username
		db.activateRule oRuleOne.id, oUser.username
		db.actionInvokers.storeModule oUser.username, oAiOne

		engine.internalEvent
			event: 'new'
			user: oUser.username
			rule: oRuleOne

		fWaitForPersistence = () ->
			evt = objects.events.eventReal
			evt.eventid = 'event_testid'
			db.pushEvent evt

			fWaitAgain = () ->
				db.getLog oUser.username, oRuleOne.id, ( err, data ) ->
					try

						logged = data.split( '] ' )[1]
						logged = logged.split( "\n" )[0]
						test.strictEqual logged, "{#{ oAiOne.id }} " + evt.payload.property, 'Did not log the right thing'
					catch e
						test.ok false, 'Parsing log failed'
					test.done()

			setTimeout fWaitAgain, 200

		setTimeout fWaitForPersistence, 200