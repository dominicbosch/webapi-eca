
/*

Encryption
===============
> Handles RSA encryption and decryption of user specific parameters.
 */
var cryptico, exports, log;

cryptico = require('./cryptico');

log = require('./logging');

exports = module.exports;

exports.init = function(keygenPassphrase) {
  this.oPrivateRSAkey = cryptico.generateRSAKey(keygenPassphrase, 1024);
  this.strPublicKey = cryptico.publicKeyString(this.oPrivateRSAkey);
  return log.info("DM | Public Key generated: " + this.strPublicKey);
};

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
