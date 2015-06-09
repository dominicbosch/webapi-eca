
/*

Serve Webhooks
==============
> Answers webhook requests from the user
 */
var db, express, log, router;

log = require('../logging');

db = require('../persistence');

express = require('express');

router = module.exports = express.Router();

this.allowedHooks = {};

db.getAllWebhooks((function(_this) {
  return function(err, oHooks) {
    if (oHooks) {
      log.info("SRVC | WEBHOOKS | Initializing " + (Object.keys(oHooks).length) + " Webhooks");
      return _this.allowedHooks = oHooks;
    }
  };
})(this));


/*
A post request retrieved on this handler causes the user object to be
purged from the session, thus the user will be logged out.
 */

router.post('/get/:id', function(req, res) {
  log.warn('SRVC | WEBHOOKS | implemnt get id');
  db.getAllUserWebhooks(req.session.pub.username, function(err, arr) {
    return log.info('Webhooks' + JSON.stringify(arr));
  });
  return res.send('TODO!');
});

router.post('/getall', function(req, res) {
  log.info('SRVC | WEBHOOKS | Fetching all Webhooks');
  return db.getAllUserWebhooks(req.session.pub.username, function(err, arr) {
    if (err) {
      return res.status(500).send('Fetching all webhooks failed');
    } else {
      return res.send(arr);
    }
  });
});

router.post('/create', function(req, res) {
  var user;
  if (!req.body.hookname) {
    return res.status(400).send('Please provide event name');
  } else {
    user = req.session.pub;
    return db.getAllUserWebhooks(user.username, (function(_this) {
      return function(err, oHooks) {
        var genHookID, hookExists, hookid, oHook;
        hookExists = false;
        for (hookid in oHooks) {
          oHook = oHooks[hookid];
          if (oHook.hookname === req.body.hookname) {
            hookExists = true;
          }
        }
        if (hookExists) {
          return res.status(409).send('Webhook already existing: ' + req.body.hookname);
        } else {
          genHookID = function() {
            var i, j;
            hookid = '';
            for (i = j = 0; j <= 1; i = ++j) {
              hookid += Math.random().toString(36).substring(2);
            }
            if (oHooks && Object.keys(oHooks).indexOf(hookid) > -1) {
              hookid = genHookID();
            }
            return hookid;
          };
          hookid = genHookID();
          db.createWebhook(user.username, hookid, req.body.hookname, req.body.isPublic === 'true');
          allowedHooks[hookid] = {
            hookname: req.body.hookname,
            username: user.username
          };
          log.info("SRVC | WEBHOOKS '" + hookid + "' created and activated");
          return res.status(200).send({
            hookid: hookid,
            hookname: req.body.hookname
          });
        }
      };
    })(this));
  }
});

router.post('/event/:id', function(req, res) {});

router.post('/delete/:id', function(req, res) {
  log.warn('SRVC | WEBHOOKS | implemnt delete id');
  db.getAllUserWebhooks(req.session.username, function(arr) {
    return log.info('Webhooks' + JSON.stringify(arr));
  });
  return res.send('TODO!');
});
