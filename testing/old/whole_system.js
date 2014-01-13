var path = require('path');
//FIXME handle EADDR in use!
exports.setUp = function(cb) {
  this.srv = require('child_process').fork(path.resolve(__dirname, '..', 'js', 'server'), ['2']);
  cb();
};

exports.testSystem = function(test){
  
    test.ok(false, "needs implementation");
    test.done();
};

exports.tearDown = function(cb) {
  this.srv.send('die');
  this.srv = null;
  cb();
};