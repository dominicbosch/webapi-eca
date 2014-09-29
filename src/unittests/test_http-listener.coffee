
#
# WARNING
#
# We would need to create a helper/wrapper module to test the http-listener.
# This is because the creation of an express server leaves us with an ever running
# server that can't be stopped because of its asynchronity. We need to call
# process.exit() at the very and of an existance of such an instance.
# But calling this will also cause the unit test to stop.
# Thus we could only test this module by creating a helper/wrapper module and
# forking a child process for it, which we then could kill.
#
# All functionality can anyways be tested within its parent (webapi-eca), thus
# we won't make the effort with the helper/wrapper module for now.
#

exports.testsGoInWebAPI_ECA_Module = ( test ) ->
  test.expect 1
  test.ok true, 'All tests for this should be implemented in the webapi-eca module'
  test.done()

# fs = require 'fs'
# path = require 'path'
# http = require 'http'
# needle = require 'needle'
# logger = require path.join '..', 'js', 'logging'
# log = logger.getLogger
#   nolog: true

# exports.testResponse = ( test ) =>
#   test.expect 2
#   pathFile = path.resolve  'webpages', 'public', 'style.css'
#   fl = fs.readFileSync pathFile, 'utf-8'

#   hl = require path.join '..', 'js', 'http-listener'
#   fWaitForTestEnd = () =>
#     console.log 'hl end?'
#     process.kill()

#   server  = http.createServer()
#   server.listen(0)
#   server.on 'listening', () ->
#     freeport = server.address().port
#     server.close
#     args = {
#       logger: log
#     }
#     args[ 'http-port' ] = 8650
#     hl args

#     needle.get 'localhost:8650/style.css', (err, resp, body) ->
#       test.ifError err, 'No response from the server'
#       test.strictEqual fl, body, 'Wrong contents received'

#       test.done()
#       setTimeout fWaitForTestEnd, 500


# exports.testWrongPort = ( test ) =>
#   test.expect 1

#   hl = require path.join '..', 'js', 'http-listener'
#   fWaitForTestEnd = () =>
#     console.log 'hl end?'
#     process.kill()

#   isRunning = true
#   hl.addShutdownHandler () ->
#     test.ok true, 'Placeholder'
#     isRunning = false
#     setTimeout fWaitForTestEnd, 1000
#     test.done()
#   args = {
#     logger: log
#   }
#   args[ 'http-port' ] = 8080211241
#   hl args

#   fWaitForInit = () ->
#     test.ok !isRunning, 'Still running !?'
#     if isRunning
#       test.done()
#     setTimeout fWaitForTestEnd, 500

#   setTimeout fWaitForInit, 500

#TODO add routing tests... enjoy ;)