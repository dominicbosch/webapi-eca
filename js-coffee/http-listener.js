// Generated by CoffeeScript 1.6.3
/*

HTTP Listener
=============
> Receives the HTTP requests to the server at the given port. The requests
> (bound to a method) are then redirected to the appropriate handler which
> takes care of the request.
*/


(function() {
  var app, exports, express, initRouting, log, path, qs, requestHandler;

  log = require('./logging');

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
    args = args != null ? args : {};
    log(args);
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
    var e, sess_sec;
    app.use(express.cookieParser());
    sess_sec = "149u*y8C:@kmN/520Gt\\v'+KFBnQ!\\r<>5X/xRI`sT<Iw";
    app.use(express.session({
      secret: sess_sec
    }));
    log.print('HL', 'no session backbone');
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
      return app.listen(port);
    } catch (_error) {
      e = _error;
      e.addInfo = 'opening port';
      return log.error(e);
    }
  };

  /*
  Adds the shutdown handler to the admin commands.
  
  @param {function} fshutDown
  @public addShutdownHandler( *fShutDown* )
  */


  exports.addShutdownHandler = function(fShutDown) {
    return requestHandler.addShutdownHandler(fShutDown);
  };

  /*
  Shuts down the http listener.
  
  @public shutDown()
  */


  exports.shutDown = function() {
    log.print('HL', 'Shutting down HTTP listener');
    return process.exit();
  };

}).call(this);