
/*

Dynamic Modules
===============
> Compiles CoffeeScript modules and loads JS modules in a VM, together
> with only a few allowed node.js modules.
 */
var db, dynmod, encryption, fCallFunction, fCheckAndRun, fLoadModule, isRunning, listUserModules, log, logconf, logger, pollLoop;

logger = require('./logging');

db = require('./persistence');

dynmod = require('./dynamic-modules');

encryption = require('./encryption');

if (process.argv.length < 8) {
  console.error('Not all arguments have been passed!');
  process.exit();
}

logconf = {
  mode: process.argv[2],
  nolog: process.argv[6]
};

logconf['io-level'] = process.argv[3];

logconf['file-level'] = process.argv[4];

logconf['file-path'] = process.argv[5];

log = logger.getLogger(logconf);

log.info('EP | Event Poller starts up');

process.on('uncaughtException', function(err) {
  log.error('Probably one of the event pollers produced an error!');
  return log.error(err);
});

db({
  logger: log
});

dynmod({
  logger: log
});

db.selectDatabase(parseInt(process.argv[7]) || 0);

encryption({
  logger: log,
  keygen: process.argv[8]
});

listUserModules = {};

isRunning = true;

process.on('disconnect', function() {
  log.warn('EP | Shutting down Event Poller');
  isRunning = false;
  return process.exit();
});

process.on('message', function(msg) {
  log.info("EP | Got info about new rule: " + msg.event);
  if (msg.intevent === 'new' || msg.intevent === 'init') {
    fLoadModule(msg);
  }
  if (msg.intevent === 'del') {
    delete listUserModules[msg.user][msg.ruleId];
    if (JSON.stringify(listUserModules[msg.user]) === "{}") {
      return delete listUserModules[msg.user];
    }
  }
});

fLoadModule = function(msg) {
  var arrName, fAnonymous;
  arrName = msg.rule.eventname.split(' -> ');
  fAnonymous = function() {
    return db.eventPollers.getModule(msg.user, arrName[0], function(err, obj) {
      if (!obj) {
        return log.info("EP | No module retrieved for " + arrName[0] + ", must be a custom event or Webhook");
      } else {
        return dynmod.compileString(obj.data, msg.user, msg.rule, arrName[0], obj.lang, "eventpoller", db.eventPollers, function(result) {
          var nd, now, oUser, start;
          if (!result.answ === 200) {
            log.error("EP | Compilation of code failed! " + msg.user + ", " + msg.rule.id + ", " + arrName[0]);
          }
          if (!listUserModules[msg.user]) {
            listUserModules[msg.user] = {};
          }
          oUser = listUserModules[msg.user];
          oUser[msg.rule.id] = {
            id: msg.rule.eventname,
            timestamp: msg.rule.timestamp,
            pollfunc: arrName[1],
            funcArgs: result.funcArgs,
            eventinterval: msg.rule.eventinterval * 60 * 1000,
            module: result.module,
            logger: result.logger
          };
          start = new Date(msg.rule.eventstart);
          nd = new Date();
          now = new Date();
          if (start < nd) {
            nd.setMilliseconds(0);
            nd.setSeconds(0);
            nd.setMinutes(start.getMinutes());
            nd.setHours(start.getHours());
            if (nd < now) {
              nd.setDate(nd.getDate() + 1);
            }
          } else {
            nd = start;
          }
          log.info("EP | New event module '" + arrName[0] + "' loaded for user " + msg.user + ", in rule " + msg.rule.id + ", registered at UTC|" + msg.rule.timestamp + ", starting at UTC|" + (start.toISOString()) + " ( which is in " + ((nd - now) / 1000 / 60) + " minutes ) and polling every " + msg.rule.eventinterval + " minutes");
          return setTimeout(fCheckAndRun(msg.user, msg.rule.id, msg.rule.timestamp), nd - now);
        });
      }
    });
  };
  if (msg.intevent === 'new' || !listUserModules[msg.user] || !listUserModules[msg.user][msg.rule.id]) {
    return fAnonymous();
  }
};

fCheckAndRun = function(userId, ruleId, timestamp) {
  return function() {
    var oRule;
    log.info("EP | Check and run user " + userId + ", rule " + ruleId);
    if (isRunning && listUserModules[userId] && listUserModules[userId][ruleId]) {
      if (listUserModules[userId][ruleId].timestamp === timestamp) {
        oRule = listUserModules[userId][ruleId];
        fCallFunction(userId, ruleId, oRule);
        return setTimeout(fCheckAndRun(userId, ruleId, timestamp), oRule.eventinterval);
      } else {
        return log.info("EP | We found a newer polling interval and discontinue this one which was created at UTC|" + timestamp);
      }
    }
  };
};

fCallFunction = function(userId, ruleId, oRule) {
  var arrArgs, err, oArg, _i, _len, _ref;
  try {
    arrArgs = [];
    if (oRule.funcArgs && oRule.funcArgs[oRule.pollfunc]) {
      _ref = oRule.funcArgs[oRule.pollfunc];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        oArg = _ref[_i];
        arrArgs.push(oArg.value);
      }
    }
    return oRule.module[oRule.pollfunc].apply(this, arrArgs);
  } catch (_error) {
    err = _error;
    log.info("EP | ERROR in module when polled: " + oRule.id + " " + userId + ": " + err.message);
    throw err;
    return oRule.logger(err.message);
  }
};


/*
This function will loop infinitely every 10 seconds until isRunning is set to false

@private pollLoop()
 */

pollLoop = function() {
  if (isRunning) {
    return setTimeout(pollLoop, 10000);
  }
};

pollLoop();
