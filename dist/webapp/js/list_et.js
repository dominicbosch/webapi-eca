'use strict';
var deleteModule, fOnLoad, sendStartStopCommand, start, startStopModule, strPublicKey, updateModules, updatePlayButton, urlService;

urlService = '/service/eventtrigger';

strPublicKey = '';

main.post('/service/session/publickey').done(function(key) {
  return strPublicKey = key;
}).fail(function(err) {
  return main.setInfo(false, 'Unable to fetch public key for encryption');
});

updateModules = function(uid) {
  var req;
  d3.select('#moduleparams').style('visibility', 'hidden');
  req = main.post(urlService + '/get');
  req.done(function(arrModules) {
    var img, parent, tr, trNew;
    if (arrModules.length === 0) {
      parent = $('#tableModules').parent();
      $('#tableModules').remove();
      return parent.append($("<h3 class=\"empty\">No Event Triggers available! <a href=\"/views/modules_create?m=et\">Create One first!</a></h3>"));
    } else {
      tr = d3.select('#tableModules tbody').selectAll('tr').data(arrModules, function(d) {
        return d.id;
      });
      tr.exit().remove();
      trNew = tr.enter().append('tr');
      trNew.append('td').each(function(d) {
        if (d.UserId === uid) {
          return d3.select(this).append('img').attr('class', 'icon del').attr('src', '/images/del.png').attr('title', 'Delete Module').on('click', deleteModule);
        }
      });
      trNew.append('td').append('img').attr('class', 'icon edit').attr('src', '/images/edit.png').attr('title', 'Edit Module').on('click', function(d) {
        return window.location.href = 'modules_create?m=et&id=' + d.id;
      });
      img = trNew.append('td').append('img').attr('id', function(d) {
        return 'ico' + d.id;
      }).attr('class', function(d) {
        return 'icon edit';
      }).on('click', startStopModule);
      updatePlayButton(img);
      trNew.append('td').append('div').text(function(d) {
        return d.name;
      }).each(function(d) {
        if (d.comment) {
          return main.registerHoverInfoHTML(d3.select(this), d.comment);
        }
      });
      trNew.append('td').text(function(d) {
        return d.User.username;
      });
      return trNew.append('td').attr('class', 'consoled mediumfont').text(function(d) {
        return d.Schedule.schedule;
      });
    }
  });
  return req.fail(function(err) {
    return main.setInfo(false, 'Error in fetching all Modules: ' + err.responseText);
  });
};

updatePlayButton = function(d3This) {
  return d3This.attr('src', function(d) {
    return '/images/' + (d.Schedule.running ? 'pause' : 'play') + '.png';
  }).attr('title', function(d) {
    if (d.Schedule.running) {
      return 'Stop Module';
    } else {
      return 'Start Module';
    }
  });
};

deleteModule = function(d) {
  if (confirm('Do you really want to delete the Module "' + d.name + '"?')) {
    return main.post(urlService + '/delete', {
      id: d.id
    }).done(function() {
      main.setInfo(true, 'Action Dispatcher deleted!', true);
      return updateModules(parseInt(d3.select('body').attr('data-uid')));
    }).fail(function(err) {
      return main.setInfo(false, err.responseText);
    });
  }
};

startStopModule = function(d) {
  var arr, newTr;
  if (d.Schedule.running) {
    d3.select('#moduleparams').style('visibility', 'hidden');
    return sendStartStopCommand(d, 'stop');
  } else {
    arr = Object.keys(d.globals);
    d3.select('#moduleparams tbody').selectAll('tr').remove();
    if (arr.length === 0) {
      d3.select('#moduleparams tbody').append('tr').append('td').classed('consoled', true).text('No parameters required');
    } else {
      newTr = d3.select('#moduleparams tbody').selectAll('tr').data(arr).enter().append('tr');
      newTr.append('td').text(function(d) {
        return d;
      });
      newTr.append('td').append('input').attr('type', function(nd) {
        if (d.globals[nd]) {
          return 'password';
        } else {
          return 'text';
        }
      }).on('change', function() {
        return d3.select(this).attr('changed', 'yes');
      });
    }
    d3.select('#moduleparams button').attr('onclick', 'start(' + d.id + ')');
    return d3.select('#moduleparams').style('visibility', 'visible');
  }
};

start = function(id) {
  var data, err, error, globals;
  data = d3.select('#ico' + id).data()[0];
  try {
    globals = {};
    d3.selectAll('#moduleparams input').each(function(d) {
      var d3This, val;
      d3This = d3.select(this);
      val = d3This.node().value;
      if (val === '') {
        d3This.node().focus();
        throw new Error('Please enter a value in all required fields!');
      }
      if (data.globals[d] && d3This.attr('changed') === 'yes') {
        val = cryptico.encrypt(val, strPublicKey).cipher;
      }
      return globals[d] = val;
    });
    return sendStartStopCommand(data, 'start', globals);
  } catch (error) {
    err = error;
    return main.setInfo(false, err.message);
  }
};

sendStartStopCommand = function(d, action, data) {
  var req;
  d3.select('#moduleparams').style('visibility', 'hidden');
  req = main.post(urlService + '/' + action + '/' + d.id, data);
  req.done(function() {
    action = d.Schedule.running ? 'stopped' : 'started';
    d.Schedule.running = !d.Schedule.running;
    updatePlayButton(d3.select('#ico' + d.id));
    return main.setInfo(true, 'Event Trigger ' + action);
  });
  return req.fail(function(err) {
    action = d.Schedule.running ? 'stop' : 'start';
    return main.setInfo(false, 'Unable to ' + action + ' Event Trigger');
  });
};

fOnLoad = function() {
  $('#linkMod').attr('href', '/views/modules_create?m=et');
  d3.select('#tableModules thead tr').append('th').text('Schedule');
  d3.select('#tableModules thead tr').insert('th', ':first-child');
  return updateModules(parseInt(d3.select('body').attr('data-uid')));
};

window.addEventListener('load', fOnLoad, true);
