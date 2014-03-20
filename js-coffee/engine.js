'use strict';

var path = require('path'),
    regex = /\$X\.[\w\.\[\]]*/g, // find properties of $X
    listRules = {},
    listActionModules = {},
    isRunning = true,
    dynmod = require('./dynamic-modules'),
    db = require('./persistence'), log;

exports = module.exports = function( args ) {
  log = args.logger;
  db( args);
  dynmod(args);
  pollQueue();
  return module.exports;
};

var updateActionModules = function() {
  for ( var user in listRules ) {
    if(!listActionModules[user]) listActionModules[user] = {};
    for ( var rule in listRules[user] ) {
      var actions = listRules[user][rule].actions;
      for ( var i = 0; i < actions.length; i++ ){
        var arrMod = actions[i].split(' -> ');
        if ( !listActionModules[user][arrMod[0]] ){
          db.actionInvokers.getModule(arrMod[0], function( err, objAM ){
            db.actionInvokers.getUserParams(arrMod[0], user, function( err, objParams ) {
              console.log (objAM);

              //FIXME am name is called 'actions'???
              // if(objParams) { //TODO we don't need them for all modules
                var answ = dynmod.compileString(objAM.code, objAM.actions + "_" + user, objParams, objAM.lang);
                console.log('answ');
                console.log(answ);
                listActionModules[user][arrMod[0]] = answ.module;
                console.log('loaded ' + user + ': ' + arrMod[0]);
                console.log(listActionModules);
              // }
            });
          });
        }
      }
    }
  }
};

exports.internalEvent = function( evt, data ) {
  try{
    var obj = JSON.parse( data );
    db.getRuleActivatedUsers(obj.id, function ( err, arrUsers ) {
      for(var i = 0; i < arrUsers.length; i++) {
        if( !listRules[arrUsers[i]]) listRules[arrUsers[i]] = {};
        listRules[arrUsers[i]][obj.id] = obj;
        updateActionModules();
      }
    });
  } catch( err ) {
    console.log( err );
  }
};


function pollQueue() {
  if(isRunning) {
    db.popEvent(function (err, obj) {
      if(!err && obj) {
        processEvent(obj);
      }
      setTimeout(pollQueue, 50); //TODO adapt to load
    });
  }
}

/**
 * Handles correctly posted events
 * @param {Object} evt The event object
 */
function processEvent(evt) {
  log.info('EN', 'processing event: ' + evt.event + '(' + evt.eventid + ')');
  var actions = checkEvent(evt);
  for(var user in actions) {
    for(var i = 0; i < actions[user].length; i++) {
      invokeAction(evt, user, actions[user][i]);
    }
  }
}

/**
 * Check an event against the rules repository and return the actions
 * if the conditons are met.
 * @param {Object} evt the event to check
 */
function checkEvent(evt) {
  var actions = {};
  for(var user in listRules) {
    actions[user] = [];
    for(var rule in listRules[user]) {
    //TODO this needs to get depth safe, not only data but eventually also
    // on one level above (eventid and other meta)

      if(listRules[user][rule].event === evt.event && validConditions(evt.payload, listRules[user][rule])) {
        log.info('EN', 'Rule "' + rule + '" fired');
        var arrAct = listRules[user][rule].actions;
        for(var i = 0; i < arrAct.length; i++) {
          if(actions[user].indexOf(arrAct[i]) === -1) actions[user].push(arrAct[i]);
        }
      }
    }
  }
  return actions;
}

// {
//   "event": "emailyak -> newMail",
//   "payload": {
//     "TextBody": "hello"
//   }
// }
  
// exports.sendMail = ( args ) ->
//   url = 'https://api.emailyak.com/v1/ps1g59ndfcwg10w/json/send/email/'

//   data =
//     FromAddress: 'tester@mscliveweb.simpleyak.com'
//     ToAddress: 'dominic.bosch.db@gmail.com'
//     TextBody: 'test'

//   needle.post url, JSON.stringify( data ), {json: true}, ( err, resp, body ) ->
//     log err
//     log body
/**
 * Checks whether all conditions of the rule are met by the event.
 * @param {Object} evt the event to check
 * @param {Object} rule the rule with its conditions
 */
function validConditions(evt, rule) {
  for(var property in rule.conditions){
    if(!evt[property] || evt[property] != rule.condition[property]) return false;
  }
  return true;
}

/**
 * Invoke an action according to its type.
 * @param {Object} evt The event that invoked the action
 * @param {Object} action The action to be invoked
 */
function invokeAction( evt, user, action ) {
  var actionargs = {},
      arrModule = action.split(' -> ');
      //FIXME internal events, such as loopback ha sno arrow
      //TODO this requires change. the module property will be the identifier
      // in the actions object (or shall we allow several times the same action?)
  if(arrModule.length < 2) {
    log.error('EN', 'Invalid rule detected!');
    return;
  }
  console.log('invoking action');
  console.log(arrModule[0]);
  console.log(listActionModules);
  var srvc = listActionModules[user][arrModule[0]];
  console.log(srvc);
  if(srvc && srvc[arrModule[1]]) {
    //FIXME preprocessing not only on data
    //FIXME no preprocessing at all, why don't we just pass the whole event to the action?'
    // preprocessActionArguments(evt.payload, action.arguments, actionargs);
    try {
      if(srvc[arrModule[1]]) srvc[arrModule[1]](evt.payload);
    } catch(err) {
      log.error('EN', 'during action execution: ' + err);
    }
  }
  else log.info('EN', 'No api interface found for: ' + action.module);
}

// /**
//  * Action properties may contain event properties which need to be resolved beforehand.
//  * @param {Object} evt The event whose property values can be used in the rules action
//  * @param {Object} act The rules action arguments
//  * @param {Object} res The object to be used to enter the new properties
//  */
// function preprocessActionArguments(evt, act, res) {
//   for(var prop in act) {
//     /*
//      * If the property is an object itself we go into recursion
//      */
//     if(typeof act[prop] === 'object') {
//       res[prop] = {};
//       preprocessActionArguments(evt, act[prop], res[prop]);
//     }
//     else {
//       var txt = act[prop];
//       var arr = txt.match(regex);
      
//        * If rules action property holds event properties we resolve them and
//        * replace the original action property
       
//       // console.log(evt);
//       if(arr) {
//         for(var i = 0; i < arr.length; i++) {
//           /*
//            * The first three characters are '$X.', followed by the property
//            */
//           var actionProp = arr[i].substring(3).toLowerCase();
//           // console.log(actionProp);
//           for(var eprop in evt) {
//             // our rules language doesn't care about upper or lower case
//             if(eprop.toLowerCase() === actionProp) {
//               txt = txt.replace(arr[i], evt[eprop]);
//             }
//           }
//           txt = txt.replace(arr[i], '[property not available]');
//         }
//       }
//       res[prop] = txt;
//     }
//   }
// }

exports.shutDown = function() {
  if(log) log.info('EN', 'Shutting down Poller and DB Link');
  isRunning = false;
  if(db) db.shutDown();
};
