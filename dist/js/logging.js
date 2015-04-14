var bunyan, exports, fs, path;

fs = require('fs');

path = require('path');

bunyan = require('bunyan');

exports = module.exports = {
  trace: function() {},
  debug: function() {},
  info: function() {},
  warn: function() {},
  error: function() {},
  fatal: function() {},
  init: function(args) {
    var e, func, logPath, opt, prop, ref;
    args = args != null ? args : {};
    if (args.nolog) {
      return delete exports.init;
    } else {
      try {
        opt = {
          name: "webapi-eca"
        };
        if (args['mode'] === 'development') {
          opt.src = true;
        }
        if (args['file-path']) {
          logPath = path.resolve(args['file-path']);
        } else {
          logPath = path.resolve(__dirname, '..', '..', 'logs', 'server.log');
        }
        try {
          fs.writeFileSync(logPath + '.temp', 'temp');
          fs.unlinkSync(logPath + '.temp');
        } catch (_error) {
          e = _error;
          console.error("Log folder '" + logPath + "' is not writable");
          return;
        }
        opt.streams = [
          {
            level: args['std-level'],
            stream: process.stdout
          }, {
            level: args['file-level'],
            path: logPath
          }
        ];
        ref = bunyan.createLogger(opt);
        for (prop in ref) {
          func = ref[prop];
          exports[prop] = func;
        }
        return delete exports.init;
      } catch (_error) {
        e = _error;
        console.error(e);
        return delete exports.init;
      }
    }
  }
};
