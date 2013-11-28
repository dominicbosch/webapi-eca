###

Configuration
=============
> Loads the configuration file and acts as an interface to it.

###

# **Requires:**

# - [Logging](logging.html)
log = require './logging'

# - Node.js Modules: [fs](http://nodejs.org/api/fs.html) and
#   [path](http://nodejs.org/api/path.html)
fs = require 'fs'
path = require 'path'

###
##Module call

Calling the module as a function will make it look for the `relPath` property in the
args object and then try to load a config file from that relative path.
@param {Object} args
###
exports = module.exports = ( args ) -> 
  args = args ? {}
  log args
  if typeof args.relPath is 'string'
    loadConfigFile args.relPath
  module.exports

###
Tries to load a configuration file from the path relative to this module's parent folder. 
Reads the config file synchronously from the file system and try to parse it.

@private loadConfigFile
@param {String} relPath
###
loadConfigFile = ( relPath ) =>
  try
    @config = JSON.parse fs.readFileSync path.resolve __dirname, '..', relPath
    if @config and @config.http_port and @config.db_port and
                  @config.crypto_key and @config.session_secret
      log.print 'CF', 'config file loaded successfully'
    else
      log.error 'CF', new Error("""Missing property in config file, requires:
       - http_port
       - db_port
       - crypto_key
       - session_secret""")
  catch e
    e.addInfo = 'no config ready'
    log.error 'CF', e
  
loadConfigFile path.join('config', 'config.json')

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
exports.isReady = => @config?

###
***Returns*** the HTTP port

@public getHttpPort()
###
exports.getHttpPort = -> fetchProp 'http_port'

###
***Returns*** the DB port*

@public getDBPort()
###
exports.getDBPort = -> fetchProp 'db_port'

###
***Returns*** the crypto key

@public getCryptoKey()
###
exports.getCryptoKey = -> fetchProp 'crypto_key'

###
***Returns*** the session secret

@public getSessionSecret()
###
exports.getSessionSecret = -> fetchProp 'session_secret'
