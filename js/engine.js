'use strict';

var path = require('path'),
    cp = require('child_process'),
    log = require('./logging'),
    qEvents = new (require('./queue')).Queue(), //TODO export queue into redis
    regex = /\$X\.[\w\.\[\]]*/g, // find properties of $X
    listRules = {},
    listActionModules = {},
    isRunning = true,
    ml, poller, db;

exports = module.exports = function(args) {
  args = args || {};
  log(args);
  ml = require('./module_loader')(args);
  poller = cp.fork(path.resolve(__dirname, 'eventpoller'), [log.getLogType()]);
  poller.on('message', function(evt) {
    exports.pushEvent(evt);
  });
  //start to poll the event queue
  pollQueue();
  return module.exports;
};

/*
 * Initialize the rules engine which initializes the module loader.
 * @param {Object} db_link the link to the db, see [db\_interface](db_interface.html)
 * @param {String} db_port the db port
 * @param {String} crypto_key the key to be used for encryption on the db, max legnth 256
 */
exports.addDBLinkAndLoadActionsAndRules = function(db_link) {
  //TODO only load rules on beginning, if rules require certain actions, load them in order to allow fast firing
  // if rules are set inactive, remove the action module from the memory
  db = db_link;
  if(ml && db) db.getActionModules(function(err, obj) {
    if(err) log.error('EN', 'retrieving Action Modules from DB!');
    else {
      if(!obj) {
        log.print('EN', 'No Action Modules found in DB!');
      } else {
        var m;
        for(var el in obj) {
          log.print('EN', 'Loading Action Module from DB: ' + el);
          try{
            m = ml.requireFromString(obj[el], el);
            db.getActionModuleAuth(el, function(mod) {
              return function(err, obj) {
                if(obj && mod.loadCredentials) mod.loadCredentials(JSON.parse(obj));
              };
            }(m));
            listActionModules[el] = m;
          } catch(e) {
            e.addInfo = 'error in action module "' + el + '"';
            log.error('EN', e);
          }
        }
      }
    }
    if(db) db.getRules(function(err, obj) {
      for(var el in obj) exports.addRule(JSON.parse(obj[el]));
    });
  });
  else log.severe('EN', new Error('Module Loader or DB not defined!'));
};


/**
 * Insert an action module into the list of available interfaces.
 * @param {Object} objModule the action module object
 */
//TODO action modules should be loaded once a user activates a rule with the respective
// action, if the user deletes the rule it has to be garrbage collected from the engine's list 
exports.loadActionModule = function(name, objModule) {
  log.print('EN', 'Action module "' + name + '" loaded');
  listActionModules[name] = objModule;
};

/**
 * Add a rule into the working memory
 * @param {Object} objRule the rule object
 */
exports.addRule = function(objRule) {
  //TODO validate rule
  log.print('EN', 'Loading Rule');
  log.print('EN', 'Loading Rule: ' + objRule.id);
  if(listRules[objRule.id]) log.print('EN', 'Replacing rule: ' + objRule.id);
  listRules[objRule.id] = objRule;

  // Notify poller about eventual candidate
  try {
    poller.send('event|'+objRule.event);
  } catch (err) {
    log.print('EN', 'Unable to inform poller about new active rule!');
  }
};

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
exports.pushEvent = function(evt) {
  qEvents.enqueue(evt);
};

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
    if(listRules[rn].event === evt.event && validConditions(evt.payload, listRules[rn])) {
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
    preprocessActionArguments(evt.payload, action.arguments, actionargs);
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

exports.shutDown = function() {
  log.print('EN', 'Shutting down Poller and DB Link');
  isRunning = false;
  if(poller) poller.send('cmd|shutdown');
  if(db) db.shutDown();
};
