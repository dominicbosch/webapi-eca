
/*

Dynamic Modules
===============
> Compiles CoffeeScript modules and loads JS modules in a VM, together
> with only a few allowed node.js modules.
 */
var config, db, dynmod, encryption, fCallFunction, fCheckAndRun, fLoadModule, init, isRunning, listUserModules, log, pollLoop;

log = require('./logging');

config = require('./config');

db = require('./persistence');

dynmod = require('./dynamic-modules');

encryption = require('./encryption');

init = function(args) {
  if (!args) {
    console.error('Not all arguments have been passed!');
    process.exit();
  }
  log.init(args.log);
  log.info('EP | Event Trigger Poller starts up');
  process.on('uncaughtException', function(err) {
    log.error('Probably one of the Event Triggers produced an error!');
    return log.error(err);
  });
  db.init(args['db-port']);
  db.selectDatabase(args['db-select']);
  return encryption.init(args['keygenpp']);
};

listUserModules = {};

isRunning = true;

process.on('disconnect', function() {
  log.warn('EP | Shutting down Event Trigger Poller');
  isRunning = false;
  return process.exit();
});

process.on('message', function(msg) {
  if (msg.intevent === 'startup') {
    init(msg.data);
  }
  log.info("EP | Got info about new rule: " + msg.intevent);
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
    return db.eventTriggers.getModule(msg.user, arrName[0], function(err, obj) {
      if (!obj) {
        return log.info("EP | No module retrieved for " + arrName[0] + ", must be a custom event or Webhook");
      } else {
        return dynmod.compileString(obj.data, msg.user, msg.rule, arrName[0], obj.lang, "eventtrigger", db.eventTriggers, function(result) {
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
          if (msg.rule.eventstart) {
            start = new Date(msg.rule.eventstart);
          } else {
            start = new Date(msg.rule.timestamp);
          }
          nd = new Date();
          now = new Date();
          if (start < nd) {
            nd.setMilliseconds(0);
            nd.setSeconds(start.getSeconds());
            nd.setMinutes(start.getMinutes());
            nd.setHours(start.getHours());
            if (nd < now) {
              log.info('SETTING NEW INTERVAL: ' + (nd.getDate() + 1));
              nd.setDate(nd.getDate() + 1);
            }
          } else {
            nd = start;
          }
          log.info("EP | New event module '" + arrName[0] + "' loaded for user " + msg.user + ", in rule " + msg.rule.id + ", registered at UTC|" + msg.rule.timestamp + ", starting at UTC|" + (start.toISOString()) + " ( which is in " + ((nd - now) / 1000 / 60) + " minutes ) and polling every " + msg.rule.eventinterval + " minutes");
          if (msg.rule.eventstart) {
            return setTimeout(fCheckAndRun(msg.user, msg.rule.id, msg.rule.timestamp), nd - now);
          } else {
            return fCheckAndRun(msg.user, msg.rule.id, msg.rule.timestamp);
          }
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
    var e, oRule;
    log.info("EP | Check and run user " + userId + ", rule " + ruleId);
    if (isRunning && listUserModules[userId] && listUserModules[userId][ruleId]) {
      if (listUserModules[userId][ruleId].timestamp === timestamp) {
        oRule = listUserModules[userId][ruleId];
        try {
          fCallFunction(userId, ruleId, oRule);
        } catch (_error) {
          e = _error;
          log.error('Error during execution of poller');
        }
        return setTimeout(fCheckAndRun(userId, ruleId, timestamp), oRule.eventinterval);
      } else {
        return log.info("EP | We found a newer polling interval and discontinue this one which was created at UTC|" + timestamp);
      }
    }
  };
};

fCallFunction = function(userId, ruleId, oRule) {
  var arrArgs, err, i, len, oArg, ref;
  try {
    arrArgs = [];
    if (oRule.funcArgs && oRule.funcArgs[oRule.pollfunc]) {
      ref = oRule.funcArgs[oRule.pollfunc];
      for (i = 0, len = ref.length; i < len; i++) {
        oArg = ref[i];
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

console.log('Do we really need a poll loop in the trigger poller?');

pollLoop = function() {
  if (isRunning) {
    return setTimeout(pollLoop, 10000);
  }
};

pollLoop();
