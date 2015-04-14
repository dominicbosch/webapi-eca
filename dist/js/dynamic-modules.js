
/*

Dynamic Modules
===============
> Compiles CoffeeScript modules and loads JS modules in a VM, together
> with only a few allowed node.js modules.
 */
var conf, createNodeModule, cs, db, encryption, fPush, fPushEvent, getFunctionParamNames, loadEventTrigger, log, logFunction, regexpComments, searchComment, vm;

conf = require('./config');

log = require('./logging');

db = require('./persistence');

encryption = require('./encryption');

vm = require('vm');

cs = require('coffee-script');

logFunction = function(uId, rId, mId) {
  return function(msg) {
    return db.appendLog(uId, rId, mId, msg);
  };
};

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

exports.compileString = (function(_this) {
  return function(src, userId, oRule, modId, lang, modType, dbMod, cb) {
    var comment, err;
    comment = searchComment(lang, src);
    if (lang === 'CoffeeScript') {
      try {
        log.info("DM | Compiling module '" + modId + "' for user '" + userId + "'");
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
    log.info("DM | Trying to fetch user specific module '" + modId + "' paramters for user '" + userId + "'");
    if (dbMod) {
      return dbMod.getUserParams(modId, userId, function(err, obj) {
        var name, oParam, oParams, ref;
        try {
          oParams = {};
          ref = JSON.parse(obj);
          for (name in ref) {
            oParam = ref[name];
            oParams[name] = encryption.decrypt(oParam.value);
          }
          log.info("DM | Loaded user defined params for " + userId + ", " + oRule.id + ", " + modId);
        } catch (_error) {
          err = _error;
          log.warn("DM | Error during parsing of user defined params for " + userId + ", " + oRule.id + ", " + modId);
          log.warn(err);
        }
        return createNodeModule(src, userId, oRule, modId, modType, dbMod, oParams, comment, cb);
      });
    } else {
      return createNodeModule(src, userId, oRule, modId, modType, dbMod, null, comment, cb);
    }
  };
})(this);

fPushEvent = function(userId, oRule, modType) {
  return function(obj) {
    var timestamp;
    timestamp = (new Date()).toISOString();
    if (modType === 'eventtrigger') {
      return db.pushEvent({
        eventname: oRule.eventname + '_created:' + oRule.timestamp,
        body: obj
      });
    } else {
      return db.pushEvent(obj);
    }
  };
};

createNodeModule = (function(_this) {
  return function(src, userId, oRule, modId, modType, dbMod, params, comment, cb) {
    var answ, err, fName, fRegisterArguments, func, i, len, logFunc, mod, msg, oFuncArgs, oFuncParams, ref, ref1, sandbox;
    if (!params) {
      params = {};
    }
    answ = {
      code: 200,
      message: 'Successfully compiled'
    };
    log.info("DM | Running module '" + modId + "' for user '" + userId + "'");
    logFunc = logFunction(userId, oRule.id, modId);
    sandbox = {
      id: userId + "." + oRule.id + "." + modId + ".vm",
      params: params,
      log: logFunc,
      debug: console.log,
      exports: {},
      setTimeout: setTimeout,
      pushEvent: fPushEvent(userId, oRule, modType)
    };
    ref = conf.usermodules;
    for (i = 0, len = ref.length; i < len; i++) {
      mod = ref[i];
      sandbox[mod] = require(mod);
    }
    try {
      vm.runInNewContext(src, sandbox, sandbox.id);
    } catch (_error) {
      err = _error;
      answ.code = 400;
      msg = err.message;
      if (!msg) {
        msg = 'Try to run the script locally to track the error! Sadly we cannot provide the line number';
      }
      answ.message = 'Loading Module failed: ' + msg;
    }
    log.info("DM | Module '" + modId + "' ran successfully for user '" + userId + "' in rule '" + oRule.id + "'");
    oFuncParams = {};
    oFuncArgs = {};
    ref1 = sandbox.exports;
    for (fName in ref1) {
      func = ref1[fName];
      getFunctionParamNames(fName, func, oFuncParams);
    }
    if (dbMod) {
      oFuncArgs = {};
      fRegisterArguments = function(fName) {
        return function(err, obj) {
          if (obj) {
            try {
              oFuncArgs[fName] = JSON.parse(obj);
              return log.info("DM | Found and attached user-specific arguments to " + userId + ", " + oRule.id + ", " + modId + ": " + obj);
            } catch (_error) {
              err = _error;
              log.warn("DM | Error during parsing of user-specific arguments for " + userId + ", " + oRule.id + ", " + modId);
              return log.warn(err);
            }
          }
        };
      };
      for (func in oFuncParams) {
        dbMod.getUserArguments(userId, oRule.id, modId, func, fRegisterArguments(func));
      }
    }
    return cb({
      answ: answ,
      module: sandbox.exports,
      funcParams: oFuncParams,
      funcArgs: oFuncArgs,
      logger: sandbox.log,
      comment: comment
    });
  };
})(this);

fPush = function(evtname) {
  return function(obj) {
    if (evtname) {
      return db.pushEvent({
        eventname: evtname,
        body: obj
      });
    } else {
      return db.pushEvent(obj);
    }
  };
};

loadEventTrigger = function(oRule) {
  var context;
  return context = {
    pushEvent: fPush(oRule.eventname)
  };
};

searchComment = function(lang, src) {
  var arrSrc, comm, i, len, line;
  arrSrc = src.split('\n');
  comm = '';
  for (i = 0, len = arrSrc.length; i < len; i++) {
    line = arrSrc[i];
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
