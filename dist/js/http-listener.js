
/*

HTTP Listener
=============
> Receives the HTTP requests to the server at the given port. The requests
> (bound to a method) are then redirected to the appropriate handler which
> takes care of the request.
 */
var app, bodyParser, db, express, fs, log, path, requestHandler, session, swig;

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


/*
Initializes the request routing and starts listening on the given port.
 */

exports.init = (function(_this) {
  return function(conf) {
    var arrServices, fileName, i, len, prt, server, servicePath, sess_sec, sessionMiddleware;
    requestHandler.init();
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
    app.set('views', __dirname + '/views');
    sess_sec = "149u*y8C:@kmN/520Gt\\v'+KFBnQ!\\r<>5X/xRI`sT<Iw";
    sessionMiddleware = session({
      secret: sess_sec,
      resave: false,
      saveUninitialized: true
    });
    app.use(sessionMiddleware);
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
      extended: true
    }));
    log.info('HL | no session backbone');
    app.get('/', function(req, res) {
      return res.render('index', req.session.pub);
    });
    app.use('/', express["static"](path.resolve(__dirname, '..', 'static')));
    app.get('/views/*', function(req, res) {
      if (req.session.pub || req.params[0] === 'login') {
        if (req.params[0] === 'admin' && req.session.pub.roles.indexOf('admin') === -1) {
          return res.render('401_admin');
        } else {
          return res.render(req.params[0], req.session.pub);
        }
      } else {
        return res.render('401');
      }
    });
    log.info('LOADING WEB SERVICES: ');
    arrServices = fs.readdirSync(path.resolve(__dirname, 'services')).filter(function(d) {
      return d.substring(d.length - 3) === '.js';
    });
    for (i = 0, len = arrServices.length; i < len; i++) {
      fileName = arrServices[i];
      log.info('  -> ' + fileName);
      servicePath = fileName.substring(0, fileName.length - 3);
      app.use('/service/' + servicePath, require(path.resolve(__dirname, 'services', fileName)));
    }
    app.get('*', function(req, res, next) {
      var err;
      err = new Error();
      err.status = 404;
      return next(err);
    });
    app.use(function(err, req, res, next) {
      res.status(404);
      return res.render('404');
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
