
/*

Serve ACTION DISPATCHERS
========================
 */
var db, express, log, router;

log = require('../logging');

db = require('../persistence');

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
