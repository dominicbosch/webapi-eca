// Generated by CoffeeScript 1.7.1

/*

Dynamic Modules
===============
> Compiles CoffeeScript modules and loads JS modules in a VM, together
> with only a few allowed node.js modules.
 */

(function() {
  var cs, exports, needle, vm;

  vm = require('vm');

  needle = require('needle');

  cs = require('coffee-script');


  /*
  Module call
  -----------
  Initializes the dynamic module handler.
  
  @param {Object} args
   */

  exports = module.exports = (function(_this) {
    return function(args) {
      _this.log = args.logger;
      return module.exports;
    };
  })(this);


  /*
  Try to run a JS module from a string, together with the
  given parameters. If it is written in CoffeeScript we
  compile it first into JS.
  
  @public compileString ( *src, id, params, lang* )
  @param {String} src
  @param {String} id
  @param {Object} params
  @param {String} lang
   */

  exports.compileString = (function(_this) {
    return function(src, id, params, lang) {
      var answ, err, ret, sandbox;
      answ = {
        code: 200,
        message: 'Successfully compiled'
      };
      if (lang === '0') {
        try {
          src = cs.compile(src);
        } catch (_error) {
          err = _error;
          answ.code = 400;
          answ.message = 'Compilation of CoffeeScript failed at line ' + err.location.first_line;
        }
      }
      sandbox = {
        id: id,
        params: params,
        needle: needle,
        log: console.log,
        exports: {}
      };
      try {
        vm.runInNewContext(src, sandbox, id + '.vm');
      } catch (_error) {
        err = _error;
        console.log(err);
        answ.code = 400;
        answ.message = 'Loading Module failed: ' + err.message;
      }
      ret = {
        answ: answ,
        module: sandbox.exports
      };
      return ret;
    };
  })(this);

}).call(this);
