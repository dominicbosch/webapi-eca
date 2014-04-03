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

dm = require path.join '..', 'js-coffee', 'dynamic-modules'
dm opts

exports.testCompile = ( test ) ->
  test.expect 5

  paramsOne =
    testParam: 'First Test'
  paramsTwo =
    testParam: 'Second Test'

  code = "exports.testFunc = () ->\n\tparams.testParam"
  result = dm.compileString code, 'userOne', 'moduleOne', paramsOne, 'CoffeeScript'
  test.strictEqual 200, result.answ.code
  moduleOne = result.module
  test.strictEqual paramsOne.testParam, moduleOne.testFunc(), "Other result expected"

  result = dm.compileString code, 'userOne', 'moduleOne', paramsTwo, 'CoffeeScript'
  test.strictEqual 200, result.answ.code
  moduleTwo = result.module
  test.strictEqual paramsTwo.testParam, moduleTwo.testFunc(), "Other result expected"
  test.notStrictEqual paramsOne.testParam, moduleTwo.testFunc(), "Other result expected"
  test.done()