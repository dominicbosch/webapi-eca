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
log = logger.getLogger
  nolog: true
db = require path.join '..', 'js-coffee', 'persistence'
opts =
  logger: log
opts[ 'db-port' ] = 6379
db opts

# ###
# # Test AVAILABILITY
# ###
exports.Availability =
  testRequire: ( test ) =>
    test.expect 1
    test.ok db, 'DB interface loaded'
    test.done()

  testConnect: ( test ) =>
    test.expect 1
    db.isConnected ( err ) ->
      test.ifError err, 'Connection failed!'
      test.done()

  # We cannot test for no db-port, since node-redis then assumes standard port
  testWrongDbPort: ( test ) =>
    test.expect 1
     
    db.initPort 13410
    db.isConnected ( err ) ->
      test.ok err, 'Still connected!?'
      db.initPort 6379
      test.done()

  testPurgeQueue: ( test ) =>
    test.expect 2

    db.pushEvent objects.events.evt1
    db.purgeEventQueue()
    db.popEvent ( err, obj ) =>
      test.ifError err, 'Error during pop after purging!'
      test.strictEqual obj, null, 'There was an event in the queue!?'
      test.done()


###
# Test EVENT QUEUE
###
exports.EventQueue =

  testEmptyPopping: ( test ) =>
    test.expect 2
    
    db.purgeEventQueue()
    db.popEvent ( err, obj ) =>
      test.ifError err,
        'Error during pop after purging!'
      test.strictEqual obj, null,
        'There was an event in the queue!?'
      test.done()

  testEmptyPushing: ( test ) =>
    test.expect 2

    db.pushEvent null
    db.popEvent ( err, obj ) =>
      test.ifError err,
        'Error during non-empty pushing!'
      test.strictEqual obj, null,
        'There was an event in the queue!?'
      
      test.done()

  testNonEmptyPopping: ( test ) =>
    test.expect 3

    db.pushEvent objects.events.evt1
    db.popEvent ( err, obj ) =>
      test.ifError err,
        'Error during non-empty popping!'
      test.notStrictEqual obj, null,
        'There was no event in the queue!'
      test.deepEqual objects.events.evt1, obj,
        'Wrong event in queue!'
      
      test.done()

  testMultiplePushAndPops: ( test ) =>
    test.expect 6

    semaphore = 2
    forkEnds = () ->
      if --semaphore is 0
        
        test.done()

    db.pushEvent objects.events.evt1
    db.pushEvent objects.events.evt2
    # eventually it would be wise to not care about the order of events
    db.popEvent ( err, obj ) =>
      test.ifError err,
        'Error during multiple push and pop!'
      test.notStrictEqual obj, null,
        'There was no event in the queue!'
      test.deepEqual objects.events.evt1, obj,
        'Wrong event in queue!'
      forkEnds()
    db.popEvent ( err, obj ) =>
      test.ifError err,
        'Error during multiple push and pop!'
      test.notStrictEqual obj, null,
        'There was no event in the queue!'
      test.deepEqual objects.events.evt2, obj,
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
    cb()
 
  tearDown: ( cb ) =>
    db.eventPollers.unlinkModule @event1id, @userId
    db.eventPollers.deleteModule @event1id
    db.eventPollers.unlinkModule @event2id, @userId
    db.eventPollers.deleteModule @event2id
    cb()

  testCreateAndRead: ( test ) =>
    test.expect 3
    db.eventPollers.storeModule @event1id, @userId, objects.eps.ep1
    
        # test that the ID shows up in the set
    db.eventPollers.getModuleIds ( err , obj ) =>
      test.ok @event1id in obj,
        'Expected key not in event-pollers set'
      
      # the retrieved object really is the one we expected
      db.eventPollers.getModule @event1id, ( err , obj ) =>
        test.deepEqual obj, objects.eps.ep1,
          'Retrieved Event Poller is not what we expected'
        
        # Ensure the event poller is in the list of all existing ones
        db.eventPollers.getModules ( err , obj ) =>
          test.deepEqual objects.eps.ep1, obj[@event1id],
            'Event Poller ist not in result set'
          
          
          test.done()
          
  testUpdate: ( test ) =>
    test.expect 2

    # store an entry to start with 
    db.eventPollers.storeModule @event1id, @userId, objects.eps.ep1
    db.eventPollers.storeModule @event1id, @userId, objects.eps.ep2

    # the retrieved object really is the one we expected
    db.eventPollers.getModule @event1id, ( err , obj ) =>
      test.deepEqual obj, objects.eps.ep2,
        'Retrieved Event Poller is not what we expected'
        
      # Ensure the event poller is in the list of all existing ones
      db.eventPollers.getModules ( err , obj ) =>
        test.deepEqual objects.eps.ep2, obj[@event1id],
          'Event Poller ist not in result set'
        
        test.done()

  testDelete: ( test ) =>
    test.expect 2

    # store an entry to start with 
    db.eventPollers.storeModule @event1id, @userId, objects.eps.ep1

    # Ensure the event poller has been deleted
    db.eventPollers.deleteModule @event1id
    db.eventPollers.getModule @event1id, ( err , obj ) =>
      test.strictEqual obj, null,
        'Event Poller still exists'
      
      # Ensure the ID has been removed from the set
      db.eventPollers.getModuleIds ( err , obj ) =>
        test.ok @event1id not in obj,
          'Event Poller key still exists in set'
        
        test.done()
  

  testFetchSeveral: ( test ) =>
    test.expect 3

    semaphore = 2

    fCheckInvoker = ( modname, mod ) =>
      myTest = test
      forkEnds = () ->
        if --semaphore is 0
          
          myTest.done()
      ( err, obj ) =>
        myTest.deepEqual mod, obj,
          "Invoker #{ modname } does not equal the expected one"
        forkEnds()

    db.eventPollers.storeModule @event1id, @userId, objects.eps.ep1
    db.eventPollers.storeModule @event2id, @userId, objects.eps.ep2
    db.eventPollers.getModuleIds ( err, obj ) =>
      test.ok @event1id in obj and @event2id in obj,
        'Not all event poller Ids in set'
      db.eventPollers.getModule @event1id, fCheckInvoker @event1id, objects.eps.ep1 
      db.eventPollers.getModule @event2id, fCheckInvoker @event2id, objects.eps.ep2


###
# Test EVENT POLLER PARAMS
###
exports.EventPollerParams =
  testCreateAndRead: ( test ) =>
    test.expect 2

    userId = 'tester1'
    eventId = 'test-event-poller_1'
    params = 'shouldn\'t this be an object?'

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
        test.done()

  testUpdate: ( test ) =>
    test.expect 1

    userId = 'tester1'
    eventId = 'test-event-poller_1'
    params = 'shouldn\'t this be an object?'
    paramsNew = 'shouldn\'t this be a new object?'

    # store an entry to start with 
    db.eventPollers.storeUserParams eventId, userId, params
    db.eventPollers.storeUserParams eventId, userId, paramsNew

    # the retrieved object really is the one we expected
    db.eventPollers.getUserParams eventId, userId, ( err, obj ) =>
      test.strictEqual obj, paramsNew,
        'Retrieved event params is not what we expected'
      db.eventPollers.deleteUserParams eventId, userId
      
      test.done()

  testDelete: ( test ) =>
    test.expect 2

    userId = 'tester1'
    eventId = 'test-event-poller_1'
    params = 'shouldn\'t this be an object?'

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
        
        test.done()


###
# Test RULES
###
exports.Rules =
  setUp: ( cb ) =>
    @userId = 'tester-1'
    @ruleId = 'test-rule_1'
    cb()

  tearDown: ( cb ) =>
    db.deleteRule @ruleId
    cb()

  testCreateAndRead: ( test ) =>
    test.expect 3

    # store an entry to start with 
    db.storeRule @ruleId, JSON.stringify objects.rules.ruleOne
    
    # test that the ID shows up in the set
    db.getRuleIds ( err, obj ) =>
      test.ok @ruleId in obj,
        'Expected key not in rule key set'
      
      # the retrieved object really is the one we expected
      db.getRule @ruleId, ( err, obj ) =>
        test.deepEqual JSON.parse(obj), objects.rules.ruleOne,
          'Retrieved rule is not what we expected'

        # Ensure the rule is in the list of all existing ones
        db.getRules ( err , obj ) =>
          test.deepEqual objects.rules.ruleOne, JSON.parse( obj[@ruleId] ),
            'Rule not in result set'
          
          test.done()

  testUpdate: ( test ) =>
    test.expect 1

    # store an entry to start with 
    db.storeRule @ruleId, JSON.stringify objects.rules.ruleOne
    db.storeRule @ruleId, JSON.stringify objects.rules.ruleTwo

    # the retrieved object really is the one we expected
    db.getRule @ruleId, ( err, obj ) =>
      test.deepEqual JSON.parse(obj), objects.rules.ruleTwo,
        'Retrieved rule is not what we expected'
      
      test.done()

  testDelete: ( test ) =>
    test.expect 2

    # store an entry to start with and delete it right away
    db.storeRule @ruleId, JSON.stringify objects.rules.ruleOne
    db.deleteRule @ruleId
    
    # Ensure the event params have been deleted
    db.getRule @ruleId, ( err, obj ) =>
      test.strictEqual obj, null,
        'Rule still exists'

      # Ensure the ID has been removed from the set
      db.getRuleIds ( err, obj ) =>
        test.ok @ruleId not in obj,
          'Rule key still exists in set'
        
        test.done()

  testLink: ( test ) =>
    test.expect 2

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
        
        test.done()

  testUnlink: ( test ) =>
    test.expect 2

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
        
        test.done()

  testActivate: ( test ) =>
    test.expect 4

    usr =
      username: "tester-1"
      password: "tester-1"
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
          
          test.done()

  testDeactivate: ( test ) =>
    test.expect 3

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
          
          test.done()

  testUnlinkAndDeactivateAfterDeletion: ( test ) =>
    test.expect 2

    # store an entry to start with and link it to te user
    db.storeRule @ruleId, JSON.stringify objects.rules.ruleOne
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
          
          test.done()

    fWaitForDeletion = () =>
      db.deleteRule @ruleId
      setTimeout fWaitForTest, 300

    setTimeout fWaitForDeletion, 100


###
# Test USER
###
exports.User = 

  tearDown: ( cb ) =>
    db.deleteUser objects.users.userOne.username
    cb()

  testCreateInvalid: ( test ) =>
    test.expect 4
    
    oUserInvOne =
      username: "tester-1-invalid"
    oUserInvTwo =
      password: "password"

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
          test.done()

  testDelete: ( test ) =>
    test.expect 2

    oUsr = objects.users.userOne
    # Store the user
    db.storeUser oUsr

    db.getUser oUsr.username, ( err, obj ) =>
      test.deepEqual obj, oUsr,
        "User #{ objects.users.userOne.username } is not what we expect!"

      db.getUserIds ( err, obj ) =>
        test.ok oUsr.username in obj,
          'User key was not stored!?'
        
        test.done()

  testUpdate: ( test ) =>
    test.expect 2

    oUsr = objects.users.userOne

    # Store the user
    db.storeUser oUsr
    oUsr.password = "password-update"
    db.storeUser oUsr

    db.getUser oUsr.username, ( err, obj ) =>
      test.deepEqual obj, oUsr,
        "User #{ oUsr.username } is not what we expect!"

      db.getUserIds ( err, obj ) =>
        test.ok oUsr.username in obj,
          'User key was not stored!?'
        db.deleteUser oUsr.username
        test.done()

  testDelete: ( test ) =>
    test.expect 2

    oUsr = objects.users.userOne

    # Wait until the user and his rules and roles are deleted
    fWaitForDeletion = () =>
      db.getUserIds ( err, obj ) =>
        test.ok oUsr.username not in obj,
          'User key still in set!'

        db.getUser oUsr.username, ( err, obj ) =>
          test.strictEqual obj, null,
            'User key still exists!'
          test.done()

    # Store the user and make some links
    db.storeUser oUsr
    db.deleteUser oUsr.username
    setTimeout fWaitForDeletion, 100


  testDeleteLinks: ( test ) =>
    test.expect 4

    oUsr = objects.users.userOne

    # Wait until the user and his rules and roles are stored
    fWaitForPersistence = () =>
      db.deleteUser oUsr.username
      setTimeout fWaitForDeletion, 200

    # Wait until the user and his rules and roles are deleted
    fWaitForDeletion = () =>
      db.getRoleUsers 'tester', ( err, obj ) =>
        test.ok oUsr.username not in obj,
          'User key still in role tester!'

        db.getUserRoles oUsr.username, ( err, obj ) =>
          test.ok obj.length is 0,
            'User still associated to roles!'
          
          db.getUserLinkedRules oUsr.username, ( err, obj ) =>
            test.ok obj.length is 0,
              'User still associated to rules!'
            db.getUserActivatedRules oUsr.username, ( err, obj ) =>
              test.ok obj.length is 0,
                'User still associated to activated rules!'
              test.done()

    # Store the user and make some links
    db.storeUser oUsr
    db.linkRule 'rule-1', oUsr.username
    db.linkRule 'rule-2', oUsr.username
    db.linkRule 'rule-3', oUsr.username
    db.activateRule 'rule-1', oUsr.username
    db.storeUserRole oUsr.username, 'tester'
    
    setTimeout fWaitForPersistence, 100


  testLogin: ( test ) =>
    test.expect 3

    oUsr = objects.users.userOne
    # Store the user and make some links
    db.storeUser oUsr
    db.loginUser oUsr.username, oUsr.password, ( err, obj ) =>
      test.deepEqual obj, oUsr,
        'User not logged in!'

      db.loginUser 'dummyname', oUsr.password, ( err, obj ) =>
        test.strictEqual obj, null,
          'User logged in?!'

        db.loginUser oUsr.username, 'wrongpass', ( err, obj ) =>
          test.strictEqual obj, null,
            'User logged in?!'
          
          test.done()


###
# Test ROLES
###
exports.Roles = 
  tearDown: ( cb ) =>
    db.deleteUser objects.users.userOne.username
    cb()

  testStore: ( test ) =>
    test.expect 2

    oUsr = objects.users.userOne
    db.storeUser oUsr
    db.storeUserRole oUsr.username, 'tester'

    db.getUserRoles oUsr.username, ( err, obj ) =>
      test.ok 'tester' in obj,
        'User role tester not stored!'

      db.getRoleUsers 'tester', ( err, obj ) =>
        test.ok oUsr.username in obj,
          "User #{ oUsr.username } not stored in role tester!"
        
        test.done()

  testDelete: ( test ) =>
    test.expect 2

    oUsr = objects.users.userOne
    db.storeUser oUsr
    db.storeUserRole oUsr.username, 'tester'
    db.removeUserRole oUsr.username, 'tester'

    db.getUserRoles oUsr.username, ( err, obj ) =>
      test.ok 'tester' not in obj,
        'User role tester not stored!'

      db.getRoleUsers 'tester', ( err, obj ) =>
        test.ok oUsr.username not in obj,
          "User #{ oUsr.username } not stored in role tester!"
        
        test.done()
    # store an entry to start with 
