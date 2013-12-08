'use strict';

var fs = require('fs'),
    path = require('path'),
    log = require('./logging');

exports = module.exports = function(args) {
  args = args || {};
  log(args);
  return module.exports;
};

exports.requireFromString = function(src, name, dir) {
  if(!dir) dir = __dirname;
  var id = path.resolve(dir, name, name + '.vm');
  var vm = require('vm'),
    // FIXME not log but debug module is required to provide information to the user
    sandbox = {
      id: id, // use this to gather kill info
      needle: require('needle'),
      log: log,
      exports: {}
    };
  //TODO child_process to run module!
  // Define max runtime per loop as 10 seconds, after that the child will be killed
  // it can still be active after that if there was a timing function or a callback used...
  // kill the child each time? how to determine whether there's still a token in the module?
  var mod = vm.runInNewContext(src, sandbox, id + '.vm');
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
    log.print('LM', 'Loading ' + list.length + ' modules from "' + directory + '"');
    list.forEach(function (file) {
      fs.stat(path.resolve(__dirname, '..', directory, file), function (err, stat) {
        if (stat && stat.isDirectory()) {
          exports.loadModule(directory, file, callback);
        }
      });
    });
  });
};
 
