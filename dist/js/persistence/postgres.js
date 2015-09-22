var Sequelize, log;

log = require('../logging');

Sequelize = require('sequelize');

exports.init = (function(_this) {
  return function(dbPort) {
    log.info('DB | INIT DB');
    return _this.port = dbPort || 5432;
  };
})(this);

exports.selectDatabase = (function(_this) {
  return function(db) {
    log.info('DB | SELECT DB: ' + db);
    return _this.sequelize = new Sequelize('postgres://postgres:postgres@localhost:' + _this.port + '/' + db, {
      define: {
        timestamps: false
      }
    });
  };
})(this);

exports.isConnected = (function(_this) {
  return function(cb) {
    return _this.sequelize.authenticate().then(cb);
  };
})(this);
