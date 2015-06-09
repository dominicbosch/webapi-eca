
/*

Request Handler
============
> The request handler (surprisingly) handles requests made through HTTP to
> the [HTTP Listener](http-listener.html). It will handle user requests for
> pages as well as POST requests such as user login, module storing, event
> invocation and also admin commands.
 */
var crypto, db, exports, fs, log, path;

log = require('./logging');

db = require('./persistence');

fs = require('fs');

path = require('path');

crypto = require('crypto-js');

exports = module.exports;

this.objAdminCmds = {
  shutdown: function(obj, cb) {
    var data;
    data = {
      code: 200,
      message: 'Shutting down... BYE!'
    };
    setTimeout(process.exit, 500);
    return cb(null, data);
  },
  newuser: function(obj, cb) {
    var data, fPersistNewUser, oUser;
    data = {
      code: 200,
      message: 'User stored thank you!'
    };
    if (obj.username && obj.password) {
      oUser = {
        username: obj.username,
        password: obj.password,
        admin: obj.admin === true
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
              return log.error(err);
            }
          });
        };
      };
      fs.readFile(pathUsers, 'utf8', fPersistNewUser(oUser));
    } else {
      data.code = 401;
      data.message = 'Missing parameter for this command';
    }
    return cb(null, data);
  }
};


/*
Handles the admin command requests.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleAdminCommand( *req, resp* )
 */

exports.handleAdminCommand = (function(_this) {
  return function(req, resp) {
    var body;
    if (req.session && req.session.user && req.session.user.admin) {
      body = '';
      req.on('data', function(data) {
        return body += data;
      });
      return req.on('end', function() {
        var arrCmd, arrKV, arrParams, i, keyVal, len, oParams, obj;
        console.log('RH | body is ' + typeof body);
        obj = body;
        _this.log.info('RH | Received admin request: ' + obj.command);
        arrCmd = obj.command.split(' ');
        if (!arrCmd[0] || !_this.objAdminCmds[arrCmd[0]]) {
          return resp.send(404, 'Command unknown!');
        } else {
          arrParams = arrCmd.slice(1);
          oParams = {};
          for (i = 0, len = arrParams.length; i < len; i++) {
            keyVal = arrParams[i];
            arrKV = keyVal.split(":");
            if (arrKV.length === 2) {
              oParams[arrKV[0]] = arrKV[1];
            }
          }
          return _this.objAdminCmds[arrCmd[0]](oParams, function(err, obj) {
            return resp.send(obj.code, obj);
          });
        }
      });
    } else {
      return resp.status(401).send('You need to be logged in as admin!');
    }
  };
})(this);
