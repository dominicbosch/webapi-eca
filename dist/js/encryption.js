
/*

Encryption
===============
> Handles RSA encryption and decryption of user specific parameters.
 */
var cryptico, exports;

cryptico = require('./cryptico');

exports = module.exports = (function(_this) {
  return function(args) {
    _this.log = args.logger;
    _this.oPrivateRSAkey = cryptico.generateRSAKey(args['keygen'], 1024);
    _this.strPublicKey = cryptico.publicKeyString(_this.oPrivateRSAkey);
    _this.log.info("DM | Public Key generated: " + _this.strPublicKey);
    return module.exports;
  };
})(this);

exports.getPublicKey = (function(_this) {
  return function() {
    return _this.strPublicKey;
  };
})(this);

exports.encrypt = (function(_this) {
  return function(plainText) {
    var oEncrypted;
    oEncrypted = cryptico.encrypt(plainText, _this.strPublicKey);
    return oEncrypted.cipher;
  };
})(this);

exports.decrypt = (function(_this) {
  return function(strEncrypted) {
    var oDecrypted;
    oDecrypted = cryptico.decrypt(strEncrypted, _this.oPrivateRSAkey);
    return oDecrypted.plaintext;
  };
})(this);
