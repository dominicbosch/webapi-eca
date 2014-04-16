
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
  params: params.userparams
  needle: needle
  request: request
  cryptoJS: crypto
  importio: importio
  log: console.log
  debug: console.log
  exports: {}

vm.runInNewContext src, sandbox, sandbox.id

if process.argv[ 3 ] is 'ep'
  sandbox.exports[ process.argv[ 4 ] ] ( evt ) ->
    console.log evt
else
  sandbox.exports[ process.argv[ 3 ] ] params.event

console.log "If no error happened until here it seems the script
  compiled and ran correctly! Congrats!"