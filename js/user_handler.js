var path = require('path'),
    qs = require('querystring'),
    log = require('./logging'),
    db = require('./db_interface'),
    adminHandler;
    
exports = module.exports = function(args) {
  args = args || {};
  log(args);
  db(args);
  var users = JSON.parse(require('fs').readFileSync(path.resolve(__dirname, '..', 'config', 'users.json')));
  for(var name in users) {
    db.storeUser(users[name]);
  }
 
  return module.exports;
};

exports.addHandler = function(adminHandl) {
  adminHandler = adminHandl;
};

exports.handleRequest = function(req, resp) {
  req.on('end', function () {
    resp.end();
  });
  if(req.session && req.session.user) {
    resp.send('You\'re logged in');
  } else resp.sendfile(path.resolve(__dirname, '..', 'webpages', 'handlers', 'login.html'));
  // resp.end();
  log.print('UH', 'last: '+ req.session.lastPage);
  req.session.lastPage = req.originalUrl;
  log.print('UH', 'last: '+ req.session.lastPage);
  log.print('UH', 'retrieved req: '+ req.originalUrl);
  // console.log(req);
};

exports.handleLogin = function(req, resp) {
  var body = '';
  req.on('data', function (data) { body += data; });
  req.on('end', function () {
    if(!req.session || !req.session.user) {
      var obj = qs.parse(body);
      db.loginUser(obj.username, obj.password, function(err, obj) {
        if(!err) req.session.user = obj;
        if(req.session.user) {
          resp.write('Welcome ' + req.session.user.name + '!');
        } else {
          resp.writeHead(401, { "Content-Type": "text/plain" });
          resp.write('Login failed!');
        }
        resp.end();
      });
    }
  });
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

function onAdminCommand(request, response) {
  var q = request.query;
  log.print('HL', 'Received admin request: ' + request.originalUrl);
  if(q.cmd) {
    adminHandler(q, answerHandler(response));
    // answerSuccess(response, 'Thank you, we try our best!');
  } else answerError(response, 'I\'m not sure about what you want from me...');
}
  
