
###
runscript.js
------------

A script that helps to track errors happening durin coffee
compilation and running of module code
###


if not process.argv[ 2 ]
  console.log 'Please provide a path to a coffee file'
  process.exit()

fs = require 'fs'
vm = require 'vm'
cs = require 'coffee-script'
needle = require 'needle'
crypto = require 'crypto-js'
request = require 'request'
importio = require( 'import-io' ).client

params = JSON.parse fs.readFileSync 'params.json', 'utf8'
code = fs.readFileSync process.argv[ 2 ], 'utf8'
src = cs.compile code

sandbox = 
  id: 'test.vm'
  params: params
  needle: needle
  request: request
  cryptoJS: crypto
  importio: importio
  log: console.log
  debug: console.log
  exports: {}
  pushEvent: ( obj ) ->
    console.log obj

vm.runInNewContext src, sandbox, sandbox.id

sandbox.exports[ process.argv[ 3 ] ].apply null, [ "param1", "param2", "param3", "param4" ]

console.log "If no error happened until here it seems the script
  compiled and ran correctly! Congrats!"