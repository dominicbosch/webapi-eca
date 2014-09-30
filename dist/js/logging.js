var bunyan, fs, path;

fs = require('fs');

path = require('path');

bunyan = require('bunyan');


/*
Returns a bunyan logger according to the given arguments.

@public getLogger( *args* )
@param {Object} args
 */

exports.getLogger = (function(_this) {
  return function(args) {
    var e, emptylog, opt;
    emptylog = {
      trace: function() {},
      debug: function() {},
      info: function() {},
      warn: function() {},
      error: function() {},
      fatal: function() {}
    };
    args = args != null ? args : {};
    if (args.nolog === true || args.nolog === 'true') {
      return emptylog;
    } else {
      try {
        opt = {
          name: "webapi-eca"
        };
        if (args['mode'] === 'development') {
          opt.src = true;
        }
        if (args['file-path']) {
          _this.logPath = path.resolve(args['file-path']);
        } else {
          _this.logPath = path.resolve(__dirname, '..', 'logs', 'server.log');
        }
        try {
          fs.writeFileSync(_this.logPath + '.temp', 'temp');
          fs.unlinkSync(_this.logPath + '.temp');
        } catch (_error) {
          e = _error;
          console.error("Log folder '" + _this.logPath + "' is not writable");
          return emptylog;
        }
        opt.streams = [
          {
            level: args['io-level'],
            stream: process.stdout
          }, {
            level: args['file-level'],
            path: _this.logPath
          }
        ];
        return bunyan.createLogger(opt);
      } catch (_error) {
        e = _error;
        console.error(e);
        return emptylog;
      }
    }
  };
})(this);
