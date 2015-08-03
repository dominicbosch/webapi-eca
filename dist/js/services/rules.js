
/*

Serve Rules
===========
> Answers rule requests from the user
 */
var db, express, log, router;

log = require('../logging');

db = require('../persistence');

express = require('express');

router = module.exports = express.Router();

router.post('/getall', function(req, res) {
  log.info('SRVC | RULES | Fetching all Rules');
  return db.getAllRules(req.session.pub.username, function(err, arr) {
    console.log('DB returned arr', arr);
    if (err) {
      return res.status(500).send('Fetching all rules failed');
    } else {
      return res.send(arr);
    }
  });
});
