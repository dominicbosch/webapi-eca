
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


/*
A post request retrieved on this handler causes the user object to be
purged from the session, thus the user will be logged out.
 */

router.post('/get/:name', function(req, res) {
  log.info('SRVC | WEBHOOKS | implemnt getAll');
  db.getAllUserWebhookNames(req.session.username, function(arr) {
    return log.info('Webhooks' + JSON.stringify(arr));
  });
  return res.send('TODO!');
});
