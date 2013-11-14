'use strict';

var path = require('path'), log, config;

exports = module.exports = function(relPath) {
  if(typeof relPath !== 'string') relPath = path.join('config', 'config.json');
  loadConfigFile(relPath);
};

exports.init = function(args, cb) {
  args = args || {};
  if(args.log) log = args.log;
  else log = args.log = require('./logging');
  
  loadConfigFile(path.join('config', 'config.json'));

  if(typeof cb === 'function') cb();
};


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

exports.die = function(cb) {
  if(typeof cb === 'function') cb();
};
 