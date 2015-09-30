'use strict';

// Encryption
// ===============
// > Handles RSA encryption and decryption of user specific parameters.
 
// **Loads Modules:**

// - [cryptico](https://github.com/wwwtyro/cryptico)
var cryptico = require('./cryptico'),
	// - [Logging](logging.html)
	log = require('./logging'),
	oPrivateRSAkey,
	strPublicKey;

exports.init = function(keygenPassphrase) {
	oPrivateRSAkey = cryptico.generateRSAKey(keygenPassphrase, 1024);
	strPublicKey = cryptico.publicKeyString(oPrivateRSAkey);
	return log.info('DM | Public Key generated: ' + strPublicKey);
};

// Implicit return if written like this... :-/
exports.getPublicKey = () => strPublicKey;

exports.encrypt = (plainText) => {
	return cryptico.encrypt(plainText, strPublicKey).cipher;
};

exports.decrypt = (strEncrypted) => {
	return cryptico.decrypt(strEncrypted, oPrivateRSAkey).plaintext;
};
