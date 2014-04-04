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

logger = require path.join '..', 'js-coffee', 'logging'
log = logger.getLogger
  nolog: true
opts =
  logger: log
  keygen: passPhrase

db = require path.join '..', 'js-coffee', 'persistence'
db opts

engine = require path.join '..', 'js-coffee', 'engine'
engine opts

dm = require path.join '..', 'js-coffee', 'dynamic-modules'
dm opts

oUser = objects.users.userOne
oRuleReal = objects.rules.ruleRealThree
oAi = objects.ais.aiThree

exports.tearDown = ( cb ) ->
  db.storeUser oUser
  db.deleteRule oRuleReal.id
  db.actionInvokers.deleteModule oAi.id
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


exports.testCorrectUserParams = ( test ) ->
  test.expect 1

  db.storeUser oUser
  db.storeRule oRuleReal.id, JSON.stringify oRuleReal
  db.linkRule oRuleReal.id, oUser.username
  db.activateRule oRuleReal.id, oUser.username
  db.actionInvokers.storeModule oUser.username, oAi

  pw = 'This password should come out cleartext'
  userparams = JSON.stringify password: pw
  oEncrypted = cryptico.encrypt userparams, strPublicKey

  db.actionInvokers.storeUserParams oAi.id, oUser.username, oEncrypted.cipher

  engine.internalEvent
    event: 'new'
    user: oUser.username
    rule: oRuleReal

  fWaitForPersistence = () ->
    evt = objects.events.eventReal
    evt.eventid = 'event_testid'
    db.pushEvent evt

    fWaitAgain = () ->
      db.getLog oUser.username, oRuleReal.id, ( err, data ) ->
        try
          logged = data.split( '] ' )[1]
          test.strictEqual logged, "{#{ oAi.id }} " + pw + "\n", 'Did not log the right thing'
        catch e
          test.ok false, 'Parsing log failed'

        engine.internalEvent
          event: 'del'
          user: oUser.username
          rule: null
          ruleId: oRuleReal.id
        setTimeout test.done, 200

    setTimeout fWaitAgain, 200

  setTimeout fWaitForPersistence, 200

