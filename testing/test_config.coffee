path = require 'path'
logger = require path.join '..', 'js-coffee', 'logging'
log = logger.getLogger
  nolog: true
conf = require path.join '..', 'js-coffee', 'config'
conf
  logger: log

exports.testRequire = ( test ) ->
  test.expect 1
  test.ok conf.isReady(), 'File does not exist!'
  test.done()

exports.testParameters = ( test ) ->
  reqProp = [
    'mode'
    'io-level'
    'file-level'
  ]
  test.expect 3 + reqProp.length
  test.ok conf.getHttpPort(), 'HTTP port does not exist!'
  test.ok conf.getDbPort(), 'DB port does not exist!'
  logconf = conf.getLogConf()
  test.ok logconf, 'Log config does not exist!'
  for prop in reqProp
    test.ok logconf[prop], "Log conf property #{ prop } does not exist!"
  test.done()

exports.testDifferentConfigFile = ( test ) ->
  test.expect 1
  conf
    # nolog: true
    configPath: path.join 'testing', 'files', 'jsonTestConfig.json'
  test.ok conf.isReady(), 'Different path not loaded!'
  test.done()

exports.testNoConfigFile = ( test ) ->
  test.expect 1
  conf 
    nolog: true
    configPath: 'wrongpath.file'
  test.strictEqual conf.isReady(), false, 'Wrong path still loaded!'
  test.done()
