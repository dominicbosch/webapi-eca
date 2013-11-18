/** @module rules_server */
'use strict';
/*
A First Level Header
====================

A Second Level Header
---------------------

Now is the time for all good men to come to
the aid of their country. This is just a
regular paragraph.

The quick brown fox jumped over the lazy
dog's back.

### Header 3

> This is a blockquote.
> 
> This is the second paragraph in the blockquote.
>
> ## This is an H2 in a blockquote
*/

//FIXME server should be started via command line arguments http_port and logging level to allow proper testing
var fs = require('fs'),
    path = require('path'),
    log = require('./logging'),
    procCmds = {
      'die': function() { shutDown(); }
    },
    semaphore = 0,
    args = {},
    http_listener, mm, db, engine, objCmds;

function init() {
  log.print('RS', 'STARTING SERVER');
  
  if(process.argv.length > 2) {
    args.logType = parseInt(process.argv[2]) || 0 ;
    log(args);
  } else log.print('RS', 'No log method passed, using stdI/O');
  
  if(process.argv.length > 3) args.http_port = parseInt(process.argv[3]);
  else log.print('RS', 'No HTTP port passed, using standard port from config file');
  
  engine = require('./engine')(args);
  http_listener = require('./http_listener')(args);
  mm = require('./module_manager')(args);
  log.print('RS', 'Initialzing DB');
  db = require('./db_interface')(args);
  objCmds = {
    'loadrules': mm.loadRulesFromFS,
    'loadaction': mm.loadActionModuleFromFS,
    'loadactions':  mm.loadActionModulesFromFS,
    'loadevent': mm.loadEventModuleFromFS,
    'loadevents': mm.loadEventModulesFromFS,
    'shutdown': shutDown
  };
  log.print('RS', 'Initialzing engine');
  engine.addDBLinkAndLoadActionsAndRules(db);
  log.print('RS', 'Initialzing http listener');
  http_listener.addHandlers(handleAdminCommands, engine.pushEvent);
  log.print('RS', 'Initialzing module manager');
  mm.addHandlers(db, engine.loadActionModule, engine.addRule);
  //FIXME load actions and events, then rules, do this here, visible for everybody on the first glance
  //TODO for such events we should forge the architecture more into an event driven one
}


function handleAdminCommands(args, answHandler) {
  if(args && args.cmd) {
    var func = objCmds[args.cmd];
    if(func) func(args, answHandler);
  } else log.print('RS', 'No command in request');
  setTimeout(function(ah) {
  	answHandler = ah;
  	return function() {
  		if(!answHandler.isAnswered()) answHandler.answerError('Not handeled...');
  	};
  }, 2000);
}

function shutDown(args, answHandler) {
  if(answHandler) answHandler.answerSuccess('Goodbye!');
  log.print('RS', 'Received shut down command!');
  if(engine && typeof engine.shutDown === 'function') engine.shutDown();
  else { 
    console.error(typeof engine.shutDown);
    console.error('no function!');
  }
  if(http_listener) http_listener.shutDown();
}

// Send message
process.on('message', function(cmd) {
  if(typeof procCmds[cmd] === 'function') procCmds[cmd]();
  else console.error('err with command');
});

//FIXME initialization of all modules should depend on one after the other
// in a transaction style manner 

/*
 * FIXME
 * - new consequent error and callback handling starts to manifest in the code,
 *    still a lot of work required!
 * - unit testing seems a bit more complex because of the dependencies, this
 *    has to be started before solving above point because it will give hints to
 *    better loose coupling
 */

/*
 * FIXME ALL MODULES NEED TO FOLLOW CONVENTION TO ALLOW PROPER MODULE HANDLING:
 *  - init(args, cb)
 *  - die()
 */

init();
