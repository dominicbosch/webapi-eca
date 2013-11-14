/*
# Module Manager
> The module manager takes care of the module and rules loading in the initialization
> phase and on user request.

> Event and Action modules are loaded as strings and stored in the database,
> then compiled into node modules and  and rules
 */

'use strict';

var log, ml;
exports.init = function(args, cb) {
  args = args || {};
  if(args.log) log = args.log;
  else log = args.log = require('./logging');
  
  ml = require('./module_loader').init(args);
  
  if(typeof cb === 'function') cb();
};

var fs = require('fs'),
  path = require('path'),
  db = null, funcLoadAction, funcLoadRule;

exports.addHandlers = function(db_link, fLoadAction, fLoadRule) {
  db = db_link;
  funcLoadAction = fLoadAction;
  funcLoadRule = fLoadRule;
};
/*
# A First Level Header


A Second Level Header
---------------------

Now is the time for all good men to come to
the aid of their country. This is just a
regular paragraph.

The quick brown fox jumped over the lazy
dog's back.

### Header 3

> This is a blockquote.
> 
> This is the second paragraph in the blockquote.
>
> ## This is an H2 in a blockquote

This is the function documentation
@param {Object} [args] the optional arguments
@param {String} [args.name] the optional name in the arguments
 */
exports.loadRulesFile = function(args, answHandler) {
  if(!args) args = {};
  if(!args.name) args.name = 'rules';
  if(!funcLoadRule) log.error('ML', 'no rule loader function available');
  else {
    fs.readFile(path.resolve(__dirname, '..', 'rules', args.name + '.json'), 'utf8', function (err, data) {
      if (err) {
        log.error('ML', 'Loading rules file: ' + args.name + '.json');
        return;
      }
      try {
        var arr = JSON.parse(data), txt = '';
        log.print('ML', 'Loading ' + arr.length + ' rules:');
        for(var i = 0; i < arr.length; i++) {
          txt += arr[i].id + ', ';
          db.storeRule(arr[i].id, JSON.stringify(arr[i]));
          funcLoadRule(arr[i]);
        }
        answHandler.answerSuccess('Yep, loaded rules: ' + txt);
      } catch (e) {
        log.error('ML', 'rules file was corrupt! (' + args.name + '.json)');
      }
    });
  }
};

/**
 * 
 * @param {Object} name
 * @param {Object} data
 * @param {Object} mod
 * @param {String} [auth] The string representation of the auth json
 */
function loadActionCallback(name, data, mod, auth) {
  db.storeActionModule(name, data); // store module in db
  funcLoadAction(name, mod); // hand compiled module back
  if(auth) db.storeActionModuleAuth(name, auth);
}

exports.loadActionModule = function (args, answHandler) {
  if(args && args.name) {
		answHandler.answerSuccess('Loading action module ' + args.name + '...');
    ml.loadModule('mod_actions', args.name, loadActionCallback);
  }
};

exports.loadActionModules = function(args, answHandler) {
	answHandler.answerSuccess('Loading action modules...');
  ml.loadModules('mod_actions', loadActionCallback);
};

exports.die = function(cb) {
  if(typeof cb === 'function') cb();
};
 