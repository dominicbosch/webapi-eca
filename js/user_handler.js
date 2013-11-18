
var log = require('./logging'),
    db = require('./db_interface'), adminHandler;
    
exports = module.exports = function(args) {
  args = args || {};
  log(args);
  db(args);
  return module.exports;
};

exports.addHandler = function(adminHandl) {
  adminHandler = adminHandl;
};

exports.handleRequest = function(req, resp) {
  req.on('end', function () {
    resp.end();
  });
  if(req.session && req.session.lastPage) resp.send('You visited last: ' + req.session.lastPage);
  else resp.send('You are new!');
  // resp.end();
  log.print('UH', 'last: '+ req.session.lastPage);
  req.session.lastPage = req.originalUrl;
  log.print('UH', 'last: '+ req.session.lastPage);
  log.print('UH', 'retrieved req: '+ req.originalUrl);
  // console.log(req);
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

//FIXME this answer handling is a very ugly hack, improve!
function onAdminCommand(request, response) {
  var q = request.query;
  log.print('HL', 'Received admin request: ' + request.originalUrl);
  if(q.cmd) {
    adminHandler(q, answerHandler(response));
    // answerSuccess(response, 'Thank you, we try our best!');
  } else answerError(response, 'I\'m not sure about what you want from me...');
}
  
