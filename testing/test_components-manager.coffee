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

cm = require path.join '..', 'js-coffee', 'components-manager'
opts =
  logger: log
cm opts

db = require path.join '..', 'js-coffee', 'persistence'
db opts


exports.testEmptyPayload = ( test ) =>
  test.expect 1

  oUser = objects.users.userOne
  request =
    command: 'get_event_pollers'

  cm.processRequest oUser, request, ( answ ) =>
    test.equals 200, answ.code, 'testListener failed: ' + answ.message
    test.done()

exports.testListener = ( test ) =>
  test.expect 2

  oUser = objects.users.userOne
  oRuleOne = objects.rules.ruleOne
  oRuleTwo = objects.rules.ruleTwo
  db.storeRule 'test-cm-rule', JSON.stringify oRuleOne
  request =
    command: 'forge_rule'
    payload: JSON.stringify oRuleTwo

  cm.addListener 'newRule', ( evt ) =>
    console.log 'got new rule!'
    test.deepEqual evt, oRuleTwo, 'Event is not the same!'
    test.done()

  console.log 'new rule listener added'    
  cm.addListener 'init', ( evt ) =>
    test.deepEqual evt, oRuleOne, 'Event is not the same!'
    console.log 'got and checked init'

  cm.processRequest oUser, request, ( answ ) =>
    console.log answ
    if answ.code isnt 200
      test.ok false, 'testListener failed: ' + answ.message
      test.done()

  console.log 'init listener added'    

exports.testListener = ( test ) =>
  test.expect 2

  oUser = objects.users.userOne
  oRuleOne = objects.rules.ruleOne
  oRuleTwo = objects.rules.ruleTwo
  db.storeRule 'test-cm-rule', JSON.stringify oRuleOne
  request =
    command: 'forge_rule'
    payload: JSON.stringify oRuleTwo

  cm.addListener 'newRule', ( evt ) =>
    console.log 'got new rule!'
    test.deepEqual evt, oRuleTwo, 'Event is not the same!'
    test.done()

  console.log 'new rule listener added'    
  cm.addListener 'init', ( evt ) =>
    test.deepEqual evt, oRuleOne, 'Event is not the same!'
    console.log 'got and checked init'

  cm.processRequest oUser, request, ( answ ) =>
    console.log answ
    if answ.code isnt 200
      test.ok false, 'testListener failed: ' + answ.message
      test.done()

  console.log 'init listener added'    
exports.testListener = ( test ) =>
  test.expect 2

  oUser = objects.users.userOne
  oRuleOne = objects.rules.ruleOne
  oRuleTwo = objects.rules.ruleTwo
  db.storeRule 'test-cm-rule', JSON.stringify oRuleOne
  request =
    command: 'forge_rule'
    payload: JSON.stringify oRuleTwo

  cm.addListener 'newRule', ( evt ) =>
    console.log 'got new rule!'
    test.deepEqual evt, oRuleTwo, 'Event is not the same!'
    test.done()

  console.log 'new rule listener added'    
  cm.addListener 'init', ( evt ) =>
    test.deepEqual evt, oRuleOne, 'Event is not the same!'
    console.log 'got and checked init'

  cm.processRequest oUser, request, ( answ ) =>
    console.log answ
    if answ.code isnt 200
      test.ok false, 'testListener failed: ' + answ.message
      test.done()

  console.log 'init listener added'    