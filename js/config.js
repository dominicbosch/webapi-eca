'use strict';

var path = require('path'),
    log = require('./logging'),
    config;

exports = module.exports = function(args) {
  args = args || {};
  log(args);
  if(typeof args.relPath === 'string') loadConfigFile(args.relPath);
  //TODO check all modules whether they can be loaded without calling the module.exports with args
  return module.exports;
};

loadConfigFile(path.join('config', 'config.json'));

function loadConfigFile(relPath) {
  try {
    config = JSON.parse(require('fs').readFileSync(path.resolve(__dirname, '..', relPath)));
    if(config && config.http_port && config.db_port
        && config.crypto_key && config.session_secret) {
      log.print('CF', 'config file loaded successfully!');
    } else {
      log.error('CF', new Error('Missing property in config file, requires:\n'
        + ' - http_port\n'
        + ' - db_port\n'
        + ' - crypto_key\n'
        + ' - session_secret'));
    }
  } catch (e) {
    e.addInfo = 'no config ready';
    log.error('CF', e);
  }
}

/**
 * Fetch a property from the configuration
 * @param {String} prop
 */
function fetchProp(prop) {
  if(config) return config[prop];
}

/**
 * Get the HTTP port
 */
exports.getHttpPort = function() {
  return fetchProp('http_port');
};

/**
 * Get the DB port
 */
exports.getDBPort = function() {
  return fetchProp('db_port');
};

/**
 * Get the crypto key
 */
exports.getCryptoKey = function() {
  return fetchProp('crypto_key');
};

/**
 * Get the session secret
 */
exports.getSessionSecret = function() {
  return fetchProp('session_secret');
};

 