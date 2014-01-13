exports.testRequire = (test) ->
	db = require '../js-coffee/db_interface'
	test.ok db, 'DB interface loaded'
	db { logType: 2 }
	test.ok conf.isReady(), 'File exists'

	test.ok conf.getHttpPort(), 'HTTP port exists'
	test.ok conf.getDBPort(), 'DB port exists'
	test.ok conf.getCryptoKey(), 'Crypto key exists'
	test.ok conf.getSessionSecret(), 'Session Secret exists'

	conf { relPath: 'wrongpath' }
	test.strictEqual conf.isReady(), false
	
	test.done()
