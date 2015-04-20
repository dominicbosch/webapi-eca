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
log = require './logging'

# - [Configuration](config.html)
conf = require './config'

# - [Persistence](persistence.html)
db = require './persistence'

# - [ECA Components Manager](components-manager.html)
cm = require './components-manager'

# - [Engine](engine.html)
engine = require './engine'

# - [HTTP Listener](http-listener.html)
http = require './http-listener'

# - [Encryption](encryption.html)
encryption = require './encryption'

# - [Trigger Poller](trigger-poller.html) *(will be forked into a child process)*
nameEP = 'trigger-poller'

# - Node.js Modules: [fs](http://nodejs.org/api/fs.html),
# [path](http://nodejs.org/api/path.html)
# and [child_process](http://nodejs.org/api/child_process.html)
fs = require 'fs'
path = require 'path'
cp = require 'child_process'
# heapdump = require 'heapdump'

# - External Modules: [optimist](https://github.com/substack/node-optimist)
optimist = require 'optimist'

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

#  `-s`, `--db-select`: Specify a database
	's':
		alias : 'db-select',
		describe: 'Specify a database identifier'

#  `-m`, `--mode`: Specify a run mode: [development|productive]
	'm':
		alias : 'mode',
		describe: 'Specify a run mode: [development|productive]'

#  `-i`, `--log-std-level`: Specify the log level for the I/O. in development expensive origin
#                           lookups are made and added to the log entries
	'i':
		alias : 'log-std-level',
		describe: 'Specify the log level for the standard I/O'

#  `-f`, `--log-file-level`: Specify the log level for the log file
	'f':
		alias : 'log-file-level',
		describe: 'Specify the log level for the log file'

#  `-p`, `--log-file-path`: Specify the path to the log file within the "logs" folder
	'p':
		alias : 'log-file-path',
		describe: 'Specify the path to the log file within the "logs" folder'

#  `-t`, `--log-trace`: Whether full tracing should be enabled, don't use in productive mode
	't':
		alias : 'log-trace',
		describe: 'Whether full tracing should be enabled [on|off]. do not use in productive mode.'

#  `-n`, `--nolog`: Set this true if no output shall be generated
	'n':
		alias : 'nolog',
		describe: 'Set this if no output shall be generated'

# now fetch the CLI arguments and exit if the help has been called.
argv = optimist.usage( usage ).options( opt ).argv
if argv.help
	console.log optimist.help()
	process.exit()

# Let's read and initialize the configuration so we are ready to do what we are supposed to do!
conf.init argv.c
# > Check whether the config file is ready, which is required to start the server.
if !conf.isInit
	console.error 'FAIL: Config file not ready! Shutting down...'
	process.exit()

conf[ 'http-port' ] = parseInt argv.w || conf[ 'http-port' ] || 8125
conf[ 'db-port' ] = parseInt argv.d || conf[ 'db-port' ] || 6379
conf[ 'db-select' ] = parseInt argv.s || conf[ 'db-select' ] || 0

if not conf.log
	conf.log = {}
conf.mode = argv.m || conf.mode || 'productive'
conf.log[ 'std-level' ] = argv.i || conf.log[ 'std-level' ] || 'error'
conf.log[ 'file-level' ] = argv.f || conf.log[ 'file-level' ] || 'warn'
conf.log[ 'file-path' ] = argv.p || conf.log[ 'file-path' ] || 'warn'
conf.log.trace = argv.t || conf.log.trace || 'off'
conf.log.nolog = argv.n || conf.log.nolog
if not conf.log.nolog
	try
		fs.writeFileSync path.resolve( conf.log[ 'file-path' ] ), ' '
	catch e
		console.log e

# Initialize the logger
log.init conf
log.info 'RS | STARTING SERVER'

###
This function is invoked right after the module is loaded and starts the server.

@private init()
###
init = =>
	encryption.init conf[ 'keygenpp' ]
	
	log.info 'RS | Initialzing DB'
	db.init conf[ 'db-port' ]
	# > We only proceed with the initialization if the DB is ready
	db.isConnected ( err ) =>
		db.selectDatabase conf[ 'db-select' ]
		if err
			log.error 'RS | No DB connection, shutting down system!'
			shutDown()

		else
			# > Initialize all required modules with the args object.
			log.info 'RS | Initialzing engine'
			#TODO We could in the future make the engine a child process as well
			engine.init()

			# Start the trigger poller. The components manager will emit events for it
			log.info 'RS | Forking a child process for the trigger poller'
			# Grab all required log config fields
			
			# Initialize the trigger poller with the required CLI arguments
			poller = cp.fork path.resolve( __dirname, nameEP )
			poller.send
				intevent: 'startup'
				data: conf
			fs.unlink 'proc.pid', ( err ) ->
				if err
					console.log err
				fs.writeFile 'proc.pid', 'PROCESS PID: ' + process.pid + '\nCHILD PID: ' + poller.pid + '\n'


			# after the engine and the trigger poller have been initialized we can
			# initialize the module manager and register event listener functions
			# from engine and trigger poller
			log.info 'RS | Initialzing module manager'
			cm.addRuleListener engine.internalEvent
			cm.addRuleListener ( evt ) -> poller.send evt

			log.info 'RS | Initialzing http listener'			
			http.init conf

###
Shuts down the server.

@private shutDown()
### 
shutDown = () =>
	log.warn 'RS | Received shut down command!'
	db?.shutDown()
	engine.shutDown()
	# heapdump.writeSnapshot path.resolve( __dirname, '..', '..', 'logs', Date.now() + '.heapsnapshot' ), ( err, fn ) ->
		# if err
		# 	log.warn 'RS | HEAPDUMP written to ' + fn
		# else
		# 	log.error 'RS | HEAPDUMP failed'

	# We need to call process.exit() since the express server in the http-listener
	# can't be stopped gracefully. Why would you stop this system anyways!?? 
	process.exit()

###
## Process Commands

When the server is run as a child process, this function handles messages
from the parent process (e.g. the testing suite)
###
process.on 'message', ( cmd ) ->
	# The die command redirects to the shutDown function.
	if cmd is 'die'
		log.warn 'RS | GOT DIE COMMAND'
		shutDown()

process.on 'SIGINT', () ->
	log.warn 'RS | GOT SIGINT'
	shutDown()

process.on 'SIGTERM', () ->
	log.warn 'RS | GOT SIGTERM'
	shutDown()
	
# *Start initialization*
init()
