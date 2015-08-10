
/*

WebAPI-ECA Engine
=================

>This is the main module that is used to run the whole application:
>
>     node webapi-eca [opt]
>
> See below in the optimist CLI preparation for allowed optional parameters `[opt]`.
 */
var argv, cm, conf, cp, db, e, encryption, engine, fs, http, init, log, nameEP, opt, optimist, path, shutDown, usage;

log = require('./logging');

conf = require('./config');

db = require('./persistence');

cm = require('./components-manager');

engine = require('./engine');

http = require('./http-listener');

encryption = require('./encryption');

nameEP = 'trigger-poller';

fs = require('fs');

path = require('path');

cp = require('child_process');

optimist = require('optimist');


/*
Let's prepare the optimist CLI optional arguments `[opt]`:
 */

usage = 'This runs your webapi-based ECA engine';

opt = {
  'h': {
    alias: 'help',
    describe: 'Display this'
  },
  'c': {
    alias: 'config-path',
    describe: 'Specify a path to a custom configuration file, other than "config/config.json"'
  },
  'w': {
    alias: 'http-port',
    describe: 'Specify a HTTP port for the web server'
  },
  'd': {
    alias: 'db-port',
    describe: 'Specify a port for the redis DB'
  },
  's': {
    alias: 'db-select',
    describe: 'Specify a database identifier'
  },
  'm': {
    alias: 'mode',
    describe: 'Specify a run mode: [development|productive]'
  },
  'i': {
    alias: 'log-std-level',
    describe: 'Specify the log level for the standard I/O'
  },
  'f': {
    alias: 'log-file-level',
    describe: 'Specify the log level for the log file'
  },
  'p': {
    alias: 'log-file-path',
    describe: 'Specify the path to the log file within the "logs" folder'
  },
  't': {
    alias: 'log-trace',
    describe: 'Whether full tracing should be enabled [on|off]. do not use in productive mode.'
  },
  'n': {
    alias: 'nolog',
    describe: 'Set this if no output shall be generated'
  }
};

argv = optimist.usage(usage).options(opt).argv;

if (argv.help) {
  console.log(optimist.help());
  process.exit();
}

conf.init(argv.c);

if (!conf.isInit) {
  console.error('FAIL: Config file not ready! Shutting down...');
  process.exit();
}

conf['http-port'] = parseInt(argv.w || conf['http-port'] || 8125);

conf['db-port'] = parseInt(argv.d || conf['db-port'] || 6379);

conf['db-select'] = parseInt(argv.s || conf['db-select'] || 0);

if (!conf.log) {
  conf.log = {};
}

conf.mode = argv.m || conf.mode || 'productive';

conf.log['std-level'] = argv.i || conf.log['std-level'] || 'error';

conf.log['file-level'] = argv.f || conf.log['file-level'] || 'warn';

conf.log['file-path'] = argv.p || conf.log['file-path'] || 'warn';

conf.log.trace = argv.t || conf.log.trace || 'off';

conf.log.nolog = argv.n || conf.log.nolog;

if (!conf.log.nolog) {
  try {
    fs.writeFileSync(path.resolve(conf.log['file-path']), ' ');
  } catch (_error) {
    e = _error;
    console.log(e);
  }
}

log.init(conf);

log.info('RS | STARTING SERVER');


/*
This function is invoked right after the module is loaded and starts the server.

@private init()
 */

init = (function(_this) {
  return function() {
    encryption.init(conf['keygenpp']);
    log.info('RS | Initialzing DB');
    db.init(conf['db-port']);
    return db.isConnected(function(err) {
      var pathUsers, poller, users;
      db.selectDatabase(conf['db-select']);
      if (err) {
        log.error('RS | No DB connection, shutting down system!');
        return shutDown();
      } else {
        log.info('RS | Initialzing Users');
        pathUsers = path.resolve(__dirname, '..', 'config', 'users.json');
        users = JSON.parse(fs.readFileSync(pathUsers, 'utf8'));
        db.getUserIds(function(err, arrUserIds) {
          var oUser, results, username;
          results = [];
          for (username in users) {
            oUser = users[username];
            if (arrUserIds.indexOf(username) === -1) {
              oUser.username = username;
              results.push(db.storeUser(oUser));
            } else {
              results.push(void 0);
            }
          }
          return results;
        });
        log.info('RS | Forking a child process for the trigger poller');
        poller = cp.fork(path.resolve(__dirname, nameEP));
        poller.send({
          intevent: 'startup',
          data: conf
        });
        fs.unlink('proc.pid', function(err) {
          if (err) {
            console.log(err);
          }
          return fs.writeFile('proc.pid', 'PROCESS PID: ' + process.pid + '\nCHILD PID: ' + poller.pid + '\n');
        });
        log.info('RS | Initialzing module manager');
        cm.addRuleListener(engine.internalEvent);
        cm.addRuleListener(function(evt) {
          return poller.send(evt);
        });
        log.info('RS | Initialzing http listener');
        return http.init(conf);
      }
    });
  };
})(this);


/*
Shuts down the server.

@private shutDown()
 */

shutDown = (function(_this) {
  return function() {
    log.warn('RS | Received shut down command!');
    if (db != null) {
      db.shutDown();
    }
    engine.shutDown();
    return process.exit();
  };
})(this);


/*
## Process Commands

When the server is run as a child process, this function handles messages
from the parent process (e.g. the testing suite)
 */

process.on('message', function(cmd) {
  if (cmd === 'die') {
    log.warn('RS | GOT DIE COMMAND');
    return shutDown();
  }
});

process.on('SIGINT', function() {
  log.warn('RS | GOT SIGINT');
  return shutDown();
});

process.on('SIGTERM', function() {
  log.warn('RS | GOT SIGTERM');
  return shutDown();
});

init();
