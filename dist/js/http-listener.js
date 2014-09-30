
/*

HTTP Listener
=============
> Receives the HTTP requests to the server at the given port. The requests
> (bound to a method) are then redirected to the appropriate handler which
> takes care of the request.
 */
var app, db, exports, express, initRouting, path, qs, requestHandler;

requestHandler = require('./request-handler');

db = require('./persistence');

path = require('path');

qs = require('querystring');

express = require('express');

app = express();


/*
Module call
-----------
Initializes the HTTP listener and its request handler.

@param {Object} args
 */

exports = module.exports = (function(_this) {
  return function(args) {
    _this.log = args.logger;
    _this.arrWebhooks = args.webhooks;
    _this.shutDownSystem = args['shutdown-function'];
    requestHandler(args);
    initRouting(args['http-port']);
    return module.exports;
  };
})(this);


/*
Initializes the request routing and starts listening on the given port.

@param {int} port
@private initRouting( *fShutDown* )
 */

initRouting = (function(_this) {
  return function(port) {
    var prt, server, sess_sec;
    app.use(express.cookieParser());
    sess_sec = "149u*y8C:@kmN/520Gt\\v'+KFBnQ!\\r<>5X/xRI`sT<Iw";
    app.use(express.session({
      secret: sess_sec
    }));
    _this.log.info('HL | no session backbone');
    app.use('/', express["static"](path.resolve(__dirname, '..', 'webpages', 'public')));
    app.get('/admin', requestHandler.handleAdmin);
    app.get('/forge', requestHandler.handleForge);
    app.post('/login', requestHandler.handleLogin);
    app.post('/logout', requestHandler.handleLogout);
    app.post('/usercommand', requestHandler.handleUserCommand);
    app.post('/admincommand', requestHandler.handleAdminCommand);
    app.post('/event', requestHandler.handleEvent);
    app.post('/webhooks/*', requestHandler.handleWebhooks);
    app.post('/measurements', requestHandler.handleMeasurements);
    prt = parseInt(port) || 8111;
    server = app.listen(prt);
    _this.log.info("HL | Started listening on port " + prt);
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
          _this.log.error(err, 'HL | http-port already in use, shutting down!');
          break;
        case 'EACCES':
          _this.log.error(err, 'HL | http-port not accessible, shutting down!');
          break;
        default:
          _this.log.error(err, 'HL | Error in server, shutting down!');
      }
      return _this.shutDownSystem();
    });
  };
})(this);
