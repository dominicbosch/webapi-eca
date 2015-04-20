
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

router.get('/*', function(req, res) {
  log.info('test');
  return res.render('index', req.session.pub);
});
