###

Dynamic Modules
===============
> Compiles CoffeeScript modules and loads JS modules in a VM, together
> with only a few allowed node.js modules.
###

# **Loads Modules:**

# - [Persistence](persistence.html)
db = require './persistence'

# - Node.js Modules: [vm](http://nodejs.org/api/vm.html) and
#   [events](http://nodejs.org/api/events.html)
vm = require 'vm'
needle = require 'needle'
request = require 'request'

# - External Modules: [coffee-script](http://coffeescript.org/),
#       [cryptico](https://github.com/wwwtyro/cryptico),
#       [crypto-js](https://www.npmjs.org/package/crypto-js) and
#       [import-io](https://www.npmjs.org/package/import-io)
cs = require 'coffee-script'
cryptico = require 'my-cryptico'
cryptoJS = require 'crypto-js'
importio = require( 'import-io' ).client



###
Module call
-----------
Initializes the dynamic module handler.

@param {Object} args
###
exports = module.exports = ( args ) =>
	@log = args.logger
	# FIXME this can't come through the arguments
	if not @strPublicKey and args[ 'keygen' ]
		db args
		passPhrase = args[ 'keygen' ]
		numBits = 1024
		@oPrivateRSAkey = cryptico.generateRSAKey passPhrase, numBits
		@strPublicKey = cryptico.publicKeyString @oPrivateRSAkey
		@log.info "DM | Public Key generated: #{ @strPublicKey }"

	module.exports


exports.getPublicKey = () =>
	@strPublicKey

logFunction = ( uId, rId, mId ) ->
	( msg ) ->
		db.appendLog uId, rId, mId, msg

regexpComments = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
getFunctionParamNames = ( fName, func, oFuncs ) ->
	fnStr = func.toString().replace regexpComments, ''
	result = fnStr.slice( fnStr.indexOf( '(' ) + 1, fnStr.indexOf( ')' ) ).match /([^\s,]+)/g
	if not result
		 result = []
	oFuncs[fName] = result

###
Try to run a JS module from a string, together with the
given parameters. If it is written in CoffeeScript we
compile it first into JS.

@public compileString ( *src, id, params, lang* )
@param {String} src
@param {String} id
@param {Object} params
@param {String} lang
###
exports.compileString = ( src, userId, ruleId, modId, lang, dbMod, cb ) =>
	if lang is 'CoffeeScript'
		try
			@log.info "DM | Compiling module '#{ modId }' for user '#{ userId }'"
			src = cs.compile src
		catch err
			cb
				code: 400
				message: 'Compilation of CoffeeScript failed at line ' +
					err.location.first_line
			return

	@log.info "DM | Trying to fetch user specific module '#{ modId }' paramters for user '#{ userId }'"
	# dbMod is only attached if the module really gets loaded and needs to fetch user information from the database
	if dbMod
		dbMod.getUserParams modId, userId, ( err, obj ) =>
			try
				oDecrypted = cryptico.decrypt obj, @oPrivateRSAkey
				obj = JSON.parse oDecrypted.plaintext
				@log.warn "DM | Loaded user defined params for #{ userId }, #{ ruleId }, #{ modId }"
			catch err
				@log.warn "DM | Error during parsing of user defined params for #{ userId }, #{ ruleId }, #{ modId }"
				@log.warn err
			fTryToLoadModule userId, ruleId, modId, src, dbMod, obj, cb
	else
		fTryToLoadModule userId, ruleId, modId, src, dbMod, null, cb


fTryToLoadModule = ( userId, ruleId, modId, src, dbMod, params, cb ) =>
	if not params
		params = {}

		answ =
		code: 200
		message: 'Successfully compiled'

	@log.info "DM | Running module '#{ modId }' for user '#{ userId }'"
	# The function used to provide logging mechanisms on a per rule basis
	logFunc = logFunction userId, ruleId, modId
	# The sandbox contains the objects that are accessible to the user. Eventually they need to be required from a vm themselves 
	sandbox = 
		id: "#{ userId }.#{ ruleId }.#{ modId }.vm"
		params: params
		needle: needle
		importio: importio
		request: request
		cryptoJS: cryptoJS
		log: logFunc
		debug: console.log
		exports: {}

	#TODO child_process to run module!
	#Define max runtime per function call as 10 seconds, after that the child will be killed
	#it can still be active after that if there was a timing function or a callback used...
	#kill the child each time? how to determine whether there's still a token in the module?
	try
		# Finally the module is run in a 
		vm.runInNewContext src, sandbox, sandbox.id
		# TODO We should investigate memory usage and garbage collection (global.gc())?
		# Start Node with the flags —nouse_idle_notification and —expose_gc, and then when you want to run the GC, just call global.gc().
	catch err
		answ.code = 400
		msg = err.message
		if not msg
			msg = 'Try to run the script locally to track the error! Sadly we cannot provide the line number'
		answ.message = 'Loading Module failed: ' + msg

	@log.info "DM | Module '#{ modId }' ran successfully for user '#{ userId }' in rule '#{ ruleId }'"
	oFuncParams = {}
	oFuncArgs = {}
	for fName, func of sandbox.exports
		getFunctionParamNames fName, func, oFuncParams

	if dbMod
		oFuncArgs = {}
		console.log 'oFuncParams'
		console.log oFuncParams

		for func of oFuncParams
			console.log 'fetching ' + func
			console.log  typeof func
			dbMod.getUserArguments modId, func, userId, ( err, obj ) =>
				console.log err, obj
				try
					oDecrypted = cryptico.decrypt obj, @oPrivateRSAkey
					oFuncArgs[ func ] = JSON.parse oDecrypted.plaintext
				catch err
					@log.warn "DM | Error during parsing of user defined params for #{ userId }, #{ ruleId }, #{ modId }"
					@log.warn err
	
	console.log 'answering compile request string'
	console.log cb

	cb
		answ: answ
		module: sandbox.exports
		funcParams: oFuncParams
		funcArgs: oFuncArgs
		logger: sandbox.log
