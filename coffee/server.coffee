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
>---

###

'use strict'
### Grab all required modules ###
path = require 'path'
log = require './logging'
conf = require './config'
db = require './db_interface'
engine = require './engine'
http_listener = require './http_listener'
mm = require './module_manager'
args = {}
procCmds = {}

### Prepare the admin commands that are issued via HTTP requests. ###
adminCmds = 
  'loadrules': mm.loadRulesFromFS,
  'loadaction': mm.loadActionModuleFromFS,
  'loadactions':  mm.loadActionModulesFromFS,
  'loadevent': mm.loadEventModuleFromFS,
  'loadevents': mm.loadEventModulesFromFS,
  'loadusers': http_listener.loadUsers,
  'shutdown': shutDown


###
Error handling of the express port listener requires special attention,
thus we have to catch the process error, which is issued if
the port is already in use.
###
process.on 'uncaughtException', (err) ->
  switch err.errno
    when 'EADDRINUSE'
      err.addInfo = 'http_port already in use, shutting down!'
      log.error 'RS', err
      shutDown()
    else log.error err
  null

###
This function is invoked right after the module is loaded and starts the server.

@private init()
###

init = ->
  log.print 'RS', 'STARTING SERVER'
  
  ### Check whether the config file is ready, which is required to start the server. ###
  if !conf.isReady()
    log.error 'RS', 'Config file not ready!'
    process.exit()
    
  ### Fetch the `log_type` argument and post a log about which log type is used.###
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
    
  ### Fetch the `http_port` argument ###
  if process.argv.length > 3 then args.http_port = parseInt process.argv[3]
  else log.print 'RS', 'No HTTP port passed, using standard port from config file'
  
  db args
  ### We only proceed with the initialization if the DB is ready ###
  db.isConnected (err, result) ->
    if !err
    
      ### Initialize all required modules with the args object.###
      log.print 'RS', 'Initialzing engine'
      engine args
      log.print 'RS', 'Initialzing http listener'
      http_listener args
      log.print 'RS', 'Initialzing module manager'
      mm args
      log.print 'RS', 'Initialzing DB'
      
      ### Distribute handlers between modules to link the application. ###
      log.print 'RS', 'Passing handlers to engine'
      engine.addDBLinkAndLoadActionsAndRules db
      log.print 'RS', 'Passing handlers to http listener'
      http_listener.addHandlers db, fAdminCommands, engine.pushEvent
      log.print 'RS', 'Passing handlers to module manager'
      mm.addHandlers db, engine.loadActionModule, engine.addRule
  
###
admin commands handler receives all command arguments and an answerHandler
object that eases response handling to the HTTP request issuer.

@private fAdminCommands( *args, answHandler* )
###
fAdminCommands = (args, answHandler) ->
  if args and args.cmd 
    adminCmds[args.cmd]? args, answHandler
  else
    log.print 'RS', 'No command in request'
    
  ###
  The fAnsw function receives an answerHandler object as an argument when called
  and returns an anonymous function
  ###
  fAnsw = (ah) ->
    ###
    The anonymous function checks whether the answerHandler was already used to
    issue an answer, if no answer was provided we answer with an error message
    ###
    () ->
      if not ah.isAnswered()
        ah.answerError 'Not handled...'
        
  ###
  Delayed function call of the anonymous function that checks the answer handler
  ###
  setTimeout fAnsw(answHandler), 2000

###
Shuts down the server.

@private shutDown( *args, answHandler* )
@param {Object} args
@param {Object} answHandler
### 
shutDown = (args, answHandler) ->
  answHandler?.answerSuccess 'Goodbye!'
  log.print 'RS', 'Received shut down command!'
  engine?.shutDown()
  http_listener?.shutDown()

###
## Process Commands

When the server is run as a child process, this function handles messages
from the parent process (e.g. the testing suite)
###

process.on 'message', (cmd) -> procCmds[cmd]?()

###
The die command redirects to the shutDown function.
###

procCmds.die = shutDown

###
*Start initialization*
###

init()
