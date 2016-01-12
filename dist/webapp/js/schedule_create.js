'use strict';
var arrSelectedActions, attachListeners, fOnLoad, loadSchedule, strPublicKey;

strPublicKey = '';

arrSelectedActions = [];

fOnLoad = function() {
  var addPromise, afterwards, arrPromises;
  main.registerHoverInfo(d3.select('#schedule'), 'schedule.html');
  arrPromises = [];
  addPromise = function(url, thenFunc, failMsg) {
    var p;
    p = new Promise(function(resolve, reject) {
      return main.post(url).done(function(dat) {
        return resolve(dat);
      }).fail(function(err) {
        return reject(new Error(failMsg));
      });
    });
    return arrPromises.push(p.then(thenFunc));
  };
  afterwards = function(key) {
    return strPublicKey = key;
  };
  addPromise('/service/session/publickey', afterwards, 'Error when fetching public key. Unable to send user specific parameters securely!');
  addPromise('/service/eventtrigger/get', functions.fillList, 'Unable to fetch Event Triggers');
  return Promise.all(arrPromises).then(function() {
    if (oParams.id === void 0) {
      return null;
    } else {
      return loadSchedule();
    }
  }).then(functions.init(true, strPublicKey)).then(attachListeners).then(function() {
    $('#input_name').get(0).setSelectionRange(0, 0);
    return $('#input_name').focus();
  })["catch"](function(err) {
    return main.setInfo(false, err.toString());
  });
};

loadSchedule = function() {
  return new Promise(function(resolve, reject) {
    return main.post('/service/schedule/get/' + oParams.id).done(function(oSched) {
      $('#input_name').val(oSched.name);
      $('#inp_schedule').val(oSched.text);
      functions.fillExisting([oSched.execute]);
      d3.select('#mainbody h1').text('Update Schedule');
      return resolve('Schedule loaded');
    }).fail(function() {
      oParams.id = void 0;
      main.setInfo(false, 'Unable to edit this schedule since it is not existing!');
      return resolve('Schedule not loaded');
    });
  });
};

attachListeners = function() {
  return $('#but_submit').click(function() {
    var arrExecution, cmd, err, error, obj, schedule, txt;
    main.clearInfo(true);
    try {
      if ($('#input_name').val() === '') {
        $('#input_name').focus();
        throw new Error('Please enter a Schedule name!');
      }
      arrExecution = functions.getSelected();
      if (arrExecution.length === 0) {
        throw new Error('Please select an Event Trigger!');
      }
      obj = {
        name: $('#input_name').val(),
        execute: arrExecution[0]
      };
      txt = $('#input_schedule').val();
      schedule = later.parse.text(txt);
      if (schedule.error > -1) {
        throw new Error('You have an error in your schedule!');
      }
      obj.schedule = {
        text: txt,
        arr: schedule.schedules
      };
      if (oParams.id === void 0) {
        cmd = 'create';
      } else {
        obj.id = oParams.id;
        cmd = 'update';
      }
      return main.post('/service/schedule/' + cmd, obj).done(function(msg) {
        main.setInfo(true, 'Schedule ' + (oParams.id === void 0 ? 'stored!' : 'updated!'));
        return setTimeout(function() {
          return window.location.href = 'list_et';
        }, 500);
      }).fail(function(err) {
        return main.setInfo(false, err.responseText);
      });
    } catch (error) {
      err = error;
      console.log(err);
      return main.setInfo(false, 'Error in upload: ' + err.message);
    }
  });
};

window.addEventListener('load', fOnLoad, true);
