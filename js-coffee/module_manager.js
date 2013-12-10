/*
# Module Manager
> The module manager takes care of the module and rules loading in the initialization
> phase and on user request.

> Event and Action modules are loaded as strings and stored in the database,
> then compiled into node modules and rules
 */

'use strict';

var fs = require('fs'),
    path = require('path'),
    log = require('./logging'),
    ml, db, funcLoadAction, funcLoadRule;

exports = module.exports = function(args) {
  args = args || {};
  log(args);
  ml = require('./module_loader')(args);
  return module.exports;
};

exports.addDBLink = function(db_link) {
  db = db_link;
};

exports.storeEventModule = function (objUser, obj, answHandler) {
  try {
    // TODO in the future we might want to link the modules close to the user
    // and allow for e.g. private modules
    // we need a child process to run this code and kill it after invocation
    var m = ml.requireFromString(obj.data, obj.id);
    obj.methods = Object.keys(m);
    answHandler.answerSuccess('Thank you for the event module!');
    db.storeEventModule(obj.id, obj);
  } catch (err) {
    answHandler.answerError(err.message);
    console.error(err);
  }
};

exports.getAllEventModules = function ( objUser, obj, answHandler ) {
  db.getEventModules(function(err, obj) {
    if(err) answHandler.answerError('Failed fetching event modules: ' + err.message);
    else answHandler.answerSuccess(obj);
  });
};

exports.storeActionModule = function (objUser, obj, answHandler) {
  var m = ml.requireFromString(obj.data, obj.id);
  obj.methods = Object.keys(m);
  answHandler.answerSuccess('Thank you for the action module!');
  db.storeActionModule(obj.id, obj);
};

exports.getAllActionModules = function ( objUser, obj, answHandler ) {
  db.getActionModules(function(err, obj) {
    if(err) answHandler.answerError('Failed fetching action modules: ' + err.message);
    else answHandler.answerSuccess(obj);
  });
};

exports.storeRule = function (objUser, obj, answHandler) {
  var cbEventModule = function (lst) {
    return function(err, data) {
      if(err) {
        err.addInfo = 'fetching event module';
        log.error('MM', err);
      }
      if(!err && data) {
        if(data.params) {
          lst.eventmodule = data.params;
        }
      }
      if(--semaphore === 0) answHandler.answerSuccess(lst);
    };
  };
  var cbActionModule = function (lstParams) {
    return function(err, data) {
      if(err) {
        err.addInfo = 'fetching action module';
        log.error('MM', err);
      }
      if(!err && data) {
        if(data.params) {
          lstParams.actionmodules[data.id] = data.params;
        }
      }
      if(--semaphore === 0) answHandler.answerSuccess(lstParams);
    };
  };
  
  var semaphore = 1;
  var lst = {
    eventmodule: null,
    actionmodules: {}
  };
  try {
    var objRule = JSON.parse(obj.data);
    for(var i = 0; i < objRule.actions.length; i++) {
      semaphore++;
      db.getActionModule(objRule.actions[i].module.split('->')[0], cbActionModule(lst));
    }
    db.getEventModule(objRule.event.split('->')[0], cbEventModule(lst));
    db.storeRule(objRule.id, objUser.username, obj.data);
  } catch(err) {
    answHandler.answerError(err.message);
    log.error('MM', err);
  }

};

// FIXME REMOVE
/*
 * Legacy file system loaders
 */


/*
 * Load Rules from fs
 * ------------------
 */
exports.loadRulesFromFS = function(args, answHandler) {
  if(!args) args = {};
  if(!args.name) args.name = 'rules';
  if(!funcLoadRule) log.error('ML', 'no rule loader function available');
  else {
    fs.readFile(path.resolve(__dirname, '..', 'rules', args.name + '.json'), 'utf8', function (err, data) {
      if (err) {
        log.error('ML', 'Loading rules file: ' + args.name + '.json');
        return;
      }
      try {
        var arr = JSON.parse(data), txt = '';
        log.print('ML', 'Loading ' + arr.length + ' rules:');
        for(var i = 0; i < arr.length; i++) {
          txt += arr[i].id + ', ';
          db.storeRule(arr[i].id, 'james-t', JSON.stringify(arr[i]));
          // funcLoadRule(arr[i]);
        }
        answHandler.answerSuccess('Yep, loaded rules: ' + txt);
      } catch (e) {
        log.error('ML', 'rules file was corrupt! (' + args.name + '.json)');
      }
    });
  }
};

/*
 * Load Action Modules from fs
 * ---------------------------
 */

/**
 * 
 * @param {Object} name
 * @param {Object} data
 * @param {Object} mod
 * @param {String} [auth] The string representation of the auth json
 */
function loadActionCallback(name, data, mod, auth) {
  db.storeActionModule(name, data); // store module in db
  // funcLoadAction(name, mod); // hand back compiled module
  if(auth) db.storeActionModuleAuth(name, auth);
}

exports.loadActionModuleFromFS = function (args, answHandler) {
  if(ml) {
    if(args && args.name) {
  		answHandler.answerSuccess('Loading action module ' + args.name + '...');
      ml.loadModule('mod_actions', args.name, loadActionCallback);
    } else log.error('MM', 'Action Module name not provided!');
  }
};

exports.loadActionModulesFromFS = function(args, answHandler) {
  if(ml) {
  	answHandler.answerSuccess('Loading action modules...');
    ml.loadModules('mod_actions', loadActionCallback);
  }
};

/*
 * Load Event Modules from fs
 * --------------------------
 */

function loadEventCallback(name, data, mod, auth) {
  if(db) {
    db.storeEventModule(name, data); // store module in db
    if(auth) db.storeEventModuleAuth(name, auth);
  }
}

exports.loadEventModuleFromFS = function(args, answHandler) {
  if(ml) {
    if(args && args.name) {
      answHandler.answerSuccess('Loading event module ' + args.name + '...');
      ml.loadModule('mod_events', args.name, loadEventCallback);
    } else log.error('MM', 'Event Module name not provided!');
  }
};

exports.loadEventModulesFromFS = function(args, answHandler) {
  answHandler.answerSuccess('Loading event moules...');
    ml.loadModules('mod_actions', loadEventCallback);
};

