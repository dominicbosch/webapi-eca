###

Encryption
===============
> Handles RSA encryption and decryption of user specific parameters.
###

# **Loads Modules:**

# - [cryptico](https://github.com/wwwtyro/cryptico)
cryptico = require './cryptico'

exports = module.exports = ( args ) =>
	@log = args.logger
	@oPrivateRSAkey = cryptico.generateRSAKey args[ 'keygen' ], 1024
	@strPublicKey = cryptico.publicKeyString @oPrivateRSAkey
	@log.info "DM | Public Key generated: #{ @strPublicKey }"
	module.exports

exports.getPublicKey = () =>
	@strPublicKey

exports.encrypt = ( plainText ) =>
	oEncrypted = cryptico.encrypt plainText, @strPublicKey
	oEncrypted.cipher

exports.decrypt = ( strEncrypted ) =>
	oDecrypted = cryptico.decrypt strEncrypted, @oPrivateRSAkey
	oDecrypted.plaintext
