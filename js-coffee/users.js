'use strict';

var log = require('./logging'),
    objCmds = {
      addUser: addUser,
      getUser: getUser,
      delUser: delUser,
      addRule: addRule,
      getRules: getRules,
      delRule: delRule
    };

exports = module.exports = function(args) {
  args = args || {};
  log(args);
  return module.exports;
};

exports.handleCommand = function(args, cb) {
  if(!args.cmd) {
    var e = new Error('No command defined!');
    if(typeof cb === 'function') cb(e);
    else log.error('US', e);
  } else {
    objCmds[args.cmd](args, cb);
  }
};

/**
 * 
 * @param {Object} args
 * @param {function} cb
 */
function addUser(args, cb) {
  
}

/**
 * 
 * @param {Object} args
 * @param {function} cb
 */
function getUser(args, cb) {
  
}

/**
 * 
 * @param {Object} args
 * @param {function} cb
 */
function delUser(args, cb) {
  
}

/**
 * 
 * @param {Object} args
 * @param {function} cb
 */
function addRule(args, cb) {
  
}

/**
 * 
 * @param {Object} args
 * @param {function} cb
 */
function getRule(args, cb) {
  
}

/**
 * 
 * @param {Object} args
 * @param {function} cb
 */
function delRule(args, cb) {
  
}
