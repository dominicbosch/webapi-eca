
/*

Request Handler
============
> The request handler (surprisingly) handles requests made through HTTP to
> the [HTTP Listener](http-listener.html). It will handle user requests for
> pages as well as POST requests such as user login, module storing, event
> invocation and also admin commands.
 */
var crypto, db, dirHandlers, exports, fs, log, path, pathUsers;

log = require('./logging');

db = require('./persistence');

fs = require('fs');

path = require('path');

crypto = require('crypto-js');

pathUsers = path.resolve(__dirname, '..', 'config', 'users.json');

dirHandlers = path.resolve(__dirname, '..', 'webpages', 'handlers');

exports = module.exports;

exports.init = function() {
  var fStoreUser, oUser, user, users;
  users = JSON.parse(fs.readFileSync(pathUsers, 'utf8'));
  fStoreUser = function(username, oUser) {
    oUser.username = username;
    return db.storeUser(oUser);
  };
  for (user in users) {
    oUser = users[user];
    fStoreUser(user, oUser);
  }
  this.allowedHooks = {};
  return db.getAllWebhooks((function(_this) {
    return function(err, oHooks) {
      if (oHooks) {
        log.info("RH | Initializing " + (Object.keys(oHooks).length) + " Webhooks");
        return _this.allowedHooks = oHooks;
      }
    };
  })(this));
};

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
Handles possible events that were posted to this server and pushes them into the
event queue.
 */

exports.handleEvent = function(req, res) {
  var answ;
  if (req.body && req.body.eventname) {
    answ = {
      code: 200,
      message: "Thank you for the event: " + req.body.eventname
    };
    res.status(answ.code).send(answ);
    return db.pushEvent(req.body);
  } else {
    return res.send(400, 'Your event was missing important parameters!');
  }
};


/*
Present the desired forge page to the user.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleForge( *req, resp* )
 */

exports.handleForge = function(req, resp) {
  var page;
  page = req.query.page;
  if (!req.session.user) {
    page = 'login';
  }
  return renderPage(page, req, resp);
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
        var arrCmd, arrKV, arrParams, keyVal, oParams, obj, _i, _len;
        console.log('RH | body is ' + typeof body);
        obj = body;
        _this.log.info('RH | Received admin request: ' + obj.command);
        arrCmd = obj.command.split(' ');
        if (!arrCmd[0] || !_this.objAdminCmds[arrCmd[0]]) {
          return resp.send(404, 'Command unknown!');
        } else {
          arrParams = arrCmd.slice(1);
          oParams = {};
          for (_i = 0, _len = arrParams.length; _i < _len; _i++) {
            keyVal = arrParams[_i];
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
      return resp.send(401, 'You need to be logged in as admin!');
    }
  };
})(this);


/*
Handles webhook posts
 */

exports.handleWebhooks = (function(_this) {
  return function(req, resp) {
    var body, hookid, oHook;
    hookid = req.url.substring(10).split('/')[0];
    oHook = _this.allowedHooks[hookid];
    if (oHook) {
      body = '';
      req.on('data', function(data) {
        return body += data;
      });
      return req.on('end', function() {
        var obj;
        body.engineReceivedTime = (new Date()).getTime();
        obj = {
          eventname: oHook.hookname,
          body: body
        };
        if (oHook.username) {
          obj.username = oHook.username;
        }
        db.pushEvent(obj);
        return resp.send(200, JSON.stringify({
          message: "Thank you for the event: '" + oHook.hookname + "'",
          evt: obj
        }));
      });
    } else {
      return resp.send(404, "Webhook not existing!");
    }
  };
})(this);

exports.activateWebhook = (function(_this) {
  return function(user, hookid, name) {
    _this.log.info("HL | Webhook '" + hookid + "' activated");
    return _this.allowedHooks[hookid] = {
      hookname: name,
      username: user
    };
  };
})(this);

exports.deactivateWebhook = (function(_this) {
  return function(hookid) {
    _this.log.info("HL | Webhook '" + hookid + "' deactivated");
    return delete _this.allowedHooks[hookid];
  };
})(this);
