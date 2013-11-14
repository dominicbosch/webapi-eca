// # Event Poller

'use strict';

var log, db, ml;
function init() {
  log = require('./logging');
  if(process.argv.length > 2) log(parseInt(process.argv[2]) || 0);
  
  ml = require('./module_loader').init({ log: log }),
  db = require('./db_interface').init({ log: log }, doneInitDB);
  
  if(typeof cb === 'function') cb();
};

var fs = require('fs'),
  path = require('path'),
  listMessageActions = {},
  listAdminCommands = {},
  listEventModules = {},
  listPoll = {},  //TODO this will change in the future because it could have
                  //several parameterized (user-specific) instances of each event module 
  isRunning = true,
  eId = 0;
//TODO allow different polling intervals (a wrapper together with settimeout per to be polled could be an easy and solution)

function doneInitDB(err) {
  if(!err) {
      
  //TODO eventpoller will not load event modules from filesystem, this will be done by
  // the moduel manager and the eventpoller receives messages about new/updated active rules 
  
    db.getEventModules(function(err, obj) {
      if(err) log.error('EP', 'retrieving Event Modules from DB!');
      else {
        if(!obj) {
          log.print('EP', 'No Event Modules found in DB!');
          process.send({ event: 'ep_finished_loading' });
        } else {
          var m, semaphore = 0;
          for(var el in obj) {
            semaphore++;
            m = ml.requireFromString(obj[el], el);
            db.getEventModuleAuth(el, function(mod) {
              return function(err, obj) {
                if(--semaphore === 0) process.send({ event: 'ep_finished_loading' });
                if(obj && mod.loadCredentials) mod.loadCredentials(JSON.parse(obj));
              };
            }(m));
            log.print('EP', 'Loading Event Module: ' + el);
            listEventModules[el] = m;
          }
        }
        initAdminCommands();
        initMessageActions();
      }
    });
  } else {
    err.addInfo = 'eventpoller init failed';
    log.error('EP', err);
  }
}

function initMessageActions() {
  listMessageActions['event'] = function(args) {
    var prop = args[1], arrModule = prop.split('->');
    // var arrModule = obj.module.split('->');
    if(arrModule.length > 1){
      var module = listEventModules[arrModule[0]];
      for(var i = 1; i < arrModule.length; i++) {
        if(module) module = module[arrModule[i]];
      }
      if(module) {
        log.print('EP', 'Found active event module "' + prop + '", adding it to polling list');
        //FIXME change this to [module][prop] = module; because like this identical properties get overwritten
        // also add some on a per user basis information because this should go into a user context for the users
        // that sat up this rule!
        listPoll[prop] = module;
      } else {
        log.print('EP', 'No property "' + prop + '" found');
      }
    }
  };
  
  //TODO this goes into module_manager, this will receive notification about
  // new loaded/stored event modules and fetch them from the db
  listMessageActions['cmd'] = function(args) {
    var func = listAdminCommands[args[1]];
    if(typeof(func) === 'function') func(args);
  };
  
  process.on('message', function(strProps) {
    var arrProps = strProps.split('|');
    if(arrProps.length < 2) log.error('EP', 'too few parameter in message!');
    else {
      var func = listMessageActions[arrProps[0]];
      if(func) func(arrProps);
    }
  });
}

function initAdminCommands() {
  listAdminCommands['loadevent'] = function(args) {
    ml.loadModule('mod_events', args[2], loadEventCallback);
  };
  listAdminCommands['loadevents'] = function(args) {
    ml.loadModules('mod_events', loadEventCallback);
  };
  listAdminCommands['shutdown'] = function(args) {
    log.print('EP', 'Shutting down DB Link');
    isRunning = false;
    db.shutDown();
  };
}

function loadEventCallback(name, data, mod, auth) {
  db.storeEventModule(name, data); // store module in db
  if(auth) db.storeEventModuleAuth(name, auth);
  listEventModules[name] = mod; // store compiled module for polling
}

function checkRemotes() {
  for(var prop in listPoll) {
    try {
      listPoll[prop](
      /*
       * define and immediately call anonymous function with param prop.
       * This places the value of prop into the context of the callback
       * and thus doesn't change when the for loop keeps iterating over listPoll
       */
        (function(p) {
          return function(err, obj) {
            if(err) {
              err.additionalInfo = 'module: ' + p;
              log.error('EP', err);
            } else {
              process.send({
                event: p,
                eventid: 'polled_' + eId++,
                data: obj
              });
            }
          };
        })(prop)
      );
    } catch (e) {
      log.error('EP', e);
    }
  }
}

function pollLoop() {
  if(isRunning) {
    checkRemotes();
    setTimeout(pollLoop, 10000);
  }
}

exports.die = function(cb) {
  if(typeof cb === 'function') cb();
};
 
 
init();
pollLoop();