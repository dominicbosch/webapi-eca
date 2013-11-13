
exports.testUnit_ML = function(test){
    test.ok(true, "ml");
    test.done();
};

// var fs = require('fs'),
    // path = require('path'),
    // log = require('./logging');
//   
// function requireFromString(src, name, dir) {
  // if(!dir) dir = __dirname;
  // // YAH yet another hack, this time to load modules from strings
  // var id = path.resolve(dir, name, name + '.js');
  // var m = new module.constructor(id, module);
  // m.paths = module.paths;
  // try {
    // m._compile(src); 
  // } catch(err) {
    // log.error('LM', ' during compilation of ' + name + ': ' + err);
  // }
  // return m.exports;
// }
// 
// function loadModule(directory, name, callback) {
  // //FIXME contextualize and only allow small set of modules for safety reasons
  // try {
    // fs.readFile(path.resolve(directory, name, name + '.js'), 'utf8', function (err, data) {
      // if (err) {
        // log.error('LM', 'Loading module file!');
        // return;
      // }
      // var mod = requireFromString(data, name, directory);
      // if(mod && fs.existsSync(path.resolve(directory, name, 'credentials.json'))) {
        // fs.readFile(path.resolve(directory, name, 'credentials.json'), 'utf8', function (err, auth) {
          // if (err) {
            // log.error('LM', 'Loading credentials file for "' + name + '"!');
            // callback(name, data, mod, null);
            // return;
          // }
          // if(mod.loadCredentials) mod.loadCredentials(JSON.parse(auth));
          // callback(name, data, mod, auth);
        // });
      // } else {
        // // Hand back the name, the string contents and the compiled module
        // callback(name, data, mod, null);
      // }
    // });
  // } catch(err) {
    // log.error('LM', 'Failed loading module "' + name + '"');
  // }
// }
// 
// function loadModules(directory, callback) {
  // fs.readdir(path.resolve(__dirname, directory), function (err, list) {
    // if (err) {
      // log.error('LM', 'loading modules directory: ' + err);
      // return;
    // }
    // log.print('LM', 'Loading ' + list.length + ' modules from "' + directory + '"');
    // list.forEach(function (file) {
      // fs.stat(path.resolve(__dirname, directory, file), function (err, stat) {
        // if (stat && stat.isDirectory()) {
          // loadModule(path.resolve(__dirname, directory), file, callback);
        // }
      // });
    // });
  // });
// }
// 
// exports.loadModule = loadModule;
// exports.loadModules = loadModules;
// exports.requireFromString = requireFromString;
// 
