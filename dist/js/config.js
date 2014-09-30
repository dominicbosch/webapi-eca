
/*

Configuration
=============
> Loads the configuration file and acts as an interface to it.
 */
var exports, fs, loadConfigFile, path;

fs = require('fs');

path = require('path');


/*
Module call
-----------

Calling the module as a function will act as a constructor and load the config file.
It is possible to hand an args object with the properties nolog (true if no outputs shall
be generated) and configPath for a custom configuration file path.

@param {Object} args
 */

exports = module.exports = (function(_this) {
  return function(args) {
    args = args != null ? args : {};
    if (args.nolog) {
      _this.nolog = true;
    }
    if (args.configPath) {
      loadConfigFile(args.configPath);
    } else {
      loadConfigFile(path.join('config', 'systems.json'));
    }
    return module.exports;
  };
})(this);


/*
Tries to load a configuration file from the path relative to this module's parent folder. 
Reads the config file synchronously from the file system and try to parse it.

@private loadConfigFile
@param {String} configPath
 */

loadConfigFile = (function(_this) {
  return function(configPath) {
    var confProperties, e, prop, _i, _len;
    _this.config = null;
    confProperties = ['log', 'http-port', 'db-port'];
    try {
      _this.config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', configPath)));
      _this.isReady = true;
      for (_i = 0, _len = confProperties.length; _i < _len; _i++) {
        prop = confProperties[_i];
        if (!_this.config[prop]) {
          _this.isReady = false;
        }
      }
      if (!_this.isReady && !_this.nolog) {
        return console.error("Missing property in config file, requires:\n" + (" - " + (confProperties.join("\n - "))));
      }
    } catch (_error) {
      e = _error;
      _this.isReady = false;
      if (!_this.nolog) {
        return console.error("Failed loading config file: " + e.message);
      }
    }
  };
})(this);


/*
Fetch a property from the configuration

@private fetchProp( *prop* )
@param {String} prop
 */

exports.fetchProp = (function(_this) {
  return function(prop) {
    var _ref;
    return (_ref = _this.config) != null ? _ref[prop] : void 0;
  };
})(this);


/*
***Returns*** true if the config file is ready, else false

@public isReady()
 */

exports.isReady = (function(_this) {
  return function() {
    return _this.isReady;
  };
})(this);


/*
***Returns*** the HTTP port

@public getHttpPort()
 */

exports.getHttpPort = function() {
  return exports.fetchProp('http-port');
};


/*
***Returns*** the DB port*

@public getDBPort()
 */

exports.getDbPort = function() {
  return exports.fetchProp('db-port');
};


/*
***Returns*** the log conf object

@public getLogConf()
 */

exports.getLogConf = function() {
  return exports.fetchProp('log');
};


/*
***Returns*** the crypto key

@public getCryptoKey()
 */

exports.getKeygenPassphrase = function() {
  return exports.fetchProp('keygen-passphrase');
};
