###

Dynamic Modules
===============
> Compiles CoffeeScript modules and loads JS modules in a VM, together
> with only a few allowed node.js modules.
###

# **Loads Modules:**

# - Node.js Modules: [vm](http://nodejs.org/api/vm.html) and
#   [events](http://nodejs.org/api/events.html)
vm = require 'vm'
needle = require 'needle'

# - External Modules: [coffee-script](http://coffeescript.org/),
#       [cryptico](https://github.com/wwwtyro/cryptico)
cs = require 'coffee-script'
cryptico = require 'my-cryptico'



###
Module call
-----------
Initializes the dynamic module handler.

@param {Object} args
###
exports = module.exports = ( args ) =>
  @log = args.logger
  # FIXME this can't come through the arguments
  if not @strPublicKey and args[ 'keygen' ]
    passPhrase = args[ 'keygen' ]
    numBits = 1024
    @oPrivateRSAkey = cryptico.generateRSAKey passPhrase, numBits
    @strPublicKey = cryptico.publicKeyString @oPrivateRSAkey
    @log.info "Public Key generated: #{ @strPublicKey }"

  # plainText = "Matt, I need you to help me with my Starcraft strategy."
  # oEncrypted = cryptico.encrypt plainText, strPublicKey

  # console.log oEncrypted.cipher
  # oDecrypted = cryptico.decrypt oEncrypted.cipher, oPrivateRSAkey
  # console.log oDecrypted.plaintext

  module.exports


exports.getPublicKey = () =>
  @strPublicKey

###
Try to run a JS module from a string, together with the
given parameters. If it is written in CoffeeScript we
compile it first into JS.

@public compileString ( *src, id, params, lang* )
@param {String} src
@param {String} id
@param {Object} params
@param {String} lang
###
exports.compileString = ( src, userId, modId, params, lang ) =>
  answ =
    code: 200
    message: 'Successfully compiled'

  if lang is 'CoffeeScript'
    try
      src = cs.compile src
    catch err
      answ.code = 400
      answ.message = 'Compilation of CoffeeScript failed at line ' +
        err.location.first_line
  #FIXME not log but debug module is required to provide information to the user
  sandbox = 
    id: userId + '.' + modId + '.vm'
    params: params
    needle: needle
    log: console.log
    # console: console #TODO remove!
    exports: {}
  #TODO child_process to run module!
  #Define max runtime per loop as 10 seconds, after that the child will be killed
  #it can still be active after that if there was a timing function or a callback used...
  #kill the child each time? how to determine whether there's still a token in the module?
  try
    vm.runInNewContext src, sandbox, sandbox.id
    # TODO We should investigate memory usage and garbage collection (global.gc())?
    # Start Node with the flags —nouse_idle_notification and —expose_gc, and then when you want to run the GC, just call global.gc().
  catch err
    answ.code = 400
    answ.message = 'Loading Module failed: ' + err.message
  ret =
    answ: answ
    module: sandbox.exports
  ret