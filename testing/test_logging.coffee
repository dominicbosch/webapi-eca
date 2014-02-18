
exports.setUp = ( cb ) =>
  @fs = require 'fs'
  @path = require 'path'
  @stdPath = @path.resolve __dirname, '..', 'logs', 'server.log'
  try
    @fs.unlinkSync @stdPath
  catch e
  @log = require @path.join '..', 'js-coffee', 'new-logging'
  cb()
  
exports.tearDown = ( cb ) =>
  cb()

exports.testInitIO = ( test ) =>
  test.expect 1
  conf = 
    logType: 0
  @log.configure conf
  @log.info 'TL', 'testInitIO - info'
  @log.warn 'TL', 'testInitIO - warn'
  @log.error 'TL', 'testInitIO - error'
  test.ok !@fs.existsSync @stdPath
  test.done()

exports.testInitFile = ( test ) =>
  test.expect 1

  conf = 
    logType: 1
  @log.configure conf
  @log.info 'UT', 'test 1'

  fWait = () => 
    @log.info 'UT', 'test 2'
    test.ok @fs.existsSync @stdPath
    test.done()

  setTimeout fWait, 100

# exports.testInitSilent = ( test ) =>
#   test.expect 1

#   conf = 
#     logType: 2
#   @log.configure conf
#   @log.info 'test 3'

#   test.ok true, 'yay'
#   test.done()

# exports.testInitPath = ( test ) =>
#   test.expect 1

#   conf = 
#     logType: 1
#     logPath: 'testing/log-initPath.log'
#   @log.configure conf
#   @log.info 'test 3'

#   test.ok true, 'yay'
#   test.done()

# exports.testPrint = ( test ) =>
#   test.expect 1
#   test.ok true, 'yay'
#   @log.info 'test 3'
#   test.done()