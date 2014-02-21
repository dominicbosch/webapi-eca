/*
# Module Manager
> The module manager takes care of the module and rules loading in the initialization
> phase and on user request.

> Event and Action modules are loaded as strings and stored in the database,
> then compiled into node modules and rules
 */


// # **Loads Modules:**

// # - [Persistence](persistence.html)
var fs = require('fs'),
    path = require('path'),
    db = require('./persistence'),
    events = require('events'),
    log, ee,
    eventHandlers = [],
    funcLoadAction, funcLoadRule;

exports = module.exports = function(args) {
  args = args || {};
  ee = new events.EventEmitter();
  log = args.logger;
  db(args);
  return module.exports;
};

exports.addListener = function( evt, eh ) {
  ee.addListener( evt, eh );
  //TODO as soon as an event handler is added it needs to receive the full list of existing and activated rules
}

exports.processRequest = function( user, obj, cb ) {
  console.log('module manager needs to process request: ');
  console.log(obj.command);
  var answ = {
    test: 'object',
    should: 'work'
  }
  cb(null, answ);
}

exports.requireFromString = function(src, name, dir) {
  if(!dir) dir = __dirname;
  var id = path.resolve(dir, name, name + '.vm');
  var vm = require('vm'),
    // FIXME not log but debug module is required to provide information to the user
    sandbox = {
      id: id, // use this to gather kill info
      needle: require('needle'), //https://github.com/tomas/needle
      log: log,
      exports: {}
    };
  //TODO child_process to run module!
  // Define max runtime per loop as 10 seconds, after that the child will be killed
  // it can still be active after that if there was a timing function or a callback used...
  // kill the child each time? how to determine whether there's still a token in the module?
  try {
    var mod = vm.runInNewContext(src, sandbox, id);
    
  } catch (err) {
    log.error('ML', 'Error running module in sandbox: ' + err.message);
  }
  return sandbox.exports;
};

exports.loadModule = function(directory, name, callback) {
  try {
    fs.readFile(path.resolve(__dirname, '..', directory, name, name + '.js'), 'utf8', function (err, data) {
      if (err) {
        log.error('LM', 'Loading module file!');
        return;
      }
      var mod = exports.requireFromString(data, name, directory);
      if(mod && fs.existsSync(path.resolve(__dirname, '..', directory, name, 'credentials.json'))) {
        fs.readFile(path.resolve(__dirname, '..', directory, name, 'credentials.json'), 'utf8', function (err, auth) {
          if (err) {
            log.error('LM', 'Loading credentials file for "' + name + '"!');
            callback(name, data, mod, null);
            return;
          }
          if(mod.loadCredentials) mod.loadCredentials(JSON.parse(auth));
          callback(name, data, mod, auth);
        });
      } else {
        // Hand back the name, the string contents and the compiled module
        callback(name, data, mod, null);
      }
    });
  } catch(err) {
    log.error('LM', 'Failed loading module "' + name + '"');
  }
};

exports.loadModules = function(directory, callback) {
  fs.readdir(path.resolve(__dirname, '..', directory), function (err, list) {
    if (err) {
      log.error('LM', 'loading modules directory: ' + err);
      return;
    }
    log.info('LM', 'Loading ' + list.length + ' modules from "' + directory + '"');
    list.forEach(function (file) {
      fs.stat(path.resolve(__dirname, '..', directory, file), function (err, stat) {
        if (stat && stat.isDirectory()) {
          exports.loadModule(directory, file, callback);
        }
      });
    });
  });
};
 

exports.storeEventModule = function (objUser, obj, answHandler) {
  try {
    // TODO in the future we might want to link the modules close to the user
    // and allow for e.g. private modules
    // we need a child process to run this code and kill it after invocation
    var m = exports.requireFromString(obj.data, obj.id);
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
  var m = exports.requireFromString(obj.data, obj.id);
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
  //TODO fix, twice same logic
  var cbEventModule = function (lstParams) {
    return function(err, data) {
      if(err) {
        err.addInfo = 'fetching event module';
        log.error('MM', err);
      }
      if(!err && data) {
        if(data.params) {
          lstParams.eventmodules[data.id] = data.params;
        }
      }
      if(--semaphore === 0) answHandler.answerSuccess(lstParams);
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
    eventmodules: {},
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
    ee.emit('newRule', objRule);
    // for( var i = 0; i < eventHandlers.length; i++ ) {
    //   eventHandlers[i]( objRule );
    // }
  } catch(err) {
    answHandler.answerError(err.message);
    log.error('MM', err);
  }

};
