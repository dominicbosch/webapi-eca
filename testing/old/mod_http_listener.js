
exports.testUnit_HL = function(test){
    test.ok(false, "needs implementation");
    test.done();
};

// // # HTTP Listener
// // Isso
// 'use strict';
// var express = require('express'),
    // port = express(),
    // log = require('./logging'),
    // qs = require('querystring'),
    // adminHandler, eventHandler, server;
// 
// function init(http_port, funcAdminHandler, funcEvtHandler) {
  // if(!http_port || !funcEvtHandler) {
    // log.error('HL', 'ERROR: either port or eventHandler function not defined!');
    // return;
  // }
  // adminHandler = funcAdminHandler;
  // eventHandler = funcEvtHandler;
  // // port.get('/doc*', onDocRequest);
  // port.use('/doc', express.static(__dirname + '/../doc'));
  // port.use('/doc', express.static(__dirname + '/../doc-na'));
  // port.get('/admin', onAdminCommand);
  // port.post('/pushEvents', onPushEvent);
  // server = port.listen(http_port); // inbound event channel
  // log.print('HL', 'Started listening for http requests on port ' + http_port);
// }
// 
// function answerHandler(r) {
	// var response = r, hasBeenAnswered = false;
	// function postAnswer(msg) {
		// if(!hasBeenAnswered) {
		  // response.write(msg);
		  // response.end();
		  // hasBeenAnswered = true;
		// }
	// }
	// return {
		// answerSuccess: function(msg) {
		  // if(!hasBeenAnswered) response.writeHead(200, { "Content-Type": "text/plain" });
		  // postAnswer(msg);
		// },
		// answerError: function(msg) {
  		// if(!hasBeenAnswered) response.writeHead(400, { "Content-Type": "text/plain" });
		  // postAnswer(msg);
		// },
		// isAnswered: function() { return hasBeenAnswered; }
	// };
// };
// 
// // function onDocRequest(request, response) {
  // // var pth = request.url;
  // // pth = pth.substring(4);
  // // if(pth.substring(pth.length-1) === '/') pth += 'index.html';
  // // console.log(pth);
// // }
// 
// /**
 // * Handles correct event posts, replies thank you.
 // */
// function answerSuccess(resp, msg){
  // resp.writeHead(200, { "Content-Type": "text/plain" });
  // resp.write(msg);
  // resp.end();
// }
// 
// /**
 // * Handles erroneous requests.
 // * @param {Object} msg the error message to be returned
 // */
// function answerError(resp, msg) {
  // resp.writeHead(400, { "Content-Type": "text/plain" });
  // resp.write(msg);
  // resp.end();
// }
// 
// //FIXME this answer handling is a very ugly hack, improve!
// function onAdminCommand(request, response) {
  // var q = request.query;
  // log.print('HL', 'Received admin request: ' + request.originalUrl);
  // if(q.cmd) {
    // adminHandler(q, answerHandler(response));
    // // answerSuccess(response, 'Thank you, we try our best!');
  // } else answerError(response, 'I\'m not sure about what you want from me...');
// }
//   
// /**
 // * If a request is made to the server, this function is used to handle it.
 // */
// function onPushEvent(request, response) {
  // var body = '';
  // request.on('data', function (data) { body += data; });
  // request.on('end', function () {
    // var obj = qs.parse(body);
    // /* If required event properties are present we process the event */
    // if(obj && obj.event && obj.eventid){
      // answerSuccess(response, 'Thank you for the event (' + obj.event + '[' + obj.eventid + '])!');
      // eventHandler(obj);
    // } else answerError(response, 'Your event was missing important parameters!');
  // });
// }
// 
// exports.init = init;
// exports.shutDown = function() {
  // log.print('HL', 'Shutting down HTTP listener');
  // process.exit(); // This is a bit brute force...
// };
