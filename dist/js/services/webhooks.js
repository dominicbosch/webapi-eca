
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

router.post('/get/:id', function(req, res) {
  log.warn('SRVC | WEBHOOKS | implemnt get id');
  db.getAllUserWebhookNames(req.session.username, function(arr) {
    return log.info('Webhooks' + JSON.stringify(arr));
  });
  return res.send('TODO!');
});

router.post('/getall', function(req, res) {
  log.warn('SRVC | WEBHOOKS | implemnt getAll');
  db.getAllUserWebhookNames(req.session.username, function(arr) {
    return log.info('Webhooks' + JSON.stringify(arr));
  });
  return res.send('TODO!');
});

router.post('/create/:id', function(req, res) {
  log.warn('SRVC | WEBHOOKS | implemnt create Id');
  db.getAllUserWebhookNames(req.session.username, function(arr) {
    return log.info('Webhooks' + JSON.stringify(arr));
  });
  return res.send('TODO!');
});

router.post('/delete/:id', function(req, res) {
  log.warn('SRVC | WEBHOOKS | implemnt delete id');
  db.getAllUserWebhookNames(req.session.username, function(arr) {
    return log.info('Webhooks' + JSON.stringify(arr));
  });
  return res.send('TODO!');
});
