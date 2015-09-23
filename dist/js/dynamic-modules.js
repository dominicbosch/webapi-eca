
/*

Dynamic Modules
===============
> Compiles CoffeeScript modules and loads JS modules in a VM, together
> with only a few allowed node.js modules.
 */
var cs, db, encryption, fs, getFunctionParamNames, i, len, log, mod, oModules, path, regexpComments, request, searchComment, vm;

db = global.db;

log = require('./logging');

encryption = require('./encryption');

vm = require('vm');

fs = require('fs');

path = require('path');

cs = require('coffee-script');

request = require('request');

oModules = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'config', 'modules.json')));

for (i = 0, len = oModules.length; i < len; i++) {
  mod = oModules[i];
  oModules[mod] = require(mod);
}

regexpComments = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

getFunctionParamNames = function(fName, func, oFuncs) {
  var fnStr, result;
  fnStr = func.toString().replace(regexpComments, '');
  result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(/([^\s,]+)/g);
  if (!result) {
    result = [];
  }
  return oFuncs[fName] = result;
};


/*
Try to run a JS module from a string, together with the
given parameters. If it is written in CoffeeScript we
compile it first into JS.

@public compileString ( *src, id, params, lang* )
@param {String} src
@param {String} id
@param {Object} params
@param {String} lang
 */

exports.compileString = function(args, cb) {
  var answ, dbMod, err, getUserParams, logFunction, ruleId, src;
  if (!args.src || !args.userid || !args.moduleid || !args.lang || !args.moduletype) {
    answ = {
      code: 500,
      message: 'Missing arguments!'
    };
    return typeof cb === "function" ? cb(answ) : void 0;
  }
  if (args.moduletype === 'actiondispatcher') {
    dbMod = db.actionDispatchers;
    logFunction = function(msg) {
      return db.logRule(args.userid, args.rule.id, args.moduleid, msg);
    };
  } else {
    dbMod = db.eventTriggers;
    logFunction = function(msg) {
      return db.logPoller(args.userid, args.moduleid, msg);
    };
  }
  ruleId = args.rule ? '.' + args.rule.id : '';
  args.id = args.userid + ruleId + '.' + args.moduleid + '.vm';
  args.comment = searchComment(lang, src);
  if (lang === 'CoffeeScript') {
    try {
      log.info("DM | Compiling module '" + args.moduleid + "' for user '" + args.userid + "'");
      src = cs.compile(src);
    } catch (_error) {
      err = _error;
      cb({
        answ: {
          code: 400,
          message: 'Compilation of CoffeeScript failed at line ' + err.location.first_line
        }
      });
      return;
    }
  }
  log.info("DM | Trying to fetch user specific module '" + args.moduleid + "' paramters for user '" + args.userid + "'");
  if (args.dryrun) {
    getUserParams = function(m, u, cb) {
      return cb(null, '{}');
    };
  } else {
    getUserParams = dbMod.getUserParams;
  }
  return getUserParams(moduleid, userid, function(err, obj) {
    var fName, fRegisterArguments, func, j, len1, msg, name, oFuncArgs, oFuncParams, oParam, oParams, ref, ref1, sandbox;
    try {
      oParams = {};
      ref = JSON.parse(obj);
      for (name in ref) {
        oParam = ref[name];
        oParams[name] = encryption.decrypt(oParam.value);
      }
      log.info("DM | Loaded user defined params for ");
    } catch (_error) {
      err = _error;
      log.warn("DM | Error during parsing of user defined params for " + args.muserid + ", " + (args.m(rule.id)) + ", " + args.mmoduleid);
      log.warn(err);
    }
    answ = {
      code: 200,
      message: 'Successfully compiled'
    };
    log.info("DM | Running module '" + args.mmoduleid + "' for user '" + args.muserid + "'");
    sandbox = {
      id: args.id,
      params: params,
      log: logFunction,
      exports: {},
      sendEvent: function(hook, evt) {
        var options;
        options = {
          uri: hook,
          method: 'POST',
          json: true,
          body: evt
        };
        return request(options, function(err, res, body) {
          if (err || res.statusCode !== 200) {
            return logFunction('ERROR(' + __filename + ') REQUESTING: ' + hook + ' (' + (new Date()) + ')');
          }
        });
      }
    };
    for (j = 0, len1 = oModules.length; j < len1; j++) {
      mod = oModules[j];
      sandbox[mod] = mod;
    }
    try {
      vm.runInNewContext(args.src, sandbox, sandbox.id);
    } catch (_error) {
      err = _error;
      answ.code = 400;
      msg = err.message;
      if (!msg) {
        msg = 'Try to run the script locally to track the error! Sadly we cannot provide the line number';
      }
      answ.message = 'Loading Module failed: ' + msg;
    }
    log.info("DM | Module '" + moduleid + "' ran successfully for user '" + userid + "' in rule '" + rule.id + "'");
    oFuncParams = {};
    oFuncArgs = {};
    ref1 = sandbox.exports;
    for (fName in ref1) {
      func = ref1[fName];
      getFunctionParamNames(fName, func, oFuncParams);
    }
    oFuncArgs = {};
    fRegisterArguments = (function(_this) {
      return function(fName) {
        return function(err, obj) {
          if (obj) {
            try {
              oFuncArgs[fName] = JSON.parse(obj);
              return log.info("DM | Found and attached user-specific arguments to " + userid + ", " + rule.id + ", " + moduleid + ": " + obj);
            } catch (_error) {
              err = _error;
              log.warn("DM | Error during parsing of user-specific arguments for " + userid + ", " + rule.id + ", " + moduleid);
              return log.warn(err);
            }
          }
        };
      };
    })(this);
    for (func in oFuncParams) {
      dbMod.getUserArguments(args.userid, args.rule.id, args.moduleid, func, fRegisterArguments(func));
    }
    return cb({
      answ: answ,
      module: sandbox.exports,
      funcParams: oFuncParams,
      funcArgs: oFuncArgs,
      logger: sandbox.log,
      comment: comment
    });
  });
};

searchComment = function(lang, src) {
  var arrSrc, comm, j, len1, line;
  arrSrc = src.split('\n');
  comm = '';
  for (j = 0, len1 = arrSrc.length; j < len1; j++) {
    line = arrSrc[j];
    line = line.trim();
    if (line !== '') {
      if (lang === 'CoffeeScript') {
        if (line.substring(0, 1) === '#' && line.substring(1, 3) !== '###') {
          comm += line.substring(1) + '\n';
        }
      } else {
        if (line.substring(0, 2) === '//') {
          comm += line.substring(2) + '\n';
        }
      }
    }
  }
  return comm;
};
