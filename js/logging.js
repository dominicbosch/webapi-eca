/*
 * Logging
 * =======
 * Functions to handle logging and errors.
 * 
 * Valid log types are:
 * 
 * - 0 standard I/O
 * - 1 file
 * - 2 silent
 */
var fs = require('fs'),
    logTypes = [ flushToConsole, flushToFile, null],
    logType = 0, logFile = './server.log';

exports = module.exports = function(args) {
  args = args || {};
  if(args.logType) logType = parseInt(args.logType) || 0;
  if(logType == 1) fs.truncateSync(logFile, 0);
  return module.exports;
};

exports.getLogType = function() { return logType; };

function flush(err, msg) {
  if(typeof logTypes[logType] === 'function') logTypes[logType](err, msg);
}

function flushToConsole(err, msg) {
  if(err) console.error(msg);
  else console.log(msg);
}

function flushToFile(err, msg) {
  fs.appendFile(logFile, msg + '\n', function (err) {});
}

// @function print(module, msg)

/* 
 * Prints a log to stdout.
 * @param {String} module
 * @param {String} msg
 */
exports.print = function(module, msg) {
  flush(false, (new Date()).toISOString() + ' | ' + module + ' | ' + msg);
};

/**
 * Prints a log to stderr.
 * @param {String} module
 * @param {Error} err
 */
function printError(module, err, isSevere) {
  var ts = (new Date()).toISOString() + ' | ', ai = '';
  if(!err) err = new Error('Unexpected error');
  if(typeof err === 'string') err = new Error(err);
    // if(module) flush(true, ts + module + ' | ERROR AND BAD HANDLING: ' + err + '\n' + e.stack);
    // else flush(true, ts + '!N/A! | ERROR, BAD HANDLING AND NO MODULE NAME: ' + err + '\n' + e.stack);
  // } else if(err) {
    if(err.addInfo) ai = ' (' + err.addInfo + ')';
    if(!err.message) err.message = 'UNKNOWN REASON!\n' + err.stack;
    if(module) {
      var msg = ts + module + ' | ERROR'+ai+': ' + err.message;
      if(isSevere) msg += '\n' + err.stack;
      flush(true, msg);
    } else flush(true, ts + '!N/A! | ERROR AND NO MODULE NAME'+ai+': ' + err.message + '\n' + err.stack);
  // } else {
    // var e = new Error('Unexpected error');
    // flush(true, e.message + ': \n' + e.stack);
  // }
};

/**
 * Prints a message to stderr.
 * @param {String} module
 * @param {Error} err
 */
exports.error = function(module, err) {
  printError(module, err, false);
};

/**
 * Prints a message with error stack to stderr
 * @param {String} module
 * @param {Error} err
 */
exports.severe = function(module, err) {
  printError(module, err, true);
};
