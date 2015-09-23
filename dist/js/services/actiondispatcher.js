
/*

Serve ACTION DISPATCHERS
========================
 */
var db, dynmod, express, log, router, storeModule;

log = require('../logging');

db = global.db;

dynmod = require('../dynamic-modules');

express = require('express');

router = module.exports = express.Router();

router.post('/getall', function(req, res) {
  log.info('SRVC | ACTION DISPATCHERS | Fetching all');
  return db.actionDispatchers.getAllModules(req.session.pub.username, function(err, oADs) {
    if (err) {
      return res.status(500).send(err);
    } else {
      return res.send(oADs);
    }
  });
});

storeModule = (function(_this) {
  return function(user, oBody, modType, dbMod, callback) {
    var args;
    args = {
      src: oBody.data,
      lang: oBody.lang,
      userId: user.username,
      modId: 'dryrun',
      modType: 'actiondispatcher',
      dryrun: true
    };
    return dynmod.compileString(args, function(cm) {
      var answ, funcs, id, name, ref;
      answ = cm.answ;
      if (answ.code === 200) {
        funcs = [];
        ref = cm.module;
        for (name in ref) {
          id = ref[name];
          funcs.push(name);
        }
        log.info("CM | Storing new module with functions " + (funcs.join(', ')));
        answ.message = " Module " + oBody.id + " successfully stored! Found following function(s): " + funcs;
        oBody.functions = JSON.stringify(funcs);
        oBody.functionArgs = JSON.stringify(cm.funcParams);
        oBody.comment = cm.comment;
        dbMod.storeModule(user.username, oBody);
      }
      return callback(answ);
    });
  };
})(this);

router.post('/store', function(req, res) {
  log.info('SRVC | ACTION DISPATCHERS | Fetching all');
  if (req.overwrite) {
    return storeModule(user, req, modType, dbMod, callback);
  } else {
    return dbMod.getModule(user.username, req.id, (function(_this) {
      return function(err, mod) {
        if (mod) {
          answ.code = 409;
          answ.message = 'Module name already existing: ' + req.id;
          return callback(answ);
        } else {
          return storeModule(user, req, modType, dbMod, callback);
        }
      };
    })(this));
  }
});
