
/*

Dynamic Modules
===============
> Compiles CoffeeScript modules and loads JS modules in a VM, together
> with only a few allowed node.js modules.
 */
var createNodeModule, cs, db, encryption, fs, getFunctionParamNames, i, len, log, logFunction, mod, oModules, path, regexpComments, request, searchComment, sendToWebhook, vm;

log = require('./logging');

db = require('./persistence');

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

sendToWebhook = function(log) {
  return function(hook, evt) {
    var options;
    options = {
      uri: hook,
      method: 'POST',
      json: true,
      body: evt
    };
    return request(options, function(err, res, body) {
      if (err || res.statusCode !== 200) {
        return log('ERROR(' + __filename + ') REQUESTING: ' + hook + ' (' + (new Date()) + ')');
      }
    });
  };
};

createNodeModule = (function(_this) {
  return function(src, userId, oRule, modId, modType, dbMod, params, comment, cb) {
    var answ, err, fName, fRegisterArguments, func, j, len1, logFunc, msg, oFuncArgs, oFuncParams, ref, sandbox;
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
      exports: {},
      sendEvent: sendToWebhook(logFunc)
    };
    for (j = 0, len1 = oModules.length; j < len1; j++) {
      mod = oModules[j];
      sandbox[mod] = mod;
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
    ref = sandbox.exports;
    for (fName in ref) {
      func = ref[fName];
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
