var path = require('path'),
    qs = require('querystring'),
    log = require('./logging'),
    db = require('./db_interface'),
    mm = require('./module_manager'),
    //  ### Prepare the admin command handlers that are issued via HTTP requests. ###
    objAdminCmds = {
        'loadrules': mm.loadRulesFromFS,
        'loadaction': mm.loadActionModuleFromFS,
        'loadactions':  mm.loadActionModulesFromFS,
        'loadevent': mm.loadEventModuleFromFS,
        'loadevents': mm.loadEventModulesFromFS
    };
    
exports = module.exports = function(args) {
  args = args || {};
  log(args);
  db(args);
  mm(args);
  mm.addDBLink(db);
  var users = JSON.parse(require('fs').readFileSync(path.resolve(__dirname, '..', 'config', 'users.json')));
  for(var name in users) {
    db.storeUser(users[name]);
  }
  log.print('RS', 'Initialzing module manager');
 
  return module.exports;
};

exports.addHandler = function(fShutdown) {
  objAdminCmds.shutdown = fShutdown;
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

//TODO add loadUsers as directive to admin commands
exports.loadUsers = function () {
  var users = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'users.json')));
  for(var name in users) {
    db.storeUser(users[name]);
  }
};

function onAdminCommand(request, response) {
  var q = request.query;
  log.print('HL', 'Received admin request: ' + request.originalUrl);
  if(q.cmd) {
    fAdminCommands(q, answerHandler(response));
    // answerSuccess(response, 'Thank you, we try our best!');
  } else answerError(response, 'I\'m not sure about what you want from me...');
}



  /*
  admin commands handler receives all command arguments and an answerHandler
  object that eases response handling to the HTTP request issuer.
  
  @private fAdminCommands( *args, answHandler* )
  */


function fAdminCommands(args, answHandler) {
  var fAnsw, _name;
  if (args && args.cmd) {
    if (typeof objAdminCmds[_name = args.cmd] === "function") {
      objAdminCmds[_name](args, answHandler);
    }
  } else {
    log.print('RS', 'No command in request');
  }
  /*
  The fAnsw function receives an answerHandler object as an argument when called
  and returns an anonymous function
  */

  fAnsw = function(ah) {
    /*
    The anonymous function checks whether the answerHandler was already used to
    issue an answer, if no answer was provided we answer with an error message
    */

    return function() {
      if (!ah.isAnswered()) {
        return ah.answerError('Not handled...');
      }
    };
  };
  /*
  Delayed function call of the anonymous function that checks the answer handler
  */

  return setTimeout(fAnsw(answHandler), 2000);
};


/*
###
admin commands handler receives all command arguments and an answerHandler
object that eases response handling to the HTTP request issuer.

@private fAdminCommands( *args, answHandler* )
###
fAdminCommands = (args, answHandler) ->
  if args and args.cmd 
    adminCmds[args.cmd]? args, answHandler
  else
    log.print 'RS', 'No command in request'
    
  ###
  The fAnsw function receives an answerHandler object as an argument when called
  and returns an anonymous function
  ###
  fAnsw = (ah) ->
    ###
    The anonymous function checks whether the answerHandler was already used to
    issue an answer, if no answer was provided we answer with an error message
    ###
    () ->
      if not ah.isAnswered()
        ah.answerError 'Not handled...'
        
  ###
  Delayed function call of the anonymous function that checks the answer handler
  ###
  setTimeout fAnsw(answHandler), 2000
*/
