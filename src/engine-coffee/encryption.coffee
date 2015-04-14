###

Encryption
===============
> Handles RSA encryption and decryption of user specific parameters.
###

# **Loads Modules:**

# - [cryptico](https://github.com/wwwtyro/cryptico)
cryptico = require './cryptico'
log = require './logging'

exports = module.exports

exports.init = ( keygenPassphrase ) ->
	@oPrivateRSAkey = cryptico.generateRSAKey keygenPassphrase, 1024
	@strPublicKey = cryptico.publicKeyString @oPrivateRSAkey
	log.info "DM | Public Key generated: #{ @strPublicKey }"

exports.getPublicKey = () =>
	@strPublicKey

exports.encrypt = ( plainText ) =>
	oEncrypted = cryptico.encrypt plainText, @strPublicKey
	oEncrypted.cipher

exports.decrypt = ( strEncrypted ) =>
	oDecrypted = cryptico.decrypt strEncrypted, @oPrivateRSAkey
	oDecrypted.plaintext
