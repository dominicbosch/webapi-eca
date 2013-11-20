'use strict'

path = require 'path'
log = require './logging'
fs = require 'fs'
config = null


###
Calling the module as a function will make it look for the `relPath` property in the
args object and then try to load a config file from that relative path.
@param {Object} args
###
exports = module.exports = (args) -> 
  args = args ? {}
  log args
  if typeof args.relPath is 'string'
    loadConfigFiles args.relPath
  module.exports

###
@Function loadConfigFile 

Tries to load a configuration file from the path relative to this module's parent folder. 
@param {String} relPath
###
loadConfigFile = (relPath) ->
  try
    ### We read the config file synchronously from the file system and try to parse it ###
    config = JSON.parse fs.readFileSync path.resolve __dirname, '..', relPath
    if config and config.http_port and config.db_port and
                  config.crypto_key and config.session_secret
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

### Answer true if the config file is ready, else false ###
exports.isReady = -> config?

###
Fetch a property from the configuration
@param {String} prop
###
fetchProp = (prop) -> config?[prop]

###
Get the HTTP port
###
exports.getHttpPort = -> fetchProp 'http_port'

###
Get the DB port
###
exports.getDBPort = -> fetchProp 'db_port'

###
Get the crypto key
###
exports.getCryptoKey = -> fetchProp 'crypto_key'

###
Get the session secret
###
exports.getSessionSecret = -> fetchProp 'session_secret'
