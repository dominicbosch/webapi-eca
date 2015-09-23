
/*

Administration Service
======================
> Handles admin requests, such as create new user
 */
var db, express, fs, log, path, pathUsers, router;

fs = require('fs');

path = require('path');

log = require('../logging');

db = global.db;

express = require('express');

pathUsers = path.resolve(__dirname, '..', '..', 'config', 'users.json');

router = module.exports = express.Router();

router.use('/*', function(req, res, next) {
  if (req.session.pub.admin === 'true') {
    return next();
  } else {
    return res.status(401).send('You are not admin, you böse bueb you!');
  }
});

router.post('/createuser', function(req, res) {
  if (req.body.username && req.body.password) {
    return db.getUserIds(function(err, arrUsers) {
      var oUser;
      if (arrUsers.indexOf(req.body.username) > -1) {
        return res.status(409).send('User already existing!');
      } else {
        oUser = {
          username: req.body.username,
          password: req.body.password,
          admin: req.body.isAdmin
        };
        db.storeUser(oUser);
        log.info('New user "' + oUser.username + '" created by "' + req.session.pub.username + '"!');
        return res.send('New user "' + oUser.username + '" created!');
      }
    });
  } else {
    return res.status(400).send('Missing parameter for this command!');
  }
});

router.post('/deleteuser', function(req, res) {
  if (req.body.username === req.session.pub.username) {
    return res.status(403).send('You dream du! You really shouldn\'t delete yourself!');
  } else {
    db.deleteUser(req.body.username);
    log.info('User "' + req.body.username + '" deleted by "' + req.session.pub.username + '"!');
    return res.send('User "' + req.body.username + '" deleted!');
  }
});
