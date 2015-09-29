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
    var e, error, error1, func, logPath, opt, prop, ref;
    if (args.log.nolog) {
      return delete exports.init;
    } else {
      try {
        opt = {
          name: 'webapi-eca'
        };
        if (args.log.trace === 'on') {
          opt.src = true;
        }
        if (args.log.filepath) {
          logPath = path.resolve(args.log.filepath);
        } else {
          logPath = path.resolve(__dirname, '..', '..', 'logs', 'server.log');
        }
        try {
          fs.writeFileSync(logPath + '.temp', 'temp');
          fs.unlinkSync(logPath + '.temp');
        } catch (error) {
          e = error;
          console.error("Log folder '" + logPath + "' is not writable");
          return;
        }
        opt.streams = [
          {
            level: args.log.stdlevel,
            stream: process.stdout
          }, {
            level: args.log.filelevel,
            path: logPath
          }
        ];
        ref = bunyan.createLogger(opt);
        for (prop in ref) {
          func = ref[prop];
          exports[prop] = func;
        }
        return delete exports.init;
      } catch (error1) {
        e = error1;
        console.error(e);
        return delete exports.init;
      }
    }
  }
};
