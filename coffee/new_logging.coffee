
# Logging
# =======
# A Helper to handle logging.

# **Requires:**
# - Node.js Module(s): [path](http://nodejs.org/api/path.html)
path = require 'path'

# - External Module(s): [bunyan](https://github.com/trentm/node-bunyan)
bunyan = require 'bunyan'

###
Module call
-----------

Calling the module as a function will act as a constructor and load the config file.
It is possible to hand an args object with the properties nolog (true if no outputs shall
be generated) and configPath for a custom configuration file path.

@param {Object} args
###
exports = module.exports = ( args ) =>
  emptylog =
    {
      info: () ->
      warn: () ->
      error: () ->
    }
  args = args ? {}
  if args.nolog
    emptylog
  else
    try
      opt =
        name: "webapi-eca"
      if args['mode'] is 'development'
        opt.src = true
      if args['file-path']
        @logPath = path.resolve __dirname, '..', 'logs', args['file-path']
      else
        @logPath = path.resolve __dirname, '..', 'logs', 'server.log'
      opt.streams = [
        {
          level: args['io-level']
          stream: process.stdout
        },
        {
          level: args['file-level']
          type: 'rotating-file'
          path: @logPath
          period: '1d'
          count: 3
        }
      ]
      bunyan.createLogger opt
    catch e
      console.error e
      emptylog