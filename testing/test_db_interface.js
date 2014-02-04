// Generated by CoffeeScript 1.6.3
(function() {
  var _this = this;

  exports.setUp = function(cb) {
    _this.db = require('../js-coffee/db_interface');
    _this.db({
      logType: 2
    });
    return cb();
  };

  exports.availability = {
    testRequire: function(test) {
      test.expect(1);
      test.ok(_this.db, 'DB interface loaded');
      return test.done();
    },
    testConnect: function(test) {
      test.expect(1);
      return _this.db.isConnected(function(err) {
        test.ifError(err, 'Connection failed!');
        return test.done();
      });
    },
    testNoConfig: function(test) {
      test.expect(1);
      _this.db({
        configPath: 'nonexistingconf.file'
      });
      return _this.db.isConnected(function(err) {
        test.ok(err, 'Still connected!?');
        return test.done();
      });
    },
    testWrongConfig: function(test) {
      test.expect(1);
      _this.db({
        configPath: 'testing/jsonWrongConfig.json'
      });
      return _this.db.isConnected(function(err) {
        test.ok(err, 'Still connected!?');
        return test.done();
      });
    },
    testPurgeQueue: function(test) {
      test.expect(2);
      _this.db.pushEvent(_this.evt1);
      _this.db.purgeEventQueue();
      return _this.db.popEvent(function(err, obj) {
        test.ifError(err, 'Error during pop after purging!');
        test.strictEqual(obj, null, 'There was an event in the queue!?');
        return test.done();
      });
    }
  };

  exports.events = {
    setUp: function(cb) {
      _this.evt1 = {
        eventid: '1',
        event: 'mail'
      };
      _this.evt2 = {
        eventid: '2',
        event: 'mail'
      };
      _this.db.purgeEventQueue();
      return cb();
    },
    testEmptyPopping: function(test) {
      test.expect(2);
      return _this.db.popEvent(function(err, obj) {
        test.ifError(err, 'Error during pop after purging!');
        test.strictEqual(obj, null, 'There was an event in the queue!?');
        return test.done();
      });
    },
    testEmptyPushing: function(test) {
      test.expect(2);
      _this.db.pushEvent(null);
      return _this.db.popEvent(function(err, obj) {
        test.ifError(err, 'Error during non-empty pushing!');
        test.strictEqual(obj, null, 'There was an event in the queue!?');
        return test.done();
      });
    },
    testPushing: function(test) {
      var fPush;
      test.expect(1);
      fPush = function() {
        this.db.pushEvent(null);
        return this.db.pushEvent(this.evt1);
      };
      test.throws(fPush, Error, 'This should not throw an error');
      return test.done();
    },
    testNonEmptyPopping: function(test) {
      test.expect(3);
      _this.db.pushEvent(_this.evt1);
      return _this.db.popEvent(function(err, obj) {
        test.ifError(err, 'Error during non-empty popping!');
        test.notStrictEqual(obj, null, 'There was no event in the queue!');
        test.deepEqual(_this.evt1, obj, 'Wrong event in queue!');
        return test.done();
      });
    },
    testMultiplePushAndPops: function(test) {
      var isFinished, numForks;
      test.expect(6);
      numForks = 2;
      isFinished = function() {
        if (--numForks === 0) {
          return test.done();
        }
      };
      _this.db.pushEvent(_this.evt1);
      _this.db.pushEvent(_this.evt2);
      _this.db.popEvent(function(err, obj) {
        test.ifError(err, 'Error during multiple push and pop!');
        test.notStrictEqual(obj, null, 'There was no event in the queue!');
        test.deepEqual(_this.evt1, obj, 'Wrong event in queue!');
        return isFinished();
      });
      return _this.db.popEvent(function(err, obj) {
        test.ifError(err, 'Error during multiple push and pop!');
        test.notStrictEqual(obj, null, 'There was no event in the queue!');
        test.deepEqual(_this.evt2, obj, 'Wrong event in queue!');
        return isFinished();
      });
    }
  };

  exports.action_modules = {
    test: function(test) {
      test.ok(false, 'implement testing!');
      return test.done();
    }
  };

  exports.event_modules = {
    test: function(test) {
      return test.done();
    }
  };

  exports.rules = {
    test: function(test) {
      return test.done();
    }
  };

  exports.users = {
    test: function(test) {
      return test.done();
    }
  };

  exports.tearDown = function(cb) {
    _this.db.shutDown();
    return cb();
  };

}).call(this);
