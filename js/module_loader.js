'use strict';

var log;
exports.init = function(args, cb) {
  args = args || {};
  if(args.log) log = args.log;
  else log = args.log = require('./logging');
  if(typeof cb === 'function') cb();
};

var fs = require('fs'),
    path = require('path');
  
exports.requireFromString = function(src, name, dir) {
  if(!dir) dir = __dirname;
  //FIXME load modules only into a safe environment with given modules, no access to whole application
  var id = path.resolve(dir, name, name + '.js');
  var m = new module.constructor(id, module);
  m.paths = module.paths;
  try {
    m._compile(src); 
  } catch(err) {
    err.addInfo = 'during compilation of module ' + name;
    log.error('LM', err);
    // log.error('LM', ' during compilation of ' + name + ': ' + err);
  }
  return m.exports;
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

exports.die = function(cb) {
  if(typeof cb === 'function') cb();
};
 
