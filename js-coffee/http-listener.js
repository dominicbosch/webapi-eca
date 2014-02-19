// Generated by CoffeeScript 1.6.3
/*

HTTP Listener
=============
> Receives the HTTP requests to the server at the given port. The requests
> (bound to a method) are then redirected to the appropriate handler which
> takes care of the request.
*/


(function() {
  var app, exports, express, initRouting, path, qs, requestHandler,
    _this = this;

  requestHandler = require('./request-handler');

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


  exports = module.exports = function(args) {
    _this.log = args.logger;
    requestHandler(args);
    initRouting(args['http-port']);
    return module.exports;
  };

  /*
  Initializes the request routing and starts listening on the given port.
  
  @param {int} port
  @private initRouting( *fShutDown* )
  */


  initRouting = function(port) {
    var server, sess_sec;
    app.use(express.cookieParser());
    sess_sec = "149u*y8C:@kmN/520Gt\\v'+KFBnQ!\\r<>5X/xRI`sT<Iw";
    app.use(express.session({
      secret: sess_sec
    }));
    _this.log.info('HL | no session backbone');
    app.use('/', express["static"](path.resolve(__dirname, '..', 'webpages', 'public')));
    app.get('/admin', requestHandler.handleAdmin);
    app.get('/forge_modules', requestHandler.handleForgeModules);
    app.get('/forge_rules', requestHandler.handleForgeRules);
    app.get('/invoke_event', requestHandler.handleInvokeEvent);
    app.post('/event', requestHandler.handleEvent);
    app.post('/login', requestHandler.handleLogin);
    app.post('/logout', requestHandler.handleLogout);
    app.post('/usercommand', requestHandler.handleUserCommand);
    try {
      server = app.listen(parseInt(port) || 8125);
      /*
      Error handling of the express port listener requires special attention,
      thus we have to catch the error, which is issued if the port is already in use.
      */

      server.on('listening', function() {
        var addr;
        addr = server.address();
        if (addr.port === !port) {
          return _this.shutDownSystem();
        }
      });
      return server.on('error', function(err) {
        if (err.errno === 'EADDRINUSE') {
          _this.log.error(err, 'HL | http-port already in use, shutting down!');
          return _this.shutDownSystem();
        }
      });
    } catch (_error) {}
  };

  /*
  Adds the shutdown handler to the admin commands.
  
  @param {function} fshutDown
  @public addShutdownHandler( *fShutDown* )
  */


  exports.addShutdownHandler = function(fShutDown) {
    _this.shutDownSystem = fShutDown;
    return requestHandler.addShutdownHandler(fShutDown);
  };

}).call(this);
