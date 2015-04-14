
/*

HTTP Listener
=============
> Receives the HTTP requests to the server at the given port. The requests
> (bound to a method) are then redirected to the appropriate handler which
> takes care of the request.
 */
var app, bodyParser, db, exports, express, initRouting, log, path, requestHandler, serveAdmin, serveCodePlugins, serveRules, serveSession, serveWebhooks, session;

log = require('./logging');

requestHandler = require('./request-handler');

db = require('./persistence');

serveSession = require('./serve-session');

serveRules = require('./serve-rules');

serveWebhooks = require('./serve-webhooks');

serveCodePlugins = require('./serve-codeplugins');

serveAdmin = require('./serve-admin');

path = require('path');

express = require('express');

session = require('express-session');

bodyParser = require('body-parser');

app = express();


/*
Module call
-----------
Initializes the HTTP listener and its request handler.

@param {Object} args
 */

exports = module.exports;

exports.init = (function(_this) {
  return function(args) {
    _this.shutDownSystem = args['shutdown-function'];
    requestHandler.init(args);
    return initRouting(args['http-port']);
  };
})(this);


/*
Initializes the request routing and starts listening on the given port.

@param {int} port
@private initRouting( *fShutDown* )
 */

initRouting = (function(_this) {
  return function(port) {
    var prt, server, sess_sec, sessionMiddleware;
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
    app.use('/', express["static"](path.resolve(__dirname, '..', 'webpages', 'public')));
    app.get('/admin', requestHandler.handleAdmin);
    app.get('/forge', requestHandler.handleForge);
    app.use('/session', serveSession);
    app.use('/rules', serveRules);
    app.use('/webhooks', serveWebhooks);
    app.use('/codeplugin', serveCodePlugins);
    app.use('/admin', serveAdmin);
    app.post('/admincommand', requestHandler.handleAdminCommand);
    app.post('/event', requestHandler.handleEvent);
    app.post('/webhooks/*', requestHandler.handleWebhooks);
    prt = parseInt(port) || 8111;
    server = app.listen(prt);
    log.info("HL | Started listening on port " + prt);
    server.on('listening', function() {
      var addr;
      addr = server.address();
      if (addr.port !== port) {
        return _this.shutDownSystem();
      }
    });
    return server.on('error', function(err) {

      /*
      		Error handling of the express port listener requires special attention,
      		thus we have to catch the error, which is issued if the port is already in use.
       */
      switch (err.errno) {
        case 'EADDRINUSE':
          log.error(err, 'HL | http-port already in use, shutting down!');
          break;
        case 'EACCES':
          log.error(err, 'HL | http-port not accessible, shutting down!');
          break;
        default:
          log.error(err, 'HL | Error in server, shutting down!');
      }
      return _this.shutDownSystem();
    });
  };
})(this);
