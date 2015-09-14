
/*

Serve EVENT TRIGGERS
====================
 */
var db, express, log, router;

log = require('../logging');

db = require('../persistence');

express = require('express');

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
