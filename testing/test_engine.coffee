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

listRules = engine.getListUserRules()

oUser = objects.users.userOne
oRuleReal = objects.rules.ruleReal
oRuleRealTwo = objects.rules.ruleRealTwo
oAiOne = objects.ais.aiOne
oAiTwo = objects.ais.aiTwo

exports.tearDown = ( cb ) ->
  db.deleteRule oRuleReal.id
  db.actionInvokers.deleteModule oAiOne.id
  db.actionInvokers.deleteModule oAiTwo.id
  # TODO if user is deleted all his modules should be unlinked and deleted
  db.deleteUser oUser.username

  engine.internalEvent
    event: 'del'
    user: oUser.username
    rule: oRuleReal

  engine.internalEvent
    event: 'del'
    user: oUser.username
    rule: oRuleRealTwo

  setTimeout cb, 100

exports.ruleEvents =
  testInitAddDeleteMultiple: ( test ) ->
    test.expect 2 + 2 * oRuleReal.actions.length + oRuleRealTwo.actions.length

    db.storeUser oUser
    db.storeRule oRuleReal.id, JSON.stringify oRuleReal
    db.linkRule oRuleReal.id, oUser.username
    db.activateRule oRuleReal.id, oUser.username
    db.actionInvokers.storeModule oUser.username, oAiOne
    db.actionInvokers.storeModule oUser.username, oAiTwo

    test.strictEqual listRules[oUser.username], undefined, 'Initial user object exists!?'
        
    engine.internalEvent
      event: 'new'
      user: oUser.username
      rule: oRuleReal

    fWaitForPersistence = () ->

      for act in oRuleReal.actions
        mod = ( act.split ' -> ' )[0]
        test.ok listRules[oUser.username].actions[mod], 'Missing action!'

      engine.internalEvent
        event: 'new'
        user: oUser.username
        rule: oRuleRealTwo

      fWaitAgainForPersistence = () ->

        for act in oRuleRealTwo.actions
          mod = ( act.split ' -> ' )[0]
          test.ok listRules[oUser.username].actions[mod], 'Missing action!'

        engine.internalEvent
          event: 'del'
          user: oUser.username
          rule: oRuleRealTwo

        for act in oRuleReal.actions
          mod = ( act.split ' -> ' )[0]
          test.ok listRules[oUser.username].actions[mod], 'Missing action!'

        engine.internalEvent
          event: 'del'
          user: oUser.username
          rule: oRuleReal

        test.strictEqual listRules[oUser.username], undefined, 'Final user object exists!?'
        test.done()

      setTimeout fWaitAgainForPersistence, 200

    setTimeout fWaitForPersistence, 200

# #TODO
#   testUpdate: ( test ) ->
#     test.expect 0

#     test.done()

#     db.storeUser oUser
#     db.storeRule oRuleReal.id, JSON.stringify oRuleReal
#     db.linkRule oRuleReal.id, oUser.username
#     db.activateRule oRuleReal.id, oUser.username
#     db.actionInvokers.storeModule oUser.username, oAiOne


#     db.getAllActivatedRuleIdsPerUser ( err, obj ) ->
#       console.log 'existing'
#       console.log obj

#       engine.internalEvent
#         event: 'init'
#         user: oUser.username
#         rule: oRuleReal

#       fCheckRules = () ->
#         db.getAllActivatedRuleIdsPerUser ( err, obj ) ->
#           console.log 'after init'
#           console.log obj

#       setTimeout fCheckRules, 500

exports.engine =
  matchingEvent: ( test ) ->

    db.storeUser oUser
    db.storeRule oRuleReal.id, JSON.stringify oRuleReal
    db.linkRule oRuleReal.id, oUser.username
    db.activateRule oRuleReal.id, oUser.username
    db.actionInvokers.storeModule oUser.username, oAiOne

    engine.internalEvent
      event: 'new'
      user: oUser.username
      rule: oRuleReal

    fWaitForPersistence = () ->
      evt = objects.events.eventReal
      evt.eventid = 'event_testid'
      db.pushEvent evt
    setTimeout fWaitForPersistence, 200
    setTimeout test.done, 500

