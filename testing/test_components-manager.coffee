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
log = logger.getLogger()
  # nolog: true

cm = require path.join '..', 'js-coffee', 'components-manager'
opts =
  logger: log
cm opts

db = require path.join '..', 'js-coffee', 'persistence'
db opts

oUser = objects.users.userOne
oRuleOne = objects.rules.ruleOne
oRuleTwo = objects.rules.ruleTwo

exports.tearDown = ( cb ) ->
  db.deleteRule oRuleOne.id
  db.deleteRule oRuleTwo.id
  cb()

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
  testGetModules: ( test ) ->
    test.expect 2

    oModule = objects.eps.epOne
    db.eventPollers.storeModule oUser.username, oModule
    request =
      command: 'get_event_pollers'
 
    cm.processRequest oUser, request, ( answ ) =>
      test.strictEqual 200, answ.code, 'GetModules failed...' 
      oExpected = {}
      oExpected[oModule.id] = JSON.parse oModule.functions
      test.strictEqual JSON.stringify(oExpected), answ.message,
        'GetModules retrieved modules is not what we expected'

      console.log answ
      test.done()

  # testGetModuleParams: ( test ) ->
  #   test.expect 1

  #   oModule = objects.eps.epOne
  #   db.eventPollers.storeModule oUser.username, oModule
  #   request =
  #     command: 'get_event_pollers'
 
  #   cm.processRequest oUser, request, ( answ ) =>
  #     test.strictEqual 200, answ.code, 'Empty payload did not return 200'
  #     console.log answ
  #     test.done()
