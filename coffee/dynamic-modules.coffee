###

Dynamic Modules
===============
> Compiles CoffeeScript modules and loads JS modules in a VM, together
> with only a few allowed node.js modules.
###

# **Loads Modules:**

# - [Persistence](persistence.html)
db = require './persistence'

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
    db args
    passPhrase = args[ 'keygen' ]
    numBits = 1024
    @oPrivateRSAkey = cryptico.generateRSAKey passPhrase, numBits
    @strPublicKey = cryptico.publicKeyString @oPrivateRSAkey
    @log.info "DM | Public Key generated: #{ @strPublicKey }"

  module.exports


exports.getPublicKey = () =>
  @strPublicKey


issueApiCall = ( logger ) ->
  ( method, url, data, options, cb ) ->
    try
      needle.request method, url, data, options, ( err, resp, body ) =>
        try
          cb err, resp, body
        catch err
          logger 'Error during needle request! ' + err.message
    catch err
      logger 'Error before needle request! ' + err.message

logFunction = ( uId, rId, mId ) ->
  ( msg ) ->
    db.appendLog uId, rId, mId, msg

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
exports.compileString = ( src, userId, ruleId, modId, lang, dbMod, cb ) =>
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

  fTryToLoad = ( params ) =>
    if params
      try
        oDecrypted = cryptico.decrypt params, @oPrivateRSAkey
        params = JSON.parse oDecrypted.plaintext
      catch err
        @log.warn "DM | Error during parsing of user defined params for #{ userId }, #{ ruleId }, #{ modId }"
        @log.warn err
        params = {}
    else
      params = {}

    logFunc = logFunction userId, ruleId, modId
    sandbox = 
      id: userId + '.' + modId + '.vm'
      params: params
      needlereq: issueApiCall logFunc
      log: logFunc
      debug: console.log
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
      msg = err.message
      if not msg
        msg = 'Try to run the script locally to track the error! Sadly we cannot provide the line number'
      answ.message = 'Loading Module failed: ' + msg
    cb
      answ: answ
      module: sandbox.exports
      logger: sandbox.log

  if dbMod
    dbMod.getUserParams modId, userId, ( err, obj ) ->
      fTryToLoad obj
  else
    fTryToLoad()
