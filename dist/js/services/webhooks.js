
/*

Serve Webhooks
==============
> Answers webhook requests from the user
 */
var allowedHooks, db, express, geb, log, router;

db = global.db;

geb = global.eventBackbone;

log = require('../logging');

express = require('express');

router = module.exports = express.Router();

allowedHooks = {};

geb.addListener('system', function(msg) {
  if (msg === 'init') {
    return db.getAllWebhooks(function(err, oHooks) {
      if (oHooks) {
        log.info("SRVC | WEBHOOKS | Initializing " + (Object.keys(oHooks).length) + " Webhooks");
        return allowedHooks = oHooks;
      }
    });
  }
});

router.post('/getallvisible', function(req, res) {
  log.info('SRVC | WEBHOOKS | Fetching all Webhooks');
  return db.getAllVisibleWebhooks(req.session.pub.username, function(err, arr) {
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
          db.createWebhook(user.id, hookid, req.body.hookname, req.body.isPublic === 'true');
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

router.post('/delete/:id', function(req, res) {
  var hookid;
  hookid = req.params.id;
  log.info('SRVC | WEBHOOKS | Deleting Webhook ' + hookid);
  return db.deleteWebhook(req.session.pub.username, hookid, function(err, msg) {
    if (!err) {
      delete allowedHooks[hookid];
      return res.send('OK!');
    } else {
      return res.status(400).send(err);
    }
  });
});

router.post('/event/:id', function(req, res) {
  var oHook, obj;
  oHook = allowedHooks[req.params.id];
  if (oHook) {
    req.body.engineReceivedTime = (new Date()).getTime();
    obj = {
      eventname: oHook.hookname,
      body: req.body
    };
    db.pushEvent(obj);
    return resp.send(200, JSON.stringify({
      message: "Thank you for the event: '" + oHook.hookname + "'",
      evt: obj
    }));
  } else {
    return res.send(404, 'Webhook not existing!');
  }
});
