// # Event Poller

'use strict';

var fs = require('fs'),
    path = require('path'),
    log = require('./logging'),
    listMessageActions = {},
    listAdminCommands = {},
    listEventModules = {},
    listPoll = {},  //TODO this will change in the future because it could have
                    //several parameterized (user-specific) instances of each event module 
    isRunning = true,
    eId = 0,
    db, ml;

//TODO allow different polling intervals (a wrapper together with settimeout per to be polled could be an easy and solution)


function init() {
  if(process.argv.length > 2) log({ logType: parseInt(process.argv[2]) || 0 });
  var args = { logType: log.getLogType() };
  ml = require('./module_loader')(args);
  db = require('./db_interface')(args);
  initAdminCommands();
  initMessageActions();
  pollLoop();
};


function loadEventModule(el, cb) {
  if(db && ml) db.getEventModule(el, function(err, obj) {
    if(err || !obj) {
      if(typeof cb === 'function') cb(new Error('Retrieving Event Module ' + el + ' from DB: ' + err));
      else log.error('EP', 'Retrieving Event Module ' + el + ' from DB!');
    }
    else {
      // log.print('EP', 'Loading Event Module: ' + el);
      var m = ml.requireFromString(obj, el);
      db.getEventModuleAuth(el, function(mod) {
        return function(err, objA) {
          //TODO authentication needs to be done differently
          if(objA && mod.loadCredentials) mod.loadCredentials(JSON.parse(objA));
        };
      }(m));
      listEventModules[el] = m;
      if(typeof cb === 'function') cb(null, m);
    }
  });
}

function fetchPollFunctionFromModule(mod, func) {
  for(var i = 1; i < func.length; i++) {
    if(mod) mod = mod[func[i]];
  }
  if(mod) {
    log.print('EP', 'Found active event module "' + func.join('->') + '", adding it to polling list');
    //FIXME change this to [module][prop] = module; because like this identical properties get overwritten
    // also add some on a per user basis information because this should go into a user context for the users
    // that sat up this rule!
    listPoll[func.join('->')] = mod;
  } else {
    log.print('EP', 'No property "' + func.join('->') + '" found');
  }
}

function initMessageActions() {
  listMessageActions['event'] = function(args) {
    var prop = args[1], arrModule = prop.split('->');
    if(arrModule.length > 1){
      if(listEventModules[arrModule[0]]) {
        fetchPollFunctionFromModule(listEventModules[arrModule[0]], arrModule);
      } else {
        log.print('EP', 'Event Module ' + arrModule[0] + ' needs to be loaded, doing it now...');
        loadEventModule(arrModule[0], function(err, obj) {
          if(err || !obj) log.error('EP', 'Event Module "' + arrModule[0] + '" not found: ' + err);
          else {
            log.print('EP', 'Event Module ' + arrModule[0] + ' found and loaded');
            fetchPollFunctionFromModule(obj, arrModule);
          }
        });
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
  listAdminCommands['shutdown'] = function(args) {
    log.print('EP', 'Shutting down DB Link');
    isRunning = false;
    if(db) db.shutDown();
  };
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
                payload: obj
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
 
init();