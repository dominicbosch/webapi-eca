path = require 'path'
logger = require path.join '..', 'js-coffee', 'logging'
log = logger.getLogger()
 # nolog: true
dbs = []
i = 0
  
getDBInstance = () ->
  dbs[++i] = require path.join '..', 'js-coffee', 'persistence'
  opts =
    logger: log
  opts[ 'db-port' ] = 6379
  dbs[i] opts
  dbs[i]

# ###
# # Test AVAILABILITY
# ###
exports.Availability =
  testRequire: ( test ) =>
    test.expect 1
    db = getDBInstance()
    test.ok db, 'DB interface loaded'
    db.shutDown()
    test.done()

  testConnect: ( test ) =>
    test.expect 1

    db = getDBInstance()
    db.isConnected ( err ) ->
      test.ifError err, 'Connection failed!'
      db.shutDown()
      test.done()

  # We cannot test for no db-port, since node-redis then assumes standard port
  testWrongDbPort: ( test ) =>
    test.expect 1

    opts =
      logger: log
    opts[ 'db-port' ] = 13410
    db = getDBInstance()
    db opts
    db.isConnected ( err ) ->
      test.ok err, 'Still connected!?'
      db.shutDown()
      test.done()

  testPurgeQueue: ( test ) =>
    test.expect 2

    evt = 
      eventid: '1'
      event: 'mail'
    db = getDBInstance()
    db.pushEvent evt
    db.purgeEventQueue()
    db.popEvent ( err, obj ) =>
      test.ifError err, 'Error during pop after purging!'
      test.strictEqual obj, null, 'There was an event in the queue!?'
      db.shutDown()
      test.done()


###
# Test EVENT QUEUE
###
exports.EventQueue =
  setUp: ( cb ) =>
    @evt1 = 
      eventid: '1'
      event: 'mail'
    @evt2 = 
      eventid: '2'
      event: 'mail'
    cb()

  testEmptyPopping: ( test ) =>
    test.expect 2
    
    db = getDBInstance()
    db.purgeEventQueue()
    db.popEvent ( err, obj ) =>
      test.ifError err,
        'Error during pop after purging!'
      test.strictEqual obj, null,
        'There was an event in the queue!?'
      db.shutDown()
      test.done()

  testEmptyPushing: ( test ) =>
    test.expect 2

    db = getDBInstance()
    db.pushEvent null
    db.popEvent ( err, obj ) =>
      test.ifError err,
        'Error during non-empty pushing!'
      test.strictEqual obj, null,
        'There was an event in the queue!?'
      db.shutDown()
      test.done()

  testNonEmptyPopping: ( test ) =>
    test.expect 3

    db = getDBInstance()
    db.pushEvent @evt1
    db.popEvent ( err, obj ) =>
      test.ifError err,
        'Error during non-empty popping!'
      test.notStrictEqual obj, null,
        'There was no event in the queue!'
      test.deepEqual @evt1, obj,
        'Wrong event in queue!'
      db.shutDown()
      test.done()

  testMultiplePushAndPops: ( test ) =>
    test.expect 6

    semaphore = 2
    forkEnds = () ->
      if --semaphore is 0
        db.shutDown()
        test.done()

    db = getDBInstance()
    db.pushEvent @evt1
    db.pushEvent @evt2
    # eventually it would be wise to not care about the order of events
    db.popEvent ( err, obj ) =>
      test.ifError err,
        'Error during multiple push and pop!'
      test.notStrictEqual obj, null,
        'There was no event in the queue!'
      test.deepEqual @evt1, obj,
        'Wrong event in queue!'
      forkEnds()
    db.popEvent ( err, obj ) =>
      test.ifError err,
        'Error during multiple push and pop!'
      test.notStrictEqual obj, null,
        'There was no event in the queue!'
      test.deepEqual @evt2, obj,
        'Wrong event in queue!'
      forkEnds()


###
# Test Indexed Module from persistence. Testing only Event Poller is sufficient
# since Action Invoker uses the same class
###
exports.EventPoller =
  setUp: ( cb ) =>
    @userId = 'tester1'
    @event1id = 'test-event-poller_1'
    @event2id = 'test-event-poller_2'
    @event1 =
      code: 'unit-test event poller 1 content'
      reqparams:'[param11,param12]'
    @event2 =
      code: 'unit-test event poller 2 content'
      reqparams:'[param21,param22]'
    cb()
 
  tearDown: ( cb ) =>
    db = getDBInstance()
    db.eventPollers.unlinkModule @event1id, @userId
    db.eventPollers.deleteModule @event1id
    db.eventPollers.unlinkModule @event2id, @userId
    db.eventPollers.deleteModule @event2id
    setTimeout db.shutDown, 500
    cb()

  testCreateAndRead: ( test ) =>
    test.expect 3
    db = getDBInstance()
    db.eventPollers.storeModule @event1id, @userId, @event1

    # test that the ID shows up in the set
    db.eventPollers.getModuleIds ( err , obj ) =>
      test.ok @event1id in obj,
        'Expected key not in event-pollers set'
      
      # the retrieved object really is the one we expected
      db.eventPollers.getModule @event1id, ( err , obj ) =>
        test.deepEqual obj, @event1,
          'Retrieved Event Poller is not what we expected'
        
        # Ensure the event poller is in the list of all existing ones
        db.eventPollers.getModules ( err , obj ) =>
          test.deepEqual @event1, obj[@event1id],
            'Event Poller ist not in result set'
          
          db.shutDown()
          test.done()
          
  testUpdate: ( test ) =>
    test.expect 2

    db = getDBInstance()
    # store an entry to start with 
    db.eventPollers.storeModule @event1id, @userId, @event1
    db.eventPollers.storeModule @event1id, @userId, @event2

    # the retrieved object really is the one we expected
    db.eventPollers.getModule @event1id, ( err , obj ) =>
      test.deepEqual obj, @event2,
        'Retrieved Event Poller is not what we expected'
        
      # Ensure the event poller is in the list of all existing ones
      db.eventPollers.getModules ( err , obj ) =>
        test.deepEqual @event2, obj[@event1id],
          'Event Poller ist not in result set'
        db.shutDown()
        test.done()

  testDelete: ( test ) =>
    test.expect 2

    db = getDBInstance()
    # store an entry to start with 
    db.eventPollers.storeModule @event1id, @userId, @event1

    # Ensure the event poller has been deleted
    db.eventPollers.deleteModule @event1id
    db.eventPollers.getModule @event1id, ( err , obj ) =>
      test.strictEqual obj, null,
        'Event Poller still exists'
      
      # Ensure the ID has been removed from the set
      db.eventPollers.getModuleIds ( err , obj ) =>
        test.ok @event1id not in obj,
          'Event Poller key still exists in set'
        db.shutDown()
        test.done()
  

  testFetchSeveral: ( test ) =>
    test.expect 3

    semaphore = 2

    fCheckInvoker = ( modname, mod ) =>
      myTest = test
      forkEnds = () ->
        if --semaphore is 0
          db.shutDown()
          myTest.done()
      ( err, obj ) =>
        myTest.deepEqual mod, obj,
          "Invoker #{ modname } does not equal the expected one"
        forkEnds()

    db = getDBInstance()
    db.eventPollers.storeModule @event1id, @userId, @event1
    db.eventPollers.storeModule @event2id, @userId, @event2
    db.eventPollers.getModuleIds ( err, obj ) =>
      test.ok @event1id in obj and @event2id in obj,
        'Not all event poller Ids in set'
      db.eventPollers.getModule @event1id, fCheckInvoker @event1id, @event1 
      db.eventPollers.getModule @event2id, fCheckInvoker @event2id, @event2


###
# Test EVENT POLLER PARAMS
###
exports.EventPollerParams =
  testCreateAndRead: ( test ) =>
    test.expect 2

    userId = 'tester1'
    eventId = 'test-event-poller_1'
    params = 'shouldn\'t this be an object?'

    db = getDBInstance()
    # store an entry to start with 
    db.eventPollers.storeUserParams eventId, userId, params
    
    # test that the ID shows up in the set
    db.eventPollers.getUserParamsIds ( err, obj ) =>
      test.ok eventId+':'+userId in obj,
        'Expected key not in event-params set'
      
      # the retrieved object really is the one we expected
      db.eventPollers.getUserParams eventId, userId, ( err, obj ) =>
        test.strictEqual obj, params,
          'Retrieved event params is not what we expected'
        db.eventPollers.deleteUserParams eventId, userId
        setTimeout db.shutDown, 500
        test.done()

  testUpdate: ( test ) =>
    test.expect 1

    userId = 'tester1'
    eventId = 'test-event-poller_1'
    params = 'shouldn\'t this be an object?'
    paramsNew = 'shouldn\'t this be a new object?'

    db = getDBInstance()
    # store an entry to start with 
    db.eventPollers.storeUserParams eventId, userId, params
    db.eventPollers.storeUserParams eventId, userId, paramsNew

    # the retrieved object really is the one we expected
    db.eventPollers.getUserParams eventId, userId, ( err, obj ) =>
      test.strictEqual obj, paramsNew,
        'Retrieved event params is not what we expected'
      db.eventPollers.deleteUserParams eventId, userId
      db.shutDown()
      test.done()

  testDelete: ( test ) =>
    test.expect 2

    userId = 'tester1'
    eventId = 'test-event-poller_1'
    params = 'shouldn\'t this be an object?'

    db = getDBInstance()
    # store an entry to start with and delete it right away
    db.eventPollers.storeUserParams eventId, userId, params
    db.eventPollers.deleteUserParams eventId, userId
    
    # Ensure the event params have been deleted
    db.eventPollers.getUserParams eventId, userId, ( err, obj ) =>
      test.strictEqual obj, null,
        'Event params still exists'
      # Ensure the ID has been removed from the set
      db.eventPollers.getUserParamsIds ( err, obj ) =>
        test.ok eventId+':'+userId not in obj,
          'Event Params key still exists in set'
        db.shutDown()
        test.done()


###
# Test RULES
###
exports.Rules =
  setUp: ( cb ) =>
    # @db logType: 1
    @userId = 'tester-1'
    @ruleId = 'test-rule_1'
    @rule = 
      "id": "rule_id",
      "event": "custom",
      "condition":
        "property": "yourValue",
      "actions": []
    @ruleNew = 
      "id": "rule_new",
      "event": "custom",
      "condition":
        "property": "yourValue",
      "actions": []
    cb()

  tearDown: ( cb ) =>
    db = getDBInstance()
    db.deleteRule @ruleId
    setTimeout db.shutDown, 500
    cb()

  testCreateAndRead: ( test ) =>
    test.expect 3

    db = getDBInstance()
    # store an entry to start with 
    db.storeRule @ruleId, JSON.stringify(@rule)
    
    # test that the ID shows up in the set
    db.getRuleIds ( err, obj ) =>
      test.ok @ruleId in obj,
        'Expected key not in rule key set'
      
      # the retrieved object really is the one we expected
      db.getRule @ruleId, ( err, obj ) =>
        test.deepEqual JSON.parse(obj), @rule,
          'Retrieved rule is not what we expected'

        # Ensure the rule is in the list of all existing ones
        db.getRules ( err , obj ) =>
          test.deepEqual @rule, JSON.parse(obj[@ruleId]),
            'Rule not in result set'
          db.shutDown()
          test.done()

  testUpdate: ( test ) =>
    test.expect 1

    db = getDBInstance()
    # store an entry to start with 
    db.storeRule @ruleId, JSON.stringify(@rule)
    db.storeRule @ruleId, JSON.stringify(@ruleNew)

    # the retrieved object really is the one we expected
    db.getRule @ruleId, ( err, obj ) =>
      test.deepEqual JSON.parse(obj), @ruleNew,
        'Retrieved rule is not what we expected'
      db.shutDown()
      test.done()

  testDelete: ( test ) =>
    test.expect 2

    db = getDBInstance()
    # store an entry to start with and delete it right away
    db.storeRule @ruleId, JSON.stringify(@rule)
    db.deleteRule @ruleId
    
    # Ensure the event params have been deleted
    db.getRule @ruleId, ( err, obj ) =>
      test.strictEqual obj, null,
        'Rule still exists'

      # Ensure the ID has been removed from the set
      db.getRuleIds ( err, obj ) =>
        test.ok @ruleId not in obj,
          'Rule key still exists in set'
        db.shutDown()
        test.done()

  testLink: ( test ) =>
    test.expect 2

    db = getDBInstance()
    # link a rule to the user
    db.linkRule @ruleId, @userId

      # Ensure the user is linked to the rule
    db.getRuleLinkedUsers @ruleId, ( err, obj ) =>
      test.ok @userId in obj,
        "Rule not linked to user #{ @userId }"

      # Ensure the rule is linked to the user
      db.getUserLinkedRules @userId, ( err, obj ) =>
        test.ok @ruleId in obj,
          "User not linked to rule #{ @ruleId }"
        db.shutDown()
        test.done()

  testUnlink: ( test ) =>
    test.expect 2

    db = getDBInstance()
    # link and unlink immediately afterwards
    db.linkRule @ruleId, @userId
    db.unlinkRule @ruleId, @userId

      # Ensure the user is linked to the rule
    db.getRuleLinkedUsers @ruleId, ( err, obj ) =>
      test.ok @userId not in obj,
        "Rule still linked to user #{ @userId }"

      # Ensure the rule is linked to the user
      db.getUserLinkedRules @userId, ( err, obj ) =>
        test.ok @ruleId not in obj,
          "User still linked to rule #{ @ruleId }"
        db.shutDown()
        test.done()

  testActivate: ( test ) =>
    test.expect 4

    usr =
      username: "tester-1"
      password: "tester-1"
    db = getDBInstance()
    db.storeUser usr
    db.activateRule @ruleId, @userId
    # activate a rule for a user

      # Ensure the user is activated to the rule
    db.getRuleActivatedUsers @ruleId, ( err, obj ) =>
      test.ok @userId in obj,
        "Rule not activated for user #{ @userId }"

      # Ensure the rule is linked to the user
      db.getUserActivatedRules @userId, ( err, obj ) =>
        test.ok @ruleId in obj,
          "User not activated for rule #{ @ruleId }"

        # Ensure the rule is showing up in all active rules
        db.getAllActivatedRuleIdsPerUser ( err, obj ) =>
          test.notStrictEqual obj[@userId], undefined,
            "User #{ @userId } not in activated rules set"
          if obj[@userId]
            test.ok @ruleId in obj[@userId],
              "Rule #{ @ruleId } not in activated rules set"
          # else
          #   test.ok true,
          #     "Dummy so we meet the expected num of tests"
          db.shutDown()
          test.done()

  testDeactivate: ( test ) =>
    test.expect 3

    db = getDBInstance()
    # store an entry to start with and link it to te user
    db.activateRule @ruleId, @userId
    db.deactivateRule @ruleId, @userId

      # Ensure the user is linked to the rule
    db.getRuleActivatedUsers @ruleId, ( err, obj ) =>
      test.ok @userId not in obj,
        "Rule still activated for user #{ @userId }"

      # Ensure the rule is linked to the user
      db.getUserActivatedRules @userId, ( err, obj ) =>
        test.ok @ruleId not in obj,
          "User still activated for rule #{ @ruleId }"

        # Ensure the rule is showing up in all active rules
        db.getAllActivatedRuleIdsPerUser ( err, obj ) =>
          if obj[@userId]
            test.ok @ruleId not in obj[@userId],
              "Rule #{ @ruleId } still in activated rules set"
          else
            test.ok true,
              "We are fine since there are no entries for this user anymore"
          db.shutDown()
          test.done()

  testUnlinkAndDeactivateAfterDeletion: ( test ) =>
    test.expect 2

    db = getDBInstance()
    # store an entry to start with and link it to te user
    db.storeRule @ruleId, JSON.stringify(@rule)
    db.linkRule @ruleId, @userId
    db.activateRule @ruleId, @userId

    # We need to wait here and there since these calls are asynchronous
    fWaitForTest = () =>

      # Ensure the user is unlinked to the rule
      db.getUserLinkedRules @userId, ( err, obj ) =>
        test.ok @ruleId not in obj,
          "Rule #{ @ruleId } still linked to user #{ @userId }"

        # Ensure the rule is deactivated for the user
        db.getUserActivatedRules @userId, ( err, obj ) =>
          test.ok @ruleId not in obj,
            "Rule #{ @ruleId } still activated for user #{ @userId }"
          db.shutDown()
          test.done()

    fWaitForDeletion = () =>
      db.deleteRule @ruleId
      setTimeout fWaitForTest, 100

    setTimeout fWaitForDeletion, 100


###
# Test USER
###
exports.User = 
  setUp: ( cb ) =>
    @oUser =
      username: "tester-1"
      password: "password"
    cb()
  tearDown: ( cb ) =>
    db = getDBInstance()
    console.log 'tearDown'
    # db.deleteUser @oUser.username
    setTimeout db.shutDown, 500
    cb()

  testCreateInvalid: ( test ) =>
    test.expect 4
    
    oUserInvOne =
      username: "tester-1-invalid"
    oUserInvTwo =
      password: "password"

    db = getDBInstance()
    # try to store invalid users, ensure they weren't 
    db.storeUser oUserInvOne
    db.storeUser oUserInvTwo

    db.getUser oUserInvOne.username, ( err, obj ) =>
      test.strictEqual obj, null,
        'User One was stored!?'

      db.getUser oUserInvTwo.username, ( err, obj ) =>
        test.strictEqual obj, null,
          'User Two was stored!?'

        db.getUserIds ( err, obj ) =>
          test.ok oUserInvOne.username not in obj,
            'User key was stored!?'
          test.ok oUserInvTwo.username not in obj,
            'User key was stored!?'
          db.shutDown()
          test.done()

  testDelete: ( test ) =>
    test.expect 2

    db = getDBInstance()
    # Store the user
    db.storeUser @oUser

    db.getUser @oUser.username, ( err, obj ) =>
      test.deepEqual obj, @oUser,
        "User #{ @oUser.username } is not what we expect!"

      db.getUserIds ( err, obj ) =>
        test.ok @oUser.username in obj,
          'User key was not stored!?'
        db.shutDown()
        test.done()

  testUpdate: ( test ) =>
    test.expect 2

    oUserOne =
      username: "tester-1-update"
      password: "password"

    db = getDBInstance()
    # Store the user
    db.storeUser oUserOne
    oUserOne.password = "password-update"
    db.storeUser oUserOne

    db.getUser oUserOne.username, ( err, obj ) =>
      test.deepEqual obj, oUserOne,
        "User #{ @oUser.username } is not what we expect!"

      db.getUserIds ( err, obj ) =>
        test.ok oUserOne.username in obj,
          'User key was not stored!?'
        db.deleteUser oUserOne.username
        setTimeout db.shutDown, 500
        test.done()

  testDelete: ( test ) =>
    test.expect 2

    db = getDBInstance()
    # Wait until the user and his rules and roles are deleted
    fWaitForDeletion = () =>
      db.getUserIds ( err, obj ) =>
        test.ok @oUser.username not in obj,
          'User key still in set!'

        db.getUser @oUser.username, ( err, obj ) =>
          test.strictEqual obj, null,
            'User key still exists!'
          test.done()

    # Store the user and make some links
    db.storeUser @oUser
    db.deleteUser @oUser.username
    setTimeout fWaitForDeletion, 100


  testDeleteLinks: ( test ) =>
    test.expect 4

    db = getDBInstance()

    # Wait until the user and his rules and roles are stored
    fWaitForPersistence = () =>
      console.log 'fWaitForPer'
      # db.deleteUser @oUser.username
      db.getRoleUsers 'tester', (err, obj) ->
        console.log 'getRoleUsers tester'
        console.log err
        console.log obj
      # setTimeout fWaitForDeletion, 200

    # # Wait until the user and his rules and roles are deleted
    # fWaitForDeletion = () =>
    #   console.log 'fWaitForDel'
    #   db.getRoleUsers 'tester', ( err, obj ) =>
    #   # db.getUserRoles @oUser.username, ( err, obj ) =>
    #     console.log 'got users: '
    #     console.log obj
    #     test.ok @oUser.username not in obj,
    #       'User key still in role tester!'

    #     console.log '21'
    #     db.getUserRoles @oUser.username, ( err, obj ) =>
    #       test.ok obj.length is 0,
    #         'User still associated to roles!'
          
    #       console.log '22'
    #       db.getUserLinkedRules @oUser.username, ( err, obj ) =>
    #         test.ok obj.length is 0,
    #           'User still associated to rules!'
    #         console.log '23'
    #         db.getUserActivatedRules @oUser.username, ( err, obj ) =>
    #           test.ok obj.length is 0,
    #             'User still associated to activated rules!'
    #           db.shutDown()
    #           test.done()

    # # Store the user and make some links
    # db.storeUser @oUser
    # db.linkRule 'rule-1', @oUser.username
    # db.linkRule 'rule-2', @oUser.username
    # db.linkRule 'rule-3', @oUser.username
    # db.activateRule 'rule-1', @oUser.username
    # db.storeUserRole @oUser.username, 'tester'
    
    setTimeout fWaitForPersistence, 100


  testLogin: ( test ) =>
    test.expect 3

    db = getDBInstance()
    # Store the user and make some links
    db.storeUser @oUser
    db.loginUser @oUser.username, @oUser.password, ( err, obj ) =>
      test.deepEqual obj, @oUser,
        'User not logged in!'

      db.loginUser 'dummyname', @oUser.password, ( err, obj ) =>
        test.strictEqual obj, null,
          'User logged in?!'

        db.loginUser @oUser.username, 'wrongpass', ( err, obj ) =>
          test.strictEqual obj, null,
            'User logged in?!'
          db.shutDown()
          test.done()


###
# Test ROLES
###
exports.Roles = 
  setUp: ( cb ) =>
    @oUser =
      username: "tester-1"
      password: "password"
    cb()
  tearDown: ( cb ) =>
    db = getDBInstance()
    db.deleteUser @oUser.username
    setTimeout db.shutDown, 500
    cb()

  testStore: ( test ) =>
    test.expect 2

    db = getDBInstance()
    db.storeUser @oUser
    db.storeUserRole @oUser.username, 'tester'

    db.getUserRoles @oUser.username, ( err, obj ) =>
      test.ok 'tester' in obj,
        'User role tester not stored!'

      db.getRoleUsers 'tester', ( err, obj ) =>
        test.ok @oUser.username in obj,
          "User #{ @oUser.username } not stored in role tester!"
        db.shutDown()
        test.done()

  testDelete: ( test ) =>
    test.expect 2

    db = getDBInstance()
    db.storeUser @oUser
    db.storeUserRole @oUser.username, 'tester'
    db.removeUserRole @oUser.username, 'tester'

    db.getUserRoles @oUser.username, ( err, obj ) =>
      test.ok 'tester' not in obj,
        'User role tester not stored!'

      db.getRoleUsers 'tester', ( err, obj ) =>
        test.ok @oUser.username not in obj,
          "User #{ @oUser.username } not stored in role tester!"
        db.shutDown()
        test.done()
    # store an entry to start with 
