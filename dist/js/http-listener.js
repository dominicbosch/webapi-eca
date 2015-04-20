
/*

HTTP Listener
=============
> Receives the HTTP requests to the server at the given port. The requests
> (bound to a method) are then redirected to the appropriate handler which
> takes care of the request.
 */
var app, bodyParser, db, express, fs, getHandlerPath, getRemoteScripts, getScript, getTemplate, log, path, renderPage, requestHandler, session, swig;

log = require('./logging');

requestHandler = require('./request-handler');

db = require('./persistence');

path = require('path');

fs = require('fs');

express = require('express');

session = require('express-session');

bodyParser = require('body-parser');

swig = require('swig');

app = express();

renderPage = express();


/*
Initializes the request routing and starts listening on the given port.

@param {int} port
@private initRouting( *fShutDown* )
 */

exports.init = (function(_this) {
  return function(conf) {
    var arrServices, fileName, i, len, prt, server, servicePath, sess_sec, sessionMiddleware;
    requestHandler.init();
    sess_sec = "149u*y8C:@kmN/520Gt\\v'+KFBnQ!\\r<>5X/xRI`sT<Iw";
    sessionMiddleware = session({
      secret: sess_sec,
      resave: false,
      saveUninitialized: true
    });
    app.use(sessionMiddleware);
    if (conf.mode === 'productive') {
      process.on('uncaughtException', function(e) {
        log.error('This is a general exception catcher, but should really be removed in the future!');
        log.error('Error: ');
        return log.error(e);
      });
    } else {
      app.set('view cache', false);
      swig.setDefaults({
        cache: false
      });
    }
    app.engine('html', swig.renderFile);
    app.set('view engine', 'html');
    app.set('views', path.resolve(__dirname, 'views'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
      extended: true
    }));
    log.info('HL | no session backbone');
    app.get('/', function(req, res) {
      return res.render('index', req.session.pub);
    });
    app.get('/views/*', function(req, res) {
      log.info(req.params[0]);
      return res.render(req.params[0], req.session.pub);
    });
    app.use('/', express["static"](path.resolve(__dirname, '..', 'static')));
    log.info('LOADING WEB SERVICES: ');
    arrServices = fs.readdirSync(path.resolve(__dirname, 'services')).filter(function(d) {
      return d.substring(d.length - 3) === '.js';
    });
    for (i = 0, len = arrServices.length; i < len; i++) {
      fileName = arrServices[i];
      log.info('  -> ' + fileName);
      servicePath = fileName.substring(0, fileName.length - 3);
      app.use(servicePath, require(path.resolve(__dirname, 'services', fileName)));
    }
    app.get('/forge', requestHandler.handleForge);
    app.post('/admincommand', requestHandler.handleAdminCommand);
    app.post('/event', requestHandler.handleEvent);
    app.post('/webhooks/*', requestHandler.handleWebhooks);
    app.get('*', function(req, res, next) {
      var err;
      err = new Error();
      err.status = 404;
      return next(err);
    });
    app.use(function(err, req, res, next) {
      if (err.status !== 404) {
        return next();
      }
      return res.status(404).send(err.message || '** no unicorns here **');
    });
    prt = parseInt(conf['http-port']) || 8111;
    server = app.listen(prt);
    log.info("HL | Started listening on port " + prt);
    server.on('listening', function() {
      var addr;
      addr = server.address();
      if (addr.port !== conf['http-port']) {
        log.error(addr.port, conf['http-port']);
        log.error('HL | OPENED HTTP-PORT IS NOT WHAT WE WANTED!!! Shutting down!');
        return process.exit();
      }
    });
    return server.on('error', function(err) {

      /*
      		Error handling of the express port listener requires special attention,
      		thus we have to catch the error, which is issued if the port is already in use.
       */
      switch (err.errno) {
        case 'EADDRINUSE':
          log.error(err, 'HL | HTTP-PORT ALREADY IN USE!!! Shutting down!');
          break;
        case 'EACCES':
          log.error(err, 'HL | HTTP-PORT NOT ACCSESSIBLE!!! Shutting down!');
          break;
        default:
          log.error(err, 'HL | UNHANDLED SERVER ERROR!!! Shutting down!');
      }
      return process.exit();
    });
  };
})(this);


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
 */

renderPage.get = function(req, res) {
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
  return res.send(code, mustache.render(page, data));
};
