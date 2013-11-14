
exports.testUnit_MM = function(test){
    test.ok(false, "needs implementation");
    test.done();
};

// /*
// # Module Manager
// > The module manager takes care of the module and rules loading in the initialization
// > phase and on user request.
// 
// > Event and Action modules are loaded as strings and stored in the database,
// > then compiled into node modules and  and rules
 // */
// var fs = require('fs'),
  // path = require('path'),
  // log = require('./logging'),
  // ml = require('./module_loader'),
  // db = null, funcLoadAction, funcLoadRule;
// 
// function init(db_link, fLoadAction, fLoadRule) {
  // db = db_link;
  // funcLoadAction = fLoadAction;
  // funcLoadRule = fLoadRule;
// }
// /*
// # A First Level Header
// 
// 
// A Second Level Header
// ---------------------
// 
// Now is the time for all good men to come to
// the aid of their country. This is just a
// regular paragraph.
// 
// The quick brown fox jumped over the lazy
// dog's back.
// 
// ### Header 3
// 
// > This is a blockquote.
// > 
// > This is the second paragraph in the blockquote.
// >
// > ## This is an H2 in a blockquote
// 
// This is the function documentation
// @param {Object} [args] the optional arguments
// @param {String} [args.name] the optional name in the arguments
 // */
// function loadRulesFile(args, answHandler) {
  // //FIXME if a corrupt rule file is read the system crashes, prevent this also for event and action modules
  // if(!args) args = {};
  // if(!args.name) args.name = 'rules';
  // if(!funcLoadRule) log.error('ML', 'no rule loader function available');
  // else {
    // fs.readFile(path.resolve(__dirname, 'rules', args.name + '.json'), 'utf8', function (err, data) {
      // if (err) {
        // log.error('ML', 'Loading rules file: ' + args.name + '.json');
        // return;
      // }
      // var arr = JSON.parse(data), txt = '';
      // log.print('ML', 'Loading ' + arr.length + ' rules:');
      // for(var i = 0; i < arr.length; i++) {
      	// txt += arr[i].id + ', ';
        // db.storeRule(arr[i].id, JSON.stringify(arr[i]));
        // funcLoadRule(arr[i]);
      // }
      // answHandler.answerSuccess('Yep, loaded rules: ' + txt);
    // });
  // }
// }
// 
// /**
 // * 
 // * @param {Object} name
 // * @param {Object} data
 // * @param {Object} mod
 // * @param {String} [auth] The string representation of the auth json
 // */
// function loadActionCallback(name, data, mod, auth) {
  // db.storeActionModule(name, data); // store module in db
  // funcLoadAction(name, mod); // hand compiled module back
  // if(auth) db.storeActionModuleAuth(name, auth);
// }
// 
// function loadActionModule(args, answHandler) {
  // if(args && args.name) {
		// answHandler.answerSuccess('Loading action module ' + args.name + '...');
    // ml.loadModule('mod_actions', args.name, loadActionCallback);
  // }
// }
// 
// function loadActionModules(args, answHandler) {
	// answHandler.answerSuccess('Loading action modules...');
  // ml.loadModules('mod_actions', loadActionCallback);
// }
// 
// exports.init = init;
// exports.loadRulesFile = loadRulesFile;
// exports.loadActionModule = loadActionModule;
// exports.loadActionModules = loadActionModules;