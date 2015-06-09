
/*

Administration Service
======================
> Handles admin requests, such as create new user
 */
var db, express, fs, log, path, pathUsers, router;

fs = require('fs');

path = require('path');

log = require('../logging');

db = require('../persistence');

express = require('express');

pathUsers = path.resolve(__dirname, '..', '..', 'config', 'users.json');

router = module.exports = express.Router();

router.post('/createuser', function(req, res) {
  if (req.body.username && req.body.password) {
    return db.getUserIds(function(err, arrUsers) {
      var fPersistNewUser, oUser;
      if (arrUsers.indexOf(req.body.username) > -1) {
        return res.status(409).send('User already existing!');
      } else {
        oUser = {
          username: req.body.username,
          password: req.body.password,
          admin: req.body.isAdmin
        };
        db.storeUser(oUser);
        fPersistNewUser = function(oUser) {
          return function(err, data) {
            var users;
            users = JSON.parse(data);
            users[oUser.username] = {
              password: oUser.password,
              admin: oUser.admin
            };
            return fs.writeFile(pathUsers, JSON.stringify(users, void 0, 2), 'utf8', function(err) {
              if (err) {
                log.error("RH | Unable to write new user file! ");
                log.error(err);
                return res.status(500).send('User not persisted!');
              } else {
                return res.send('New user "' + oUser.username + '" created!');
              }
            });
          };
        };
        return fs.readFile(pathUsers, 'utf8', fPersistNewUser(oUser));
      }
    });
  } else {
    return res.status(401).send('Missing parameter for this command!');
  }
});
