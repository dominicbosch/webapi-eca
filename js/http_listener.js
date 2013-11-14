// # HTTP Listener
// Isso
'use strict';

var path = require('path'),
    express = require('express'),
    app = express(),
    RedisStore = require('connect-redis')(express),
    qs = require('querystring'),
    log = require('./logging'),
    sess_sec = '#C[>;j`@".TXm2TA;A2Tg)',
    db_port, http_port, server,
    adminHandler, eventHandler;

exports = module.exports = function(args) {
  args = args || {};
  log(args);
  var config = require('./config')(args);
  db_port = config.getDBPort(),
  sess_sec = config.getSessionSecret(),
  http_port = config.getHttpPort();
  return module.exports;
};

exports.addHandlers = function(funcAdminHandler, funcEvtHandler) {
  if(!funcEvtHandler) {
    log.error('HL', 'ERROR: either port or eventHandler function not defined!');
    return;
  }
  adminHandler = funcAdminHandler;
  eventHandler = funcEvtHandler;

//FIXME this whole webserver requires clean approach together with session handling all over the engine.
//One entry point, from then collecting response contents and one exit point that sends it!

  app.use(express.cookieParser());
  app.use('/doc/', express.static(path.resolve(__dirname, '..', 'webpages', 'doc')));
  app.use('/mobile/', express.static(path.resolve(__dirname, '..', 'webpages', 'mobile')));
  app.use('/rulesforge/', express.static(path.resolve(__dirname, '..', 'webpages', 'rulesforge')));
  app.get('/admin', onAdminCommand);
  app.post('/pushEvents', onPushEvent);
  if(db_port) {
    app.use(express.session({
      store: new RedisStore({
        host: 'localhost',
        port: db_port,
        db: 2
        // ,
        // pass: 'RedisPASS'
      }),
      // FIXME use a secret from config
      secret: sess_sec
    }));
    log.print('HL', 'Added redis DB as session backbone'); 
  } else {
    app.use(express.session({secret: sess_sec}));
    log.print('HL', 'no session backbone');
  }
  if(http_port) server = app.listen(http_port); // inbound event channel
  else log.error('HL', new Error('No HTTP port found!?'));
};

function answerHandler(r) {
	var response = r, hasBeenAnswered = false;
	function postAnswer(msg) {
		if(!hasBeenAnswered) {
		  response.write(msg);
		  response.end();
		  hasBeenAnswered = true;
		}
	}
	return {
		answerSuccess: function(msg) {
		  if(!hasBeenAnswered) response.writeHead(200, { "Content-Type": "text/plain" });
		  postAnswer(msg);
		},
		answerError: function(msg) {
  		if(!hasBeenAnswered) response.writeHead(400, { "Content-Type": "text/plain" });
		  postAnswer(msg);
		},
		isAnswered: function() { return hasBeenAnswered; }
	};
};

/**
 * Handles correct event posts, replies thank you.
 */
function answerSuccess(resp, msg){
  resp.writeHead(200, { "Content-Type": "text/plain" });
  resp.write(msg);
  resp.end();
}

/**
 * Handles erroneous requests.
 * @param {Object} msg the error message to be returned
 */
function answerError(resp, msg) {
  resp.writeHead(400, { "Content-Type": "text/plain" });
  resp.write(msg);
  resp.end();
}

//FIXME this answer handling is a very ugly hack, improve!
function onAdminCommand(request, response) {
  var q = request.query;
  log.print('HL', 'Received admin request: ' + request.originalUrl);
  if(q.cmd) {
    adminHandler(q, answerHandler(response));
    // answerSuccess(response, 'Thank you, we try our best!');
  } else answerError(response, 'I\'m not sure about what you want from me...');
}
  
/**
 * If a request is made to the server, this function is used to handle it.
 */
function onPushEvent(request, response) {
  var body = '';
  request.on('data', function (data) { body += data; });
  request.on('end', function () {
    var obj = qs.parse(body);
    /* If required event properties are present we process the event */
    if(obj && obj.event && obj.eventid){
      answerSuccess(response, 'Thank you for the event (' + obj.event + '[' + obj.eventid + '])!');
      eventHandler(obj);
    } else answerError(response, 'Your event was missing important parameters!');
  });
}

exports.shutDown = function() {
  log.print('HL', 'Shutting down HTTP listener');
  process.exit(); // This is a bit brute force...
};
