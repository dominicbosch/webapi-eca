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

  # plainText = "Matt, I need you to help me with my Starcraft strategy."
  # oEncrypted = cryptico.encrypt plainText, strPublicKey

  # console.log oEncrypted.cipher
  # oDecrypted = cryptico.decrypt oEncrypted.cipher, oPrivateRSAkey
  # console.log oDecrypted.plaintext

  module.exports


exports.getPublicKey = () =>
  @strPublicKey


issueApiCall = ( method, url, credentials, cb ) =>
  try 
    if method is 'get'
      func = needle.get
    else
      func = needle.post

    func url, credentials, ( err, resp, body ) =>
      if not err
        cb body
      else
        cb()
  catch err
    @log.info 'DM | Error even before calling!'
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

  logFunction = ( uId, rId, mId ) ->
    ( msg ) ->
      db.appendLog uId, rId, mId, msg
  db.resetLog userId, ruleId

  fTryToLoad = ( params ) =>
    if params
      try
        oDecrypted = cryptico.decrypt params, @oPrivateRSAkey
        params = JSON.parse oDecrypted.plaintext
      catch err
        @log.warn "DM | Error during parsing of user defined params for #{ userId }, #{ ruleId }, #{ modId }"
        params = {}
    else
      params = {}

    sandbox = 
      id: userId + '.' + modId + '.vm'
      params: params
      apicall: issueApiCall
      log: logFunction userId, ruleId, modId
      # debug: console.log
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
      console.log err
      answ.code = 400
      answ.message = 'Loading Module failed: ' + err.message
    cb
      answ: answ
      module: sandbox.exports

  if dbMod
    dbMod.getUserParams modId, userId, ( err, obj ) ->
      fTryToLoad obj
  else
    fTryToLoad()
