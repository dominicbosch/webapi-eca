exports.testRequire = (test) ->
	conf = require '../js-coffee/config'
	conf { logType: 2 }
	test.ok conf.isReady(), 'File exists'
	conf { relPath: 'wrongpath' }
	test.strictEqual conf.isReady(), false
	
	test.done()

exports.testParametersReady = (test) ->

	conf = require '../js-coffee/config'
	conf { logType: 2 }
	console.log conf
	test.ok conf.getHttpPort(), 'HTTP port exists'
	test.ok conf.getDBPort(), 'DB port exists'
	test.ok conf.getCryptoKey(), 'Crypto key exists'
	test.ok conf.getSessionSecret(), 'Session Secret exists'

	test.done()