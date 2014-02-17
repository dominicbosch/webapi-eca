###

Server
============

>This is the main module that is used to run the whole server:
>
>     node server [opt]
>
> See below in the optimist CLI preparation for allowed optional parameters
###

# **Requires:**

# - [Logging](logging.html)
logger = require './new_logging'

# - [Configuration](config.html)
conf = require './config'

# - [Persistence](persistence.html)
db = require './persistence'

# - [Engine](engine.html)
engine = require './engine'

# - [HTTP Listener](http_listener.html)
http_listener = require './http_listener'

# - Node.js Modules: [fs](http://nodejs.org/api/fs.html),
# [path](http://nodejs.org/api/path.html)
# and [child_process](http://nodejs.org/api/child_process.html)
fs = require 'fs'
path = require 'path'
cp = require 'child_process'

# - External Module: [optimist](https://github.com/substack/node-optimist)
optimist = require 'optimist'

procCmds = {}

###
Let's prepare the optimist CLI
###
usage = 'This runs your webapi-based ECA engine'
opt =
  'h':
    alias : 'help',
    describe: 'Display this'
  'c':
    alias : 'config-path',
    describe: 'Specify a path to a custom configuration file, other than "config/config.json"'
  'w':
    alias : 'http-port',
    describe: 'Specify a HTTP port for the web server'
  'd':
    alias : 'db-port',
    describe: 'Specify a port for the redis DB'
  'm':
    alias : 'log-mode',
    describe: 'Specify a log mode: [development|productive]'
  'i':
    alias : 'log-io-level',
    describe: 'Specify the log level for the I/O'
  'f':
    alias : 'log-file-level',
    describe: 'Specify the log level for the log file'
  'p':
    alias : 'log-file-path',
    describe: 'Specify the path to the log file within the "logs" folder'
  'n':
    alias : 'nolog',
    describe: 'Set this if no output shall be generated'
argv = optimist.usage( usage ).options( opt ).argv
if argv.help
  console.log optimist.help()
  process.exit()

###
Error handling of the express port listener requires special attention,
thus we have to catch the process error, which is issued if
the port is already in use.
###
process.on 'uncaughtException', ( err ) ->
  switch err.errno
    when 'EADDRINUSE'
      err.addInfo = 'http-port already in use, shutting down!'
      log.error 'RS', err
      shutDown()
    # else log.error 'RS', err
    else throw err
###
This function is invoked right after the module is loaded and starts the server.

@private init()
###
init = ->
  conf argv.c
  # > Check whether the config file is ready, which is required to start the server.
  if !conf.isReady()
    console.error 'FAIL: Config file not ready! Shutting down...'
    process.exit()

  logconf = conf.getLogConf()
  if argv.m
    logconf[ 'mode' ] = argv.m
  if argv.i
    logconf[ 'io-level' ] = argv.i
  if argv.f
    logconf[ 'file-level' ] = argv.f
  if argv.p
    logconf[ 'file-path' ] = argv.p
  if argv.n
    logconf[ 'nolog' ] = argv.n
  try
    fs.unlinkSync path.resolve __dirname, '..', 'logs', logconf[ 'file-path' ]
  log = logger logconf
  log.info 'RS | STARTING SERVER'

  args =
    logger: log
    logconf: logconf
  # > Fetch the `http-port` argument
  args[ 'http-port' ] = parseInt argv.w || conf.getHttpPort()
  
  log.info 'RS | Initialzing DB'
  db args
  # > We only proceed with the initialization if the DB is ready
  db.isConnected ( err, result ) ->
    if !err
    
      # > Initialize all required modules with the args object.
      log.info 'RS | Initialzing engine'
      engine args
      log.info 'RS | Initialzing http listener'
      http_listener args
      
      # > Distribute handlers between modules to link the application.
      log.info 'RS | Passing handlers to engine'
      engine.addPersistence db
      log.info 'RS | Passing handlers to http listener'
      #TODO engine pushEvent needs to go into redis queue
      http_listener.addShutdownHandler shutDown
      #TODO loadAction and addRule will be removed
      #mm.addHandlers db, engine.loadActionModule, engine.addRule
      log.info 'RS | For e child process for the event poller'
      cliArgs = [
        args.logconf['mode']
        args.logconf['io-level']
        args.logconf['file-level']
        args.logconf['file-path']
        args.logconf['nolog']
      ]
      poller = cp.fork path.resolve( __dirname, 'event_poller' ), cliArgs

###
Shuts down the server.

@private shutDown()
### 
shutDown = ->
  log.warn 'RS | Received shut down command!'
  engine?.shutDown()
  http_listener?.shutDown()

###
## Process Commands

When the server is run as a child process, this function handles messages
from the parent process (e.g. the testing suite)
###
process.on 'message', ( cmd ) -> procCmds[cmd]?()

# The die command redirects to the shutDown function.
procCmds.die = shutDown

# *Start initialization*
init()
