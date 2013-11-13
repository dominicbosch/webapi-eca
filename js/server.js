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
	answHandler.answerSuccess('Goodbye!');
  log.print('RS', 'Received shut down command!');
  engine.shutDown();
  http_listener.shutDown();
}

fs.readFile(path.resolve(__dirname, '..', 'config', 'config.json'), 'utf8', function (err, data) {
  if (err) {
    console.log(err);
    log.error('RS', 'Loading config file');
    return;
  }
  var config = JSON.parse(data);
  if(!config.http_port || !config.db_port || !config.crypto_key) {
    log.error('RS', 'you forgot to define either http_port, db_port, crypto_key, or even all of them!');
  } else {
    log.print('RS', 'Initialzing DB');
    db.init(config.db_port, config.crypto_key, function() {
      engine.init(db, config.db_port, config.crypto_key);
    });
    log.print('RS', 'Initialzing http listener');
    http_listener.init(config.http_port, handleAdminCommands, engine.pushEvent);
    log.print('RS', 'Initialzing module manager');
    mm.init(db, engine.loadActionModule, engine.loadRule);
  }
});