
/*

Configuration
=============
> Loads the configuration file and acts as an interface to it.
 */
var exports, fs, oConfig, path;

fs = require('fs');

path = require('path');

oConfig = {};


/*
init( configPath )
-----------

Calling the init function will load the config file.
It is possible to hand a configPath for a custom configuration file path.

@param {Object} args
 */

oConfig.init = (function(_this) {
  return function(filePath) {
    var configPath, e, oConffile, oValue, prop;
    if (_this.isInitialized) {
      return console.error('ERROR: Already initialized configuration!');
    } else {
      _this.isInitialized = true;
      configPath = path.resolve(filePath || path.join(__dirname, '..', 'config', 'systems.json'));
      try {
        oConffile = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', configPath)));
        for (prop in oConffile) {
          oValue = oConffile[prop];
          oConfig[prop] = oValue;
        }
        oConfig.init = function() {
          return console.error('ERROR: Already initialized configuration!');
        };
        return oConfig.isInit = true;
      } catch (_error) {
        e = _error;
        oConfig = null;
        return console.error("Failed loading config file: " + e.message);
      }
    }
  };
})(this);

exports = module.exports = oConfig;
