'use strict';

/**
 * command standard config file loading and pass certain property back to the callback
 * @param {String} prop
 * @param {function} cb
 */
function fetchProp(prop, cb) {
  if(typeof cb === 'function') {
    exports.getConfig(null, function(err, data) {
      if(!err) cb(null, data[prop]);
      else cb(err);
    });
  }
}

/**
 * 
 * @param {String[]} relPath
 * @param {Object} cb
 */
exports.getConfig = function(relPath, cb) {
  var fs = require('fs'), path = require('path'), log = require('./logging');
  if(!relPath) relPath = path.join('config', 'config.json');
  fs.readFile(
    path.resolve(__dirname, '..', relPath),
    'utf8',
    function (err, data) {
      if (err) {
        err.addInfo = 'config file loading';
        if(typeof cb === 'function') cb(err);
        else log.error('CF', err);
      } else {
        try {
          var config = JSON.parse(data);
          if(!config.http_port || !config.db_port || !config.crypto_key) {
            var e = new Error('Missing property, requires:\n'
              + ' - http_port\n'
              + ' - db_port\n'
              + ' - crypto_key');
            if(typeof cb === 'function') cb(e);
            else log.error('CF', e);
          } else {
            if(typeof cb === 'function') cb(null, config);
            else log.print('CF', 'config file loaded successfully but pointless since no callback defined...');
          }
        } catch(e) {
          e.addInfo = 'config file parsing';
          log.error('CF', e);
        }
      }
    }
  );
};

/**
 * Command config file loading and retrieve the http port via the callback.
 * @param {function} cb
 */
exports.getHttpPort = function(cb) {
  fetchProp('http_port', cb);
};

/**
 * Command config file loading and retrieve the DB port via the callback.
 * @param {function} cb
 */
exports.getDBPort = function(cb) {
  fetchProp('db_port', cb);
};

/**
 * Command config file loading and retrieve the crypto key via the callback.
 * @param {function} cb
 */
exports.getCryptoKey = function(cb) {
  fetchProp('crypto_key', cb);
};
