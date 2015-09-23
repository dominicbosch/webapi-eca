
/*

Serve EVENT TRIGGERS
====================
 */
var db, express, geb, log, router;

log = require('../logging');

db = global.db;

express = require('express');

geb = global.eventBackbone;

geb.emit('eventtrigger', 'wow');

router = module.exports = express.Router();

router.post('/getall', function(req, res) {
  log.info('SRVC | EVENT TRIGGERS | Fetching all');
  return db.eventTriggers.getAllModules(req.session.pub.username, function(err, oETs) {
    if (err) {
      return res.status(500).send(err);
    } else {
      return res.send(oETs);
    }
  });
});

router.post('/store', function(req, res) {
  return log.info('SRVC | EVENT TRIGGERS | Storing new EP');
});
