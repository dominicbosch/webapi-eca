path = require 'path'
fs = require 'fs'
stdPath = path.resolve __dirname, '..', 'logs', 'server.log'
logger = require path.join '..', 'js-coffee', 'logging'

getLog = ( strPath, cb ) ->
  fWait = ->
    # cb fs.readFileSync path, 'utf-8'
    str = fs.readFileSync path.resolve( strPath ), 'utf-8'
    arrStr = str.split "\n"
    fConvertRow = ( row ) ->
      try
        JSON.parse row
    arrStr[i] = fConvertRow row for row, i in arrStr
    cb arrStr.slice 0, arrStr.length - 1
  setTimeout fWait, 100

exports.setUp = ( cb ) ->
  try
    fs.unlinkSync stdPath
  cb()

exports.testCreate = ( test ) ->
  test.expect 2
  arrLogs = [
    'TL | testInitIO - info'
    'TL | testInitIO - warn'
    'TL | testInitIO - error'
  ]
  args = {}
  args[ 'io-level' ] = 'error'
  log = logger.getLogger args
  log.info arrLogs[0]
  log.warn arrLogs[1]
  log.error arrLogs[2]
  test.ok fs.existsSync( stdPath ), 'Log file does not exist!'
  getLog stdPath, ( arr ) ->
    allCorrect = true
    for o,i  in arr
      if o.msg is not arrLogs[i]
        allCorrect = false
    test.ok allCorrect, 'Log file does not contain the correct entries!'
    test.done()

exports.testNoLog = ( test ) ->
  test.expect 1

  log = logger.getLogger
    nolog: true
  log.info 'TL | test 1'

  fWait = () -> 
    test.ok !fs.existsSync( stdPath ), 'Log file does still exist!'
    test.done()

  setTimeout fWait, 100

exports.testCustomPath = ( test ) ->
  test.expect 2

  strInfo = 'TL | custom path test 1'
  strPath = 'testing/files/test.log'
  args = {}
  args[ 'file-path' ] = strPath
  args[ 'io-level' ] = 'error'

  log = logger.getLogger args
  log.info strInfo

  fWait = () -> 
    test.ok fs.existsSync( strPath ), 'Custom log file does not exist!'
    getLog strPath, ( arr ) ->
      test.ok arr[0].msg is strInfo, 'Custom log file not correct!'
      try
        fs.unlinkSync strPath
      test.done()

  setTimeout fWait, 100

exports.testWrongPath = ( test ) ->
  empty = [
    'trace'
    'debug'
    'info'
    'warn'
    'error'
    'fatal'
  ]
  test.expect empty.length

  strInfo = 'TL | custom path test 1'
  strPath = 'strange/path/to/test.log'
  args = {}
  args[ 'file-path' ] = strPath
  args[ 'io-level' ] = 'error'
  log = logger.getLogger args
  test.ok prop in empty, "#{ prop } shouldn't be here" for prop of log
  test.done()

    
