###

Dynamic Modules
===============
> Compiles CoffeeScript modules and loads JS modules in a VM, together
> with only a few allowed node.js modules.
###

# - Node.js Modules: [vm](http://nodejs.org/api/vm.html) and
#   [events](http://nodejs.org/api/events.html)
vm = require 'vm'
needle = require 'needle'

# - External Modules: [coffee-script](http://coffeescript.org/)
cs = require 'coffee-script'

###
Module call
-----------
Initializes the dynamic module handler.

@param {Object} args
###
exports = module.exports = ( args ) =>
  @log = args.logger
  module.exports


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
exports.compileString = ( src, id, params, lang ) =>
  answ =
    code: 200
    message: 'Successfully compiled'

  # src = "'use strict;'\n" + src
  if lang is '0'
    try
      src = cs.compile src
    catch err
      answ.code = 400
      answ.message = 'Compilation of CoffeeScript failed at line ' +
        err.location.first_line
  #FIXME not log but debug module is required to provide information to the user
  sandbox = 
    id: id #TODO the ID needs to be a combination of the module id and the user name
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
    vm.runInNewContext src, sandbox, id + '.vm'
  catch err
    answ.code = 400
    answ.message = 'Loading Module failed: ' + err.message
  ret =
    answ: answ
    module: sandbox.exports
  ret