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

logger = require path.join '..', 'js-coffee', 'logging'
log = logger.getLogger
  nolog: true
opts =
  logger: log

cm = require path.join '..', 'js-coffee', 'components-manager'
cm opts

db = require path.join '..', 'js-coffee', 'persistence'
db opts

oUser = objects.users.userOne
oRuleOne = objects.rules.ruleOne
oRuleTwo = objects.rules.ruleTwo
oEpOne = objects.eps.epOne
oEpTwo = objects.eps.epTwo

exports.tearDown = ( cb ) ->
  db.deleteRule oRuleOne.id
  db.deleteRule oRuleTwo.id
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
  test.expect 2

  db.storeRule oRuleOne.id, JSON.stringify oRuleOne
  request =
    command: 'forge_rule'
    payload: JSON.stringify oRuleTwo

  cm.addListener 'newRule', ( evt ) =>
    try
      newRule = JSON.parse evt
    catch err
      test.ok false, 'Failed to parse the newRule event'
    test.deepEqual newRule, oRuleTwo, 'New Rule is not the same!'
    test.done()

  cm.addListener 'init', ( evt ) =>
    try
      initRule = JSON.parse evt
    catch err
      test.ok false, 'Failed to parse the newRule event'
    test.deepEqual initRule, oRuleOne, 'Init Rule is not the same!'

  fWaitForInit = ->
    cm.processRequest oUser, request, ( answ ) =>
      if answ.code isnt 200
        test.ok false, 'testListener failed: ' + answ.message
        test.done()

  setTimeout fWaitForInit, 200

exports.moduleHandling =
  tearDown: ( cb ) ->
    db.eventPollers.deleteModule oEpOne.id
    db.eventPollers.deleteModule oEpTwo.id
    setTimeout cb, 100

  testGetModules: ( test ) ->
    test.expect 2

    db.eventPollers.storeModule oUser.username, oEpOne
    request =
      command: 'get_event_pollers'
 
    cm.processRequest oUser, request, ( answ ) =>
      test.strictEqual 200, answ.code, 'GetModules failed...' 
      oExpected = {}
      oExpected[oEpOne.id] = JSON.parse oEpOne.functions
      test.strictEqual JSON.stringify(oExpected), answ.message,
        'GetModules retrieved modules is not what we expected'
      test.done()

  testGetModuleParams: ( test ) ->
    test.expect 2

    db.eventPollers.storeModule oUser.username, oEpTwo

    request =
      command: 'get_event_poller_params'
      payload: '{"id": "' + oEpTwo.id + '"}'
 
    cm.processRequest oUser, request, ( answ ) =>
      test.strictEqual 200, answ.code,
        'Required Module Parameters did not return 200'
      test.strictEqual oEpTwo.params, answ.message,
        'Required Module Parameters did not match'
      test.done()

  testForgeModule: ( test ) ->
    test.expect 2

    oTmp = {}
    oTmp[key] = val for key, val of oEpTwo when key isnt 'functions'
    request =
      command: 'forge_event_poller'
      payload: JSON.stringify oTmp
 
    cm.processRequest oUser, request, ( answ ) =>
      test.strictEqual 200, answ.code, 'Forging Module did not return 200'

      db.eventPollers.getModule oEpTwo.id, ( err, obj ) ->
        test.deepEqual obj, oEpTwo, 'Forged Module is not what we expected'
        test.done()
