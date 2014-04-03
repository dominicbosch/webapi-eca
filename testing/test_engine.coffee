fs = require 'fs'
path = require 'path'

try
  data = fs.readFileSync path.resolve( 'testing', 'files', 'testObjects.json' ), 'utf8'
  try
    objects = JSON.parse data
  catch err
    console.log 'Error parsing standard objects file: ' + err.message
catch err
  console.log 'Error fetching standard objects file: ' + err.message

logger = require path.join '..', 'js-coffee', 'logging'
log = logger.getLogger()
  # nolog: true
opts =
  logger: log

engine = require path.join '..', 'js-coffee', 'engine'
engine opts

db = require path.join '..', 'js-coffee', 'persistence'
db opts

oUser = objects.users.userOne
oRuleOne = objects.rules.ruleOne
oRuleTwo = objects.rules.ruleTwo
oRuleReal = objects.rules.ruleReal
oEpOne = objects.eps.epOne
oEpTwo = objects.eps.epTwo
oAiOne = objects.ais.aiOne

exports.tearDown = ( cb ) ->
  db.deleteRule oRuleOne.id
  db.deleteRule oRuleTwo.id
  db.deleteRule oRuleReal.id
  db.actionInvokers.deleteModule oAiOne.id
  db.deleteUser oUser.username
  setTimeout cb, 100

exports.ruleEvents =
  # init: first registration, multiple registration
  #       actions loaded and added correctly
  # new: new actions added
  #       old actions removed
  # delete: all actions removed if not required anymore 
  testInit: ( test ) ->
    db.storeUser oUser
    test.done()
    strRuleOne =  JSON.stringify oRuleOne
    strRuleTwo =  JSON.stringify oRuleTwo
    strRuleReal =  JSON.stringify oRuleReal

    db.actionInvokers.storeModule oUser.username, oAiOne

    db.storeRule oRuleOne.id, strRuleOne
    db.linkRule oRuleOne.id, oUser.username
    db.activateRule oRuleOne.id, oUser.username

    db.storeRule oRuleTwo.id, strRuleTwo
    db.linkRule oRuleTwo.id, oUser.username
    db.activateRule oRuleTwo.id, oUser.username

    db.storeRule oRuleReal.id, strRuleReal
    db.linkRule oRuleReal.id, oUser.username
    db.activateRule oRuleReal.id, oUser.username

    db.getAllActivatedRuleIdsPerUser ( err, obj ) =>
      @existingRules = obj
      console.log 'existing'
      console.log obj

      engine.internalEvent
        event: 'init'
        user: oUser.username
        rule: oRuleReal

      fCheckRules = () ->
        db.getAllActivatedRuleIdsPerUser ( err, obj ) =>
          console.log 'after init'
          console.log obj
          console.log @existingRules is obj

      setTimeout fCheckRules, 500