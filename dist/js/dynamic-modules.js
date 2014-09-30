
/*

Dynamic Modules
===============
> Compiles CoffeeScript modules and loads JS modules in a VM, together
> with only a few allowed node.js modules.
 */
var cs, db, encryption, exports, fPush, fPushEvent, fTryToLoadModule, getFunctionParamNames, loadEventTrigger, logFunction, regexpComments, vm;

db = require('./persistence');

encryption = require('./encryption');

vm = require('vm');

cs = require('coffee-script');


/*
Module call
-----------
Initializes the dynamic module handler.

@param {Object} args
 */

exports = module.exports = (function(_this) {
  return function(args) {
    _this.log = args.logger;
    return module.exports;
  };
})(this);

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
    var err;
    if (lang === 'CoffeeScript') {
      try {
        _this.log.info("DM | Compiling module '" + modId + "' for user '" + userId + "'");
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
    _this.log.info("DM | Trying to fetch user specific module '" + modId + "' paramters for user '" + userId + "'");
    if (dbMod) {
      return dbMod.getUserParams(modId, userId, function(err, obj) {
        var name, oParam, oParams, _ref;
        try {
          oParams = {};
          _ref = JSON.parse(obj);
          for (name in _ref) {
            oParam = _ref[name];
            oParams[name] = encryption.decrypt(oParam.value);
          }
          _this.log.info("DM | Loaded user defined params for " + userId + ", " + oRule.id + ", " + modId);
        } catch (_error) {
          err = _error;
          _this.log.warn("DM | Error during parsing of user defined params for " + userId + ", " + oRule.id + ", " + modId);
          _this.log.warn(err);
        }
        return fTryToLoadModule(userId, oRule, modId, src, modType, dbMod, oParams, cb);
      });
    } else {
      return fTryToLoadModule(userId, oRule, modId, src, modType, dbMod, null, cb);
    }
  };
})(this);

fPushEvent = function(userId, oRule, modType) {
  return function(obj) {
    var timestamp;
    timestamp = (new Date()).toISOString();
    if (modType === 'eventpoller') {
      return db.pushEvent({
        eventname: oRule.eventname + '_created:' + oRule.timestamp,
        body: obj
      });
    } else {
      return db.pushEvent(obj);
    }
  };
};

fTryToLoadModule = (function(_this) {
  return function(userId, oRule, modId, src, modType, dbMod, params, cb) {
    var answ, err, fName, fRegisterArguments, func, logFunc, msg, oFuncArgs, oFuncParams, sandbox, _ref;
    if (!params) {
      params = {};
    }
    answ = {
      code: 200,
      message: 'Successfully compiled'
    };
    _this.log.info("DM | Running module '" + modId + "' for user '" + userId + "'");
    logFunc = logFunction(userId, oRule.id, modId);
    sandbox = {
      importio: require('import-io').client,
      prettydiff: require('prettydiff'),
      cryptoJS: require('crypto-js'),
      deepdiff: require('deep-diff'),
      jsselect: require('js-select'),
      request: require('request'),
      cheerio: require('cheerio'),
      needle: require('needle'),
      jsdom: require('jsdom'),
      diff: require('diff'),
      id: "" + userId + "." + oRule.id + "." + modId + ".vm",
      params: params,
      log: logFunc,
      debug: console.log,
      exports: {},
      setTimeout: setTimeout,
      pushEvent: fPushEvent(userId, oRule, modType)
    };
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
    _this.log.info("DM | Module '" + modId + "' ran successfully for user '" + userId + "' in rule '" + oRule.id + "'");
    oFuncParams = {};
    oFuncArgs = {};
    _ref = sandbox.exports;
    for (fName in _ref) {
      func = _ref[fName];
      getFunctionParamNames(fName, func, oFuncParams);
    }
    if (dbMod) {
      oFuncArgs = {};
      fRegisterArguments = function(fName) {
        return function(err, obj) {
          if (obj) {
            try {
              oFuncArgs[fName] = JSON.parse(obj);
              return _this.log.info("DM | Found and attached user-specific arguments to " + userId + ", " + oRule.id + ", " + modId + ": " + obj);
            } catch (_error) {
              err = _error;
              _this.log.warn("DM | Error during parsing of user-specific arguments for " + userId + ", " + oRule.id + ", " + modId);
              return _this.log.warn(err);
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
      logger: sandbox.log
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
