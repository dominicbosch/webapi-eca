
/*

Request Handler
============
> The request handler (surprisingly) handles requests made through HTTP to
> the [HTTP Listener](http-listener.html). It will handle user requests for
> pages as well as POST requests such as user login, module storing, event
> invocation and also admin commands.
 */
var crypto, db, dirHandlers, exports, fs, getHandlerPath, getRemoteScripts, getScript, getTemplate, mustache, path, pathUsers, renderPage;

db = require('./persistence');

fs = require('fs');

path = require('path');

mustache = require('mustache');

crypto = require('crypto-js');

pathUsers = path.resolve(__dirname, '..', 'config', 'users.json');

dirHandlers = path.resolve(__dirname, '..', 'webpages', 'handlers');

exports = module.exports = (function(_this) {
  return function(args) {
    var fStoreUser, oUser, user, users;
    _this.log = args.logger;
    _this.objAdminCmds = {
      shutdown: function(obj, cb) {
        var data;
        data = {
          code: 200,
          message: 'Shutting down... BYE!'
        };
        setTimeout(args['shutdown-function'], 500);
        return cb(null, data);
      },
      newuser: function(obj, cb) {
        var data, err, fPersistNewUser, oUser, roles;
        data = {
          code: 200,
          message: 'User stored thank you!'
        };
        if (obj.username && obj.password) {
          if (obj.roles) {
            try {
              roles = JSON.parse(obj.roles);
            } catch (_error) {
              err = _error;
              this.log('RH | error parsing newuser roles: ' + err.message);
              roles = [];
            }
          } else {
            roles = [];
          }
          oUser = {
            username: obj.username,
            password: obj.password,
            roles: roles
          };
          db.storeUser(oUser);
          fPersistNewUser = function(username, password, roles) {
            return function(err, data) {
              var users;
              users = JSON.parse(data);
              users[username] = {
                password: password,
                roles: roles
              };
              return fs.writeFile(pathUsers, JSON.stringify(users, void 0, 2), 'utf8', function(err) {
                if (err) {
                  this.log.error("RH | Unable to write new user file! ");
                  return this.log.error(err);
                }
              });
            };
          };
          fs.readFile(pathUsers, 'utf8', fPersistNewUser(obj.username, obj.password, roles));
        } else {
          data.code = 401;
          data.message = 'Missing parameter for this command';
        }
        return cb(null, data);
      }
    };
    users = JSON.parse(fs.readFileSync(pathUsers, 'utf8'));
    fStoreUser = function(username, oUser) {
      oUser.username = username;
      return db.storeUser(oUser);
    };
    for (user in users) {
      oUser = users[user];
      fStoreUser(user, oUser);
    }
    _this.allowedHooks = {};
    db.getAllWebhooks(function(err, oHooks) {
      if (oHooks) {
        _this.log.info("RH | Initializing " + (Object.keys(oHooks).length) + " Webhooks");
        return _this.allowedHooks = oHooks;
      }
    });
    return module.exports;
  };
})(this);


/*
Handles possible events that were posted to this server and pushes them into the
event queue.
@public handleEvent( *req, resp* )
 */

exports.handleEvent = function(req, resp) {
  var body;
  body = '';
  req.on('data', function(data) {
    return body += data;
  });
  return req.on('end', function() {
    var answ, err, obj;
    try {
      obj = JSON.parse(body);
    } catch (_error) {
      err = _error;
      resp.send(400, 'Badly formed event!');
    }
    if (obj && obj.eventname && !err) {
      answ = {
        code: 200,
        message: "Thank you for the event: " + obj.eventname
      };
      resp.send(answ.code, answ);
      return db.pushEvent(obj);
    } else {
      return resp.send(400, 'Your event was missing important parameters!');
    }
  });
};


/*
Associates the user object with the session if login is successful.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleLogin( *req, resp* )
 */

exports.handleLogin = (function(_this) {
  return function(req, resp) {
    var body;
    body = '';
    req.on('data', function(data) {
      return body += data;
    });
    return req.on('end', function() {
      var obj;
      obj = JSON.parse(body);
      return db.loginUser(obj.username, obj.password, function(err, usr) {
        if (err) {
          _this.log.warn("RH | AUTH-UH-OH ( " + obj.username + " ): " + err.message);
        } else {
          req.session.user = usr;
        }
        if (req.session.user) {
          return resp.send('OK!');
        } else {
          return resp.send(401, 'NO!');
        }
      });
    });
  };
})(this);


/*
A post request retrieved on this handler causes the user object to be
purged from the session, thus the user will be logged out.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleLogout( *req, resp* )
 */

exports.handleLogout = function(req, resp) {
  if (req.session) {
    req.session.user = null;
    return resp.send('Bye!');
  }
};


/*
Resolves the path to a handler webpage.

@private getHandlerPath( *name* )
@param {String} name
 */

getHandlerPath = function(name) {
  return path.join(dirHandlers, name + '.html');
};


/*
Fetches a template.

@private getTemplate( *name* )
@param {String} name
 */

getTemplate = function(name) {
  var pth;
  pth = path.join(dirHandlers, 'templates', name + '.html');
  return fs.readFileSync(pth, 'utf8');
};


/*
Fetches a script.

@private getScript( *name* )
@param {String} name
 */

getScript = function(name) {
  var pth;
  pth = path.join(dirHandlers, 'js', name + '.js');
  return fs.readFileSync(pth, 'utf8');
};


/*
Fetches remote scripts snippets.

@private getRemoteScripts( *name* )
@param {String} name
 */

getRemoteScripts = function(name) {
  var pth;
  pth = path.join(dirHandlers, 'remote-scripts', name + '.html');
  return fs.readFileSync(pth, 'utf8');
};


/*
Renders a page, with helps of mustache, depending on the user session and returns it.

@private renderPage( *name, sess, msg* )
@param {String} name
@param {Object} sess
@param {Object} msg
 */

renderPage = function(name, req, resp, msg) {
  var code, content, data, err, menubar, page, pageElements, pathSkel, remote_scripts, script, skeleton;
  pathSkel = path.join(dirHandlers, 'skeleton.html');
  skeleton = fs.readFileSync(pathSkel, 'utf8');
  code = 200;
  data = {
    message: msg,
    user: req.session.user
  };
  try {
    script = getScript(name);
  } catch (_error) {}
  try {
    remote_scripts = getRemoteScripts(name);
  } catch (_error) {}
  try {
    content = getTemplate(name);
  } catch (_error) {
    err = _error;
    content = getTemplate('error');
    script = getScript('error');
    code = 404;
    data.message = 'Invalid Page!';
  }
  if (req.session.user) {
    menubar = getTemplate('menubar');
  }
  pageElements = {
    content: content,
    script: script,
    remote_scripts: remote_scripts,
    menubar: menubar
  };
  page = mustache.render(skeleton, pageElements);
  return resp.send(code, mustache.render(page, data));
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
Present the admin console to the user if he's allowed to see it.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleForge( *req, resp* )
 */

exports.handleAdmin = function(req, resp) {
  var msg, page;
  if (!req.session.user) {
    page = 'login';
  } else if (req.session.user.roles.indexOf("admin") === -1) {
    page = 'login';
    msg = 'You need to be admin for this page!';
  } else {
    page = 'admin';
  }
  return renderPage(page, req, resp, msg);
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
    if (req.session && req.session.user && req.session.user.roles.indexOf("admin") > -1) {
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
