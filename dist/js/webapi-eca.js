
/*

WebAPI-ECA Engine
=================

>This is the main module that is used to run the whole application:
>
>     node webapi-eca [opt]
>
> See below in the optimist CLI preparation for allowed optional parameters `[opt]`.
 */
var argv, cm, conf, cp, db, encryption, engine, fs, http, init, logconf, logger, nameEP, opt, optimist, path, procCmds, shutDown, usage;

logger = require('./logging');

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

procCmds = {};


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
    alias: 'log-mode',
    describe: 'Specify a log mode: [development|productive]'
  },
  'i': {
    alias: 'log-io-level',
    describe: 'Specify the log level for the I/O'
  },
  'f': {
    alias: 'log-file-level',
    describe: 'Specify the log level for the log file'
  },
  'p': {
    alias: 'log-file-path',
    describe: 'Specify the path to the log file within the "logs" folder'
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

conf(argv.c);

if (!conf.isReady()) {
  console.error('FAIL: Config file not ready! Shutting down...');
  process.exit();
}

logconf = conf.getLogConf();

if (argv.m) {
  logconf['mode'] = argv.m;
}

if (argv.i) {
  logconf['io-level'] = argv.i;
}

if (argv.f) {
  logconf['file-level'] = argv.f;
}

if (argv.p) {
  logconf['file-path'] = argv.p;
}

if (argv.n) {
  logconf['nolog'] = true;
}

try {
  fs.unlinkSync(path.resolve(__dirname, '..', 'logs', logconf['file-path']));
} catch (_error) {}

this.log = logger.getLogger(logconf);

this.log.info('RS | STARTING SERVER');


/*
This function is invoked right after the module is loaded and starts the server.

@private init()
 */

init = (function(_this) {
  return function() {
    var args;
    args = {
      logger: _this.log,
      logconf: logconf
    };
    args['http-port'] = parseInt(argv.w || conf.getHttpPort());
    args['db-port'] = parseInt(argv.d || conf.getDbPort());
    args['db-select'] = parseInt(argv.s || conf.fetchProp('db-select'));
    args['keygen'] = conf.getKeygenPassphrase();
    args['usermodules'] = conf.fetchProp('usermodules');
    encryption(args);
    _this.log.info('RS | Initialzing DB');
    db(args);
    return db.isConnected(function(err) {
      var cliArgs, poller;
      db.selectDatabase(parseInt(args['db-select']) || 0);
      if (err) {
        _this.log.error('RS | No DB connection, shutting down system!');
        return shutDown();
      } else {
        _this.log.info('RS | Initialzing engine');
        engine(args);
        _this.log.info('RS | Forking a child process for the trigger poller');
        cliArgs = [args.logconf['mode'], args.logconf['io-level'], args.logconf['file-level'], args.logconf['file-path'], args.logconf['nolog'], args['db-select'], args['keygen'], args['usermodules'].join(',')];
        poller = cp.fork(path.resolve(__dirname, nameEP), cliArgs);
        _this.log.info('RS | Initialzing module manager');
        cm(args);
        cm.addRuleListener(engine.internalEvent);
        cm.addRuleListener(function(evt) {
          return poller.send(evt);
        });
        _this.log.info('RS | Initialzing http listener');
        args['user-router'] = cm.router;
        args['shutdown-function'] = shutDown;
        return http(args);
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
    _this.log.warn('RS | Received shut down command!');
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
  return typeof procCmds[cmd] === "function" ? procCmds[cmd]() : void 0;
});

process.on('SIGINT', shutDown);

process.on('SIGTERM', shutDown);

procCmds.die = shutDown;

init();
