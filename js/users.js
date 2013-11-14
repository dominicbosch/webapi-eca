'use strict';

var log;
exports.init = function(args, cb) {
  args = args || {};
  if(args.log) log = args.log;
  else log = args.log = require('./logging');
  if(typeof cb === 'function') cb();
};

var objCmds = {
  addUser: addUser,
  getUser: getUser,
  delUser: delUser,
  addRule: addRule,
  getRules: getRules,
  delRule: delRule
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

exports.die = function(cb) {
  if(typeof cb === 'function') cb();
};
 