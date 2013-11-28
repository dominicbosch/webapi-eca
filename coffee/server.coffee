###

Rules Server
============

>This is the main module that is used to run the whole server:
>
>     node server [log_type http_port]
>
>Valid `log_type`'s are:
>
>- `0`: standard I/O output (default)
>- `1`: log file (server.log)
>- `2`: silent
>
>`http_port` can be set to use another port, than defined in the 
>[config](config.html) file, to listen to, e.g. used by the test suite.
>
>

###

# **Requires:**

# - [Logging](logging.html)
log = require './logging'

# - [Configuration](config.html)
conf = require './config'

# - [DB Interface](db_interface.html)
db = require './db_interface'

# - [Engine](engine.html)
engine = require './engine'

# - [HTTP Listener](http_listener.html)
http_listener = require './http_listener'

args = {}
procCmds = {}


###
Error handling of the express port listener requires special attention,
thus we have to catch the process error, which is issued if
the port is already in use.
###
process.on 'uncaughtException', ( err ) ->
  switch err.errno
    when 'EADDRINUSE'
      err.addInfo = 'http_port already in use, shutting down!'
      log.error 'RS', err
      shutDown()
    else throw err
###
This function is invoked right after the module is loaded and starts the server.

@private init()
###
init = ->
  log.print 'RS', 'STARTING SERVER'
  
  # > Check whether the config file is ready, which is required to start the server.
  if !conf.isReady()
    log.error 'RS', 'Config file not ready!'
    process.exit()
    
  # > Fetch the `log_type` argument and post a log about which log type is used.
  if process.argv.length > 2
    args.logType = parseInt(process.argv[2]) || 0
    switch args.logType
      when 0 then log.print 'RS', 'Log type set to standard I/O output'
      when 1 then log.print 'RS', 'Log type set to file output'
      when 2 then log.print 'RS', 'Log type set to silent'
      else log.print 'RS', 'Unknown log type, using standard I/O'
    log args
  else
    log.print 'RS', 'No log method argument provided, using standard I/O'
    
  # > Fetch the `http_port` argument
  if process.argv.length > 3 then args.http_port = parseInt process.argv[3]
  else log.print 'RS', 'No HTTP port passed, using standard port from config file'
  
  log.print 'RS', 'Initialzing DB'
  db args
  # > We only proceed with the initialization if the DB is ready
  db.isConnected ( err, result ) ->
    if !err
    
      # > Initialize all required modules with the args object.
      log.print 'RS', 'Initialzing engine'
      engine args
      log.print 'RS', 'Initialzing http listener'
      http_listener args
      
      # > Distribute handlers between modules to link the application.
      log.print 'RS', 'Passing handlers to engine'
      engine.addDBLinkAndLoadActionsAndRules db
      log.print 'RS', 'Passing handlers to http listener'
      #TODO engine pushEvent needs to go into redis queue
      http_listener.addHandlers shutDown
      #log.print 'RS', 'Passing handlers to module manager'
      #TODO loadAction and addRule will be removed
      #mm.addHandlers db, engine.loadActionModule, engine.addRule

###
Shuts down the server.

@private shutDown()
### 
shutDown = ->
  log.print 'RS', 'Received shut down command!'
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
