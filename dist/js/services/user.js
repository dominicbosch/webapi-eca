
/*

User Service
=============
> Manage the user
 */
var db, express, log, router;

log = require('../logging');

db = require('../persistence');

express = require('express');

router = module.exports = express.Router();

router.post('/passwordchange', function(req, res) {
  return db.getUser(req.session.pub.username, function(err, oUser) {
    if (req.body.oldpassword === oUser.password) {
      oUser.password = req.body.newpassword;
      if (db.storeUser(oUser)) {
        log.info('SRVC | USER | Password changed for: ' + oUser.username);
        return res.send('Password changed!');
      } else {
        return res.status(401).send('Password changing failed!');
      }
    } else {
      return res.status(409).send('Wrong password!');
    }
  });
});

router.post('/getall', function(req, res) {
  return db.getUserIds(function(err, arrUsers) {
    if (err) {
      return res.status(500).send('Unable to fetch users!');
    } else {
      return res.send(arrUsers);
    }
  });
});
