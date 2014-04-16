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

db = require path.join '..', 'js', 'persistence'
db opts

engine = require path.join '..', 'js', 'engine'
engine opts

dm = require path.join '..', 'js', 'dynamic-modules'
dm opts

oUser = objects.users.userOne
oRule = objects.rules.ruleThree
oAi = objects.ais.aiThree

exports.setUp = ( cb ) ->
	engine.startEngine()
	cb()

exports.tearDown = ( cb ) ->
	db.deleteRule oRule.id
	db.actionInvokers.deleteModule oAi.id
	engine.shutDown()
	setTimeout cb, 200

exports.testCompile = ( test ) ->
	test.expect 5

	paramOne = 'First Test'
	code = "exports.testFunc = () ->\n\t'#{ paramOne }'"
	dm.compileString code, 'userOne', 'ruleOne', 'moduleOne', 'CoffeeScript', null, ( result ) ->
		test.strictEqual 200, result.answ.code
		moduleOne = result.module
		test.strictEqual paramOne, moduleOne.testFunc(), "Other result expected"

	paramTwo = 'Second Test'
	code = "exports.testFunc = () ->\n\t'#{ paramTwo }'"
	dm.compileString code, 'userOne', 'ruleOne', 'moduleOne', 'CoffeeScript', null, ( result ) ->
		test.strictEqual 200, result.answ.code
		moduleTwo = result.module
		test.strictEqual paramTwo, moduleTwo.testFunc(), "Other result expected"
		test.notStrictEqual paramOne, moduleTwo.testFunc(), "Other result expected"
	setTimeout test.done, 200
