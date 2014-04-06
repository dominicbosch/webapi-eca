
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

issueApiCall = ( method, url, data, options, cb ) ->
  cb new Error 'not possible'

params = {}
data = fs.readFileSync process.argv[ 2 ], 'utf8'
src = cs.compile data

sandbox = 
  id: 'test.vm'
  params: params
  needlereq: issueApiCall
  log: console.log
  debug: console.log
  exports: {}

vm.runInNewContext src, sandbox, sandbox.id

console.log "If no error happened until here it seems the script
  compiled and ran correctly! Congrats!"