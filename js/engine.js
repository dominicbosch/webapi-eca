'use strict';

var path = require('path'),
    cp = require('child_process'),
    ml = require('./module_loader'),
    log = require('./logging'),
    poller, db, isRunning = true,
    qEvents = new (require('./queue')).Queue(); // export queue into redis

var regex = /\$X\.[\w\.\[\]]*/g, // find properties of $X
  listRules = {},
  listActionModules = {}, 
  actionsLoaded = false, eventsLoaded = false;
/*
 * Initialize the rules engine which initializes the module loader.
 * @param {Object} db_link the link to the db, see [db\_interface](db_interface.html)
 * @param {String} db_port the db port
 * @param {String} crypto_key the key to be used for encryption on the db, max legnth 256
 */
function init(db_link, db_port, crypto_key) {
  db = db_link;
  loadActions();
  poller = cp.fork(path.resolve(__dirname, 'eventpoller'), [db_port, crypto_key]);
  poller.on('message', function(evt) {
    if(evt.event === 'ep_finished_loading') {
      eventsLoaded = true;
      tryToLoadRules();
    } else pushEvent(evt);
  });
  //start to poll the event queue
  pollQueue();
}

function loadActions() {
  db.getActionModules(function(err, obj) {
    if(err) log.error('EN', 'retrieving Action Modules from DB!');
    else {
      if(!obj) {
        log.print('EN', 'No Action Modules found in DB!');
        actionsLoaded = true;
        tryToLoadRules();
      } else {
        var m, semaphore = 0;
        for(var el in obj) {
          semaphore++;
          log.print('EN', 'Loading Action Module from DB: ' + el);
          m = ml.requireFromString(obj[el], el);
          db.getActionModuleAuth(el, function(mod) {
            return function(err, obj) {
              if(--semaphore == 0) {
                actionsLoaded = true;
                tryToLoadRules();
              }
              if(obj && mod.loadCredentials) mod.loadCredentials(JSON.parse(obj));
            };
          }(m));
          listActionModules[el] = m;
        }
      }
      }
  });
}

function tryToLoadRules() {
  if(eventsLoaded && actionsLoaded) {
    db.getRules(function(err, obj) {
      for(var el in obj) loadRule(JSON.parse(obj[el]));
    });
  }
}

/**
 * Insert an action module into the list of available interfaces.
 * @param {Object} objModule the action module object
 */
function loadActionModule(name, objModule) {
  log.print('EN', 'Action module "' + name + '" loaded');
  listActionModules[name] = objModule;
}

/**
 * Insert a rule into the eca rules repository
 * @param {Object} objRule the rule object
 */
function loadRule(objRule) {
  //TODO validate rule
  log.print('EN', 'Loading Rule: ' + objRule.id);
  if(listRules[objRule.id]) log.print('EN', 'Replacing rule: ' + objRule.id);
  listRules[objRule.id] = objRule;

  // Notify poller about eventual candidate
  try {
    poller.send('event|'+objRule.event);
  } catch (err) {
    log.print('EN', 'Unable to inform poller about new active rule!');
  }
}

function pollQueue() {
  if(isRunning) {
    var evt = qEvents.dequeue();
    if(evt) {
      processEvent(evt);
    }
    setTimeout(pollQueue, 50); //TODO adapt to load
  }
}

/**
 * Stores correctly posted events in the queue
 * @param {Object} evt The event object
 */
function pushEvent(evt) {
  qEvents.enqueue(evt);
}

/**
 * Handles correctly posted events
 * @param {Object} evt The event object
 */
function processEvent(evt) {
  log.print('EN', 'processing event: ' + evt.event + '(' + evt.eventid + ')');
  var actions = checkEvent(evt);
  for(var i = 0; i < actions.length; i++) {
    invokeAction(evt, actions[i]);
  }
}

/**
 * Check an event against the rules repository and return the actions
 * if the conditons are met.
 * @param {Object} evt the event to check
 */
function checkEvent(evt) {
  var actions = [];
  for(var rn in listRules) {
    //TODO this needs to get depth safe, not only data but eventually also
    // on one level above (eventid and other meta)
    if(listRules[rn].event === evt.event && validConditions(evt.data, listRules[rn])) {
      log.print('EN', 'Rule "' + rn + '" fired');
      actions = actions.concat(listRules[rn].actions);
    }
  }
  return actions;
}

/**
 * Checks whether all conditions of the rule are met by the event.
 * @param {Object} evt the event to check
 * @param {Object} rule the rule with its conditions
 */
function validConditions(evt, rule) {
  for(var property in rule.condition){
    if(!evt[property] || evt[property] != rule.condition[property]) return false;
  }
  return true;
}

/**
 * Invoke an action according to its type.
 * @param {Object} evt The event that invoked the action
 * @param {Object} action The action to be invoked
 */
function invokeAction(evt, action) {
  var actionargs = {},
      arrModule = action.module.split('->');
  if(arrModule.length < 2) {
    log.error('EN', 'Invalid rule detected!');
    return;
  }
  var srvc = listActionModules[arrModule[0]];
  if(srvc && srvc[arrModule[1]]) {
    //FIXME preprocessing not only on data
    preprocessActionArguments(evt.data, action.arguments, actionargs);
    try {
      if(srvc[arrModule[1]]) srvc[arrModule[1]](actionargs);
    } catch(err) {
      log.error('EN', 'during action execution: ' + err);
    }
  }
  else log.print('EN', 'No api interface found for: ' + action.module);
}

/**
 * Action properties may contain event properties which need to be resolved beforehand.
 * @param {Object} evt The event whose property values can be used in the rules action
 * @param {Object} act The rules action arguments
 * @param {Object} res The object to be used to enter the new properties
 */
function preprocessActionArguments(evt, act, res) {
  for(var prop in act) {
    /*
     * If the property is an object itself we go into recursion
     */
    if(typeof act[prop] === 'object') {
      res[prop] = {};
      preprocessActionArguments(evt, act[prop], res[prop]);
    }
    else {
      var txt = act[prop];
      var arr = txt.match(regex);
      /*
       * If rules action property holds event properties we resolve them and
       * replace the original action property
       */
      // console.log(evt);
      if(arr) {
        for(var i = 0; i < arr.length; i++) {
          /*
           * The first three characters are '$X.', followed by the property
           */
          var actionProp = arr[i].substring(3).toLowerCase();
          // console.log(actionProp);
          for(var eprop in evt) {
            // our rules language doesn't care about upper or lower case
            if(eprop.toLowerCase() === actionProp) {
              txt = txt.replace(arr[i], evt[eprop]);
            }
          }
          txt = txt.replace(arr[i], '[property not available]');
        }
      }
      res[prop] = txt;
    }
  }
}

function loadEventModule(args, answHandler) {
  if(args && args.name) {
  	answHandler.answerSuccess('Loading event module ' + args.name + '...');
  	poller.send('cmd|loadevent|'+args.name);
  } else if(args) answHandler.answerError(args.name + ' not found');
}

function loadEventModules(args, answHandler) {
	answHandler.answerSuccess('Loading event moules...');
  poller.send('cmd|loadevents');
}

function shutDown() {
  log.print('EN', 'Shutting down Poller and DB Link');
  isRunning = false;
  if(poller) poller.send('cmd|shutdown');
  if(db) db.shutDown();
}

exports.init = init;
exports.loadActionModule = loadActionModule;
exports.loadRule = loadRule;
exports.loadEventModule = loadEventModule;
exports.loadEventModules = loadEventModules;
exports.pushEvent = pushEvent;
exports.shutDown = shutDown;
