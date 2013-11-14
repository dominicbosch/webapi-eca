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
var log = require('./logging'), http_port;
log.print('RS', 'STARTING SERVER');
if(process.argv.length > 2) log(process.argv[2]);
else log.print('RS', 'No log method passed, using stdI/O');
if(process.argv.length > 3) http_port = parseInt(process.argv[3]);
else log.print('RS', 'No HTTP port passed, using standard port from config file');

var fs = require('fs'),
  path = require('path'),
  procCmds = {
    'die': function() { shutDown(); }
  };
  
function handleModuleLoad(cb, msg) {
  return function(err) {
    if(!err) {
      if(typeof cb === 'function') cb();
      log.print('RS', msg + ' initialized successfully');
    } else {
      err.addInfo = msg + ' init failed';
      log.error('RS', err);
    } 
  };
}

function loadHL() {
  http_listener = require('./http_listener').init(log,
    handleModuleLoad(loadEN, 'http listener')
  );
}

function loadEN(cb) {
  engine = require('./engine').init(log,
    handleModuleLoad(loadMM, 'engine')
  );
}

function loadMM(cb) {
  mm = require('./module_manager').init(log,
    handleModuleLoad(loadDB, 'module manager')
  );
}

function loadDB(cb) {
  db = require('./db_interface').init(log,
    handleModuleLoad(doneInitDB, 'db interface init failed')
  );
}

function doneInitDB(err) {
  if(!err) {
    objCmds = {
      'loadrules': mm.loadRulesFile,
      'loadaction': mm.loadActionModule,
      'loadactions':  mm.loadActionModules,
      'loadevent': engine.loadEventModule,
      'loadevents': engine.loadEventModules,
      'shutdown': shutDown
    };
    //FIXME engine requires db to be finished with init...
    engine.addDBLink(db);
    log.print('RS', 'Initialzing http listener');
    http_listener.addHandlers(handleAdminCommands, engine.pushEvent);
    log.print('RS', 'Initialzing module manager');
    mm.addHandlers(db, engine.loadActionModule, engine.loadRule);
  }
  else {
    err.addInfo = err.message; 
    err.message = 'Not Starting engine!';
    log.error(err);
  }
}

(function() {
  loadHL();
  // engine = require('./engine').init(log),
  // mm = require('./module_manager').init(log),
  // db = require('./db_interface').init(log, doneInitDB), //TODO have a close lok at this special case
})();

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


log.print('RS', 'Initialzing DB');
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
