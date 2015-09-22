var DBInterface, exports, log;

log = require('./logging');

exports = module.exports;

DBInterface = (function() {
  function DBInterface(zeugs) {
    this.zeugs = zeugs;
    log.info('zeugs');
  }

  DBInterface.prototype.init = function(oConf) {
    log.info('PS | INIT DB MODULE: ' + oConf.module);
    log.info(Object.keys(exports));
    exports = require('./persistence/' + oConf.module);
    log.info('Overwriting exports');
    return log.info(Object.keys(exports));
  };

  return DBInterface;

})();

exports = new DBInterface;

console.log('STARTING PERSISTENCE');

console.log(this.isInit);

if (!this.isInit) {
  console.log('INITING SYMBOL');
  this.isInit = Symbol('Init');
}

log.info(this.isInit);
