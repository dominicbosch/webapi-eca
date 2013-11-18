// HTTP Listener
// =============
//
// Handles the HTTP requests to the server at the port specified by the [config](config.html) file.

'use strict';

var path = require('path'),
    express = require('express'),
    app = express(),
    RedisStore = require('connect-redis')(express),
    qs = require('querystring'),
    log = require('./logging'),
    sess_sec = '#C[>;j`@".TXm2TA;A2Tg)',
    db_port, http_port, server,
    eventHandler, userHandler;

/*
 * The module needs to be called as a function to initialize it.
 * After that it fetches the http\_port, db\_port & sess\_sec properties
 * from the configuration file.
 */
exports = module.exports = function(args) {
  args = args || {};
  log(args);
  var config = require('./config')(args);
  userHandler = require('./user_handler')(args);
  db_port = config.getDBPort(),
  sess_sec = config.getSessionSecret(),
  http_port = config.getHttpPort();
  return module.exports;
};

exports.addHandlers = function(funcAdminHandler, funcEvtHandler) {
  if(!funcAdminHandler || !funcEvtHandler) {
    log.error('HL', 'ERROR: either adminHandler or eventHandler function not defined!');
    return;
  }
  userHandler.addHandler(funcAdminHandler);
  eventHandler = funcEvtHandler;
  // Add cookie support for session handling.
  app.use(express.cookieParser());
  app.use(express.session({secret: sess_sec}));
  log.print('HL', 'no session backbone');
  
  // ^ TODO figure out why redis backbone doesn't work. eventually the db pass has to be set in the DB?
  // } session information seems to be stored in DB but not retrieved correctly
  // } if(db_port) {
    // } app.use(express.session({
      // } store: new RedisStore({
        // } host: 'localhost',
        // } port: db_port,
        // } db: 2
        // } ,
        // } pass: null
      // } }),
      // } secret: sess_sec
    // } }));
    // } log.print('HL', 'Added redis DB as session backbone'); 
  // } } else {
    // } app.use(express.session({secret: sess_sec}));
    // } log.print('HL', 'no session backbone');
  // } }

  // Redirect the requests to the appropriate handler.
  app.use('/', express.static(path.resolve(__dirname, '..', 'webpages')));
  // app.use('/doc/', express.static(path.resolve(__dirname, '..', 'webpages', 'doc')));
  // app.get('/mobile', userHandler.handleRequest);
  app.get('/rulesforge', userHandler.handleRequest);
  // app.use('/mobile', express.static(path.resolve(__dirname, '..', 'webpages', 'mobile')));
  // } app.use('/rulesforge/', express.static(path.resolve(__dirname, '..', 'webpages', 'rulesforge')));
  app.get('/admin', userHandler.handleRequest);
  app.post('/login', userHandler.handleLogin);
  app.post('/push_event', onPushEvent);
  try {
    if(http_port) server = app.listen(http_port); // inbound event channel
    else log.error('HL', new Error('No HTTP port found!? Nothing to listen on!...'));
  } catch(e) {
    e.addInfo = 'port unavailable';
    log.error(e);
    funcAdminHandler({cmd: 'shutdown'});
  }
};

/**
 * If a post request reaches the server, this function handles it and treats the request as a possible event.
 */
function onPushEvent(req, resp) {
  var body = '';
  req.on('data', function (data) { body += data; });
  req.on('end', function () {
    var obj = qs.parse(body);
    /* If required event properties are present we process the event */
    if(obj && obj.event && obj.eventid){
      resp.writeHead(200, { "Content-Type": "text/plain" });
      resp.write('Thank you for the event (' + obj.event + '[' + obj.eventid + '])!');
      eventHandler(obj);
    } else {
      resp.writeHead(400, { "Content-Type": "text/plain" });
      resp.write('Your event was missing important parameters!');
    }
    resp.end();
  });
}

exports.loadUsers = function() {
  var users = JSON.parse(require('fs').readFileSync(path.resolve(__dirname, '..', relPath)));
  for(var name in users) {
    
  }
};

exports.shutDown = function() {
  log.print('HL', 'Shutting down HTTP listener');
  process.exit(); // This is a bit brute force...
};
