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

var http_listener = require('./http_listener'),
  db = require('./db_interface'),
  engine = require('./engine'),
  mm = require('./module_manager'),
  log = require('./logging'),
  fs = require('fs'),
  path = require('path'),
  procCmds = {
    'die': function() { shutDown(); }
  },
  objCmds = {
    'loadrules': mm.loadRulesFile,
    'loadaction': mm.loadActionModule,
    'loadactions':  mm.loadActionModules,
    'loadevent': engine.loadEventModule,
    'loadevents': engine.loadEventModules,
    'shutdown': shutDown,
    'restart': null   //TODO implement
  };

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


log.print('RS', 'STARTING SERVER');
log.print('RS', 'Initialzing DB');
//FIXME initialization of all modules should depend on one after the other
// in a transaction style manner 
db.init(function(err) {
  if(!err) {
    engine.init(db);
    log.print('RS', 'Initialzing http listener');
    //FIXME http_port shouldn't be passed here we can load it inside the listener via the new config.js module 
    http_listener.init(null/*config.http_port*/, handleAdminCommands, engine.pushEvent);
    log.print('RS', 'Initialzing module manager');
    mm.init(db, engine.loadActionModule, engine.loadRule);
  }
  else {
    err.addInfo = err.message; 
    err.message = 'Not Starting engine!';
    log.error(err);
  }
});
