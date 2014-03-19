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

###
Module call
-----------

Calling the module as a function will act as a constructor and load the config file.
It is possible to hand an args object with the properties nolog (true if no outputs shall
be generated) and configPath for a custom configuration file path.

@param {Object} args
###
exports = module.exports = ( args ) =>
  args = args ? {}
  if args.nolog
    @nolog = true
  if args.configPath
    loadConfigFile args.configPath
  else
    loadConfigFile path.join 'config', 'config.json'
  module.exports

###
Tries to load a configuration file from the path relative to this module's parent folder. 
Reads the config file synchronously from the file system and try to parse it.

@private loadConfigFile
@param {String} configPath
###
loadConfigFile = ( configPath ) =>
  @config = null
  confProperties = [
    'log'
    'http-port'
    'db-port'
  ]
  #TODO Try to get rid of crypto key
  try
    @config = JSON.parse fs.readFileSync path.resolve __dirname, '..', configPath
    @isReady = true
    for prop in confProperties
      if !@config[prop]
        @isReady = false
    if not @isReady and not @nolog
      console.error "Missing property in config file, requires:\n" +
         " - #{ confProperties.join "\n - " }"
  catch e
    if not @nolog
      console.error "Failed loading config file: #{ e.message }"
  

###
Fetch a property from the configuration

@private fetchProp( *prop* )
@param {String} prop
###
fetchProp = ( prop ) => @config?[prop]

###
***Returns*** true if the config file is ready, else false

@public isReady()
###
exports.isReady = => @isReady

###
***Returns*** the HTTP port

@public getHttpPort()
###
exports.getHttpPort = -> fetchProp 'http-port'

###
***Returns*** the DB port*

@public getDBPort()
###
exports.getDbPort = -> fetchProp 'db-port'

###
***Returns*** the log conf object

@public getLogConf()
###
exports.getLogConf = -> fetchProp 'log'

###
***Returns*** the crypto key

@public getCryptoKey()
###
exports.getCryptoKey = -> fetchProp 'crypto-key'
