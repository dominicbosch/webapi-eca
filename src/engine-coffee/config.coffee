###

Configuration
=============
> Loads the configuration file and acts as an interface to it.

###

# **Loads Modules:**

# - Node.js Modules: [fs](http://nodejs.org/api/fs.html) and
#   [path](http://nodejs.org/api/path.html)
fs = require 'fs'
path = require 'path'

oConfig = {}

###
init( configPath )
-----------

Calling the init function will load the config file.
It is possible to hand a configPath for a custom configuration file path.

@param {Object} args
###
oConfig.init = ( filePath ) =>
	if @isInitialized
		console.error 'ERROR: Already initialized configuration!'
	else
		@isInitialized = true
		configPath = path.resolve( filePath || path.join __dirname, '..', 'config', 'systems.json' )
		try
			oConffile = JSON.parse fs.readFileSync path.resolve __dirname, '..', configPath
			for prop, oValue of oConffile
				oConfig[ prop ] = oValue
			# We replace the config initialization routine
			oConfig.init = () ->
				console.error 'ERROR: Already initialized configuration!'
			oConfig.isInit = true
		catch e
			oConfig = null
			console.error "Failed loading config file: #{ e.message }"

exports = module.exports = oConfig
