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


exports.testListener = ( test ) ->
  test.expect 2

  oRuleOne = objects.rules.ruleOne
  oRuleTwo = objects.rules.ruleOne
  db.storeRule 'test-cm-rule', JSON.stringify oRuleOne
  cm.addListener 'init', ( evt ) =>
    test.deepEqual evt, oRuleOne, 'Event is not the same!'
    console.log 'got and checked init'

    cm.addListener 'newRule', ( evt ) =>
      console.log 'new rule listener added'
      test.deepEqual evt, oRuleTwo, 'Event is not the same!'
      test.done()
    cm.processRequest oUser, oRuleTwo, ( answ ) =>
      console.log answ 
