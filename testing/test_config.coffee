path = require 'path'

exports.setUp = ( cb ) =>
  @conf = require path.join '..', 'js-coffee', 'config'
  @conf
    logType: 2
  cb()

exports.testRequire = ( test ) =>
  test.expect 1
  test.ok @conf.isReady(), 'File does not exist!'
  test.done()

exports.testParameters = ( test ) =>
  test.expect 4
  test.ok @conf.getHttpPort(), 'HTTP port does not exist!'
  test.ok @conf.getDBPort(), 'DB port does not exist!'
  test.ok @conf.getCryptoKey(), 'Crypto key does not exist!'
  test.ok @conf.getSessionSecret(), 'Session Secret does not exist!'
  test.done()

exports.testDifferentConfigFile = ( test ) =>
  test.expect 1
  @conf 
    configPath: 'testing/jsonWrongConfig.json'
  test.ok @conf.isReady(), 'Different path not loaded!'
  test.done()

exports.testNoConfigFile = ( test ) =>
  test.expect 1
  @conf
    configPath: 'wrongpath.file'
  test.strictEqual @conf.isReady(), false, 'Wrong path still loaded!'
  test.done()
