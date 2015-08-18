###

Dynamic Modules
===============
> Compiles CoffeeScript modules and loads JS modules in a VM, together
> with only a few allowed node.js modules.
###

# **Loads Modules:**

# - [Logging](logging.html)
log = require './logging'
# - [Persistence](persistence.html)
db = require './persistence'
# - [Encryption](encryption.html)
encryption = require './encryption'

# - Node.js Modules: [vm](http://nodejs.org/api/vm.html) and
#   [fs](http://nodejs.org/api/fs.html),
#   [path](http://nodejs.org/api/path.html) and
vm = require 'vm'
fs = require 'fs'
path = require 'path'

# - External Modules: [coffee-script](http://coffeescript.org/) and
#       [request](https://github.com/request/request)
cs = require 'coffee-script'
request = require 'request'

oModules = JSON.parse fs.readFileSync path.resolve __dirname, '..', 'config', 'modules.json'
oModules[mod] = require mod for mod in oModules # Replace all the module names with the actual module objects

regexpComments = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
getFunctionParamNames = (fName, func, oFuncs) ->
	fnStr = func.toString().replace regexpComments, ''
	result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match /([^\s,]+)/g
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
# exports.compileString = (src, userid, rule, moduleid, lang, moduletype, dbMod, cb) =>
exports.compileString = (args, cb) ->
	if not args.src or not args.userid or not args.moduleid or not args.lang or not args.moduletype
		answ = 
			code: 500
			message: 'Missing arguments!'
		return cb? answ

	if args.moduletype is 'actiondispatcher'
		dbMod = db.actionDispatchers
		logFunction = ( msg ) ->
			db.logRule args.userid, args.rule.id, args.moduleid, msg
	else
		dbMod = db.eventTriggers
		logFunction = ( msg ) ->
			db.logPoller args.userid, args.moduleid, msg
	
	ruleId = if args.rule then '.'+args.rule.id else ''
	args.id = args.userid+ruleId+'.'+args.moduleid+'.vm'
	args.comment = searchComment lang, src
	if lang is 'CoffeeScript'
		try
			log.info "DM | Compiling module '#{ args.moduleid }' for user '#{ args.userid }'"
			src = cs.compile src
		catch err
			cb
				answ:
					code: 400
					message: 'Compilation of CoffeeScript failed at line ' +
						err.location.first_line
			return

	log.info "DM | Trying to fetch user specific module '#{ args.moduleid }' paramters for user '#{ args.userid }'"
	# dbMod is only attached if the module really gets loaded and needs to fetch user information from the database
	if args.dryrun
		getUserParams = (m, u, cb) ->
			cb null, '{}'
	else
		getUserParams = dbMod.getUserParams

	getUserParams moduleid, userid, (err, obj) ->
		try
			oParams = {}
			for name, oParam of JSON.parse obj
				oParams[ name ] = encryption.decrypt oParam.value
			log.info "DM | Loaded user defined params for "
		catch err
			log.warn "DM | Error during parsing of user defined params for #{ args.muserid }, #{args.m rule.id }, #{ args.mmoduleid }"
			log.warn err

		answ =
			code: 200
			message: 'Successfully compiled'

		log.info "DM | Running module '#{ args.mmoduleid }' for user '#{ args.muserid }'"
		# The sandbox contains the objects that are accessible to the user. Eventually they need to be required from a vm themselves 
		sandbox = 
			id: args.id
			params: params
			log: logFunction
			exports: {}
			sendEvent: (hook, evt) ->
				options =
					uri: hook
					method: 'POST'
					json: true 
					body: evt
				request options, (err, res, body) ->
					if err or res.statusCode isnt 200
						logFunction 'ERROR('+__filename+') REQUESTING: '+hook+' ('+(new Date())+')'

		# Attach all modules that are allowed for the coders, as defined in config/modules.json
		sandbox[mod] = mod for mod in oModules

	#FIXME ENGINE BREAKS if non-existing module is used??? 

		#TODO child_process to run module!
		#Define max runtime per function call as 10 seconds, after that the child will be killed
		#it can still be active after that if there was a timing function or a callback used...
		#kill the child each time? how to determine whether there's still a token in the module?
		try
			# Finally the module is run in a 
			vm.runInNewContext args.src, sandbox, sandbox.id
			# TODO We should investigate memory usage and garbage collection (global.gc())?
			# Start Node with the flags —nouse_idle_notification and —expose_gc, and then when you want to run the GC, just call global.gc().
		catch err
			answ.code = 400
			msg = err.message
			if not msg
				msg = 'Try to run the script locally to track the error! Sadly we cannot provide the line number'
			answ.message = 'Loading Module failed: ' + msg

		log.info "DM | Module '#{ moduleid }' ran successfully for user '#{ userid }' in rule '#{ rule.id }'"
		oFuncParams = {}
		oFuncArgs = {}
		for fName, func of sandbox.exports
			getFunctionParamNames fName, func, oFuncParams

		oFuncArgs = {}
		# FIXME we return cb before they are even attached...
		fRegisterArguments = ( fName ) =>
			( err, obj ) =>
				if obj
					try
						oFuncArgs[fName] = JSON.parse obj
						log.info "DM | Found and attached user-specific arguments to #{ userid }, #{ rule.id }, #{ moduleid }: #{ obj }"
					catch err
						log.warn "DM | Error during parsing of user-specific arguments for #{ userid }, #{ rule.id }, #{ moduleid }"
						log.warn err
		for func of oFuncParams
			dbMod.getUserArguments args.userid, args.rule.id, args.moduleid, func, fRegisterArguments func
		cb
			answ: answ
			module: sandbox.exports
			funcParams: oFuncParams
			funcArgs: oFuncArgs
			logger: sandbox.log
			comment: comment

searchComment = (lang, src) ->
	arrSrc = src.split '\n'
	comm = ''
	for line in arrSrc
		line = line.trim()
		if line isnt ''
			if lang is 'CoffeeScript'
				if line.substring(0, 1) is '#' and line.substring(1, 3) isnt '###' 
					comm += line.substring(1) + '\n'
			else
				if line.substring(0, 2) is '//'
					comm += line.substring(2) + '\n'
	comm
