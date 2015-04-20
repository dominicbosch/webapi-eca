
/*

Serve Session
=============
> Answers session requests from the user
 */
var db, express, log, router;

log = require('./logging');

db = require('./persistence');

express = require('express');

router = module.exports = express.Router();


/*
Associates the user object with the session if login is successful.
 */

router.post('/login', (function(_this) {
  return function(req, res) {
    return db.loginUser(req.body.username, req.body.password, function(err, usr) {
      if (err) {
        log.warn("RH | AUTH-UH-OH ( " + req.body.username + " ): " + err.message);
      } else {
        req.session.user = usr;
      }
      if (req.session.user) {
        return res.send('OK!');
      } else {
        return res.status(401).send('NO!');
      }
    });
  };
})(this));


/*
A post request retrieved on this handler causes the user object to be
purged from the session, thus the user will be logged out.
 */

router.post('/logout', function(req, res) {
  if (req.session) {
    delete req.session.user;
    return res.send('Bye!');
  }
});
