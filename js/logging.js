/*
 * Logging
 * =======
 * Functions to handle logging and errors.
 */

// @function print(module, msg)

/* 
 * Prints a log to stdout.
 * @param {String} module
 * @param {String} msg
 */
exports.print = function(module, msg) {
  console.log((new Date()).toISOString() + ' | ' + module + ' | ' + msg);
};

// @function error(module, msg)

/*
 * Prints a log to stderr.
 * @param {String} module
 * @param {Error} err
 */
exports.error = function(module, err) {
  var ts = (new Date()).toISOString() + ' | ', ai = '';
  if(typeof err === 'string') {
    var e = new Error();
    if(module) console.error(ts + module + ' | ERROR AND BAD HANDLING: ' + err + '\n' + e.stack);
    else console.error(ts + '!N/A! | ERROR, BAD HANDLING AND NO MODULE NAME: ' + err + '\n' + e.stack);
  } else if(err) {
    if(err.addInfo) ai = ' (' + err.addInfo + ')';
    if(!err.message) err.message = 'UNKNOWN REASON!\n' + err.stack;
    if(module) console.error(ts + module + ' | ERROR'+ai+': ' + err.message);
    else console.error(ts + '!N/A! | ERROR AND NO MODULE NAME'+ai+': ' + err.message + '\n' + err.stack);
  } else {
    var e = new Error('Unexpected error');
    console.error(e.message + ': \n' + e.stack);
  }
};
