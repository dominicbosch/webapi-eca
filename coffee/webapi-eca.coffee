###

WebAPI-ECA Engine
=================

>This is the main module that is used to run the whole application:
>
>     node webapi-eca [opt]
>
> See below in the optimist CLI preparation for allowed optional parameters `[opt]`.
###

# **Loads Modules:**

# - [Logging](logging.html)
logger = require './logging'

# - [Configuration](config.html)
conf = require './config'

# - [Persistence](persistence.html)
db = require './persistence'

# - [Engine](engine.html)
engine = require './engine'

# - [HTTP Listener](http-listener.html)
http = require './http-listener'

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
Let's prepare the optimist CLI optional arguments `[opt]`:
###
usage = 'This runs your webapi-based ECA engine'
opt =
#  `-h`, `--help`: Display the help
  'h':
    alias : 'help',
    describe: 'Display this'
#  `-c`, `--config-path`: Specify a path to a custom configuration file, other than "config/config.json"
  'c':
    alias : 'config-path',
    describe: 'Specify a path to a custom configuration file, other than "config/config.json"'
#  `-w`, `--http-port`: Specify a HTTP port for the web server 
  'w':
    alias : 'http-port',
    describe: 'Specify a HTTP port for the web server'
#  `-d`, `--db-port`: Specify a port for the redis DB
  'd':
    alias : 'db-port',
    describe: 'Specify a port for the redis DB'
#  `-m`, `--log-mode`: Specify a log mode: [development|productive]
  'm':
    alias : 'log-mode',
    describe: 'Specify a log mode: [development|productive]'
#  `-i`, `--log-io-level`: Specify the log level for the I/O
  'i':
    alias : 'log-io-level',
    describe: 'Specify the log level for the I/O'
#  `-f`, `--log-file-level`: Specify the log level for the log file
  'f':
    alias : 'log-file-level',
    describe: 'Specify the log level for the log file'
#  `-p`, `--log-file-path`: Specify the path to the log file within the "logs" folder
  'p':
    alias : 'log-file-path',
    describe: 'Specify the path to the log file within the "logs" folder'
#  `-n`, `--nolog`: Set this if no output shall be generated
  'n':
    alias : 'nolog',
    describe: 'Set this if no output shall be generated'

# now fetch the CLI arguments and exit if the help has been called.
argv = optimist.usage( usage ).options( opt ).argv
if argv.help
  console.log optimist.help()
  process.exit()

###
This function is invoked right after the module is loaded and starts the server.

@private init()
###
init = =>
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
  @log = logger.getLogger logconf
  @log.info 'RS | STARTING SERVER'

  args =
    logger: @log
    logconf: logconf
  # > Fetch the `http-port` argument
  args[ 'http-port' ] = parseInt argv.w || conf.getHttpPort()
  args[ 'db-port' ] = parseInt argv.d || conf.getDbPort()
  
  @log.info 'RS | Initialzing DB'
  db args
  # > We only proceed with the initialization if the DB is ready
  db.isConnected ( err ) =>
    if err
      @log.error 'RS | No DB connection, shutting down system!'
      shutDown()

    else
      # > Initialize all required modules with the args object.
      @log.info 'RS | Initialzing engine'
      engine args
      @log.info 'RS | Initialzing http listener'
      # We give the HTTP listener the ability to shutdown the whole system
      http.addShutdownHandler shutDown
      http args
      
      # > Distribute handlers between modules to link the application.
      @log.info 'RS | Passing handlers to engine'
      engine.addPersistence db
      @log.info 'RS | Passing handlers to http listener'
      #TODO engine pushEvent needs to go into redis queue
      #TODO loadAction and addRule will be removed
      #mm.addHandlers db, engine.loadActionModule, engine.addRule
      @log.info 'RS | Forking child process for the event poller'
      cliArgs = [
        args.logconf['mode']
        args.logconf['io-level']
        args.logconf['file-level']
        args.logconf['file-path']
        args.logconf['nolog']
      ]
      poller = cp.fork path.resolve( __dirname, 'event-poller' ), cliArgs

###
Shuts down the server.

@private shutDown()
### 
shutDown = =>
  @log.warn 'RS | Received shut down command!'
  engine?.shutDown()
  # We need to force stop express (in http-listener module)
  process.exit()

###
## Process Commands

When the server is run as a child process, this function handles messages
from the parent process (e.g. the testing suite)
###
process.on 'message', ( cmd ) -> procCmds[cmd]?()

process.on 'SIGINT', shutDown
process.on 'SIGTERM', shutDown

# The die command redirects to the shutDown function.
procCmds.die = shutDown

# *Start initialization*
init()
