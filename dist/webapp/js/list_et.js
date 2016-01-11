'use strict';
var clearDataLog, clearLog, deleteModule, fOnLoad, sendStartStopCommand, showDataLog, showLog, start, startStopModule, strPublicKey, updateModules, updatePlayButton, updateSchedules;

strPublicKey = '';

main.post('/service/session/publickey').done(function(key) {
  return strPublicKey = key;
}).fail(function(err) {
  return main.setInfo(false, 'Unable to fetch public key for encryption');
});

updateModules = function(uid) {
  var req;
  d3.select('#moduleparams').style('visibility', 'hidden');
  req = main.post('/service/eventtrigger/get');
  req.done(function(arrModules) {
    var parent, tr, trNew;
    if (arrModules.length === 0) {
      parent = $('#tableModules').parent();
      $('#tableModules').remove();
      return parent.append($("<h3 class=\"empty\">No <b>Event Triggers</b> available! <a href=\"/views/modules_create?m=et\">Create One first!</a></h3>"));
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
      trNew.append('td').append('div').text(function(d) {
        return d.name;
      }).each(function(d) {
        if (d.comment) {
          return main.registerHoverInfoHTML(d3.select(this), d.comment);
        }
      });
      return trNew.append('td').text(function(d) {
        return d.User.username;
      });
    }
  });
  return req.fail(function(err) {
    return main.setInfo(false, 'Error in fetching all Modules: ' + err.responseText);
  });
};

deleteModule = function(d) {
  if (confirm('Do you really want to delete the Module "' + d.name + '"? All running Schedules that use this module will be deleted!')) {
    return main.post('/service/eventtrigger/delete', {
      id: d.id
    }).done(function() {
      main.setInfo(true, 'Event Trigger deleted!', true);
      updateModules(parseInt(d3.select('body').attr('data-uid')));
      return updateSchedules();
    }).fail(function(err) {
      return main.setInfo(false, err.responseText);
    });
  }
};

startStopModule = function(d) {
  var arr, newTr;
  if (d.running) {
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
  req = main.post('/service/eventtrigger/' + action + '/' + d.id, data);
  req.done(function() {
    action = d.running ? 'stopped' : 'started';
    d.running = !d.running;
    updatePlayButton(d3.select('#ico' + d.id));
    return main.setInfo(true, 'Event Trigger ' + action);
  });
  return req.fail(function(err) {
    action = d.running ? 'stop' : 'start';
    return main.setInfo(false, 'Unable to ' + action + ' Event Trigger');
  });
};

fOnLoad = function() {
  updateModules(parseInt(d3.select('body').attr('data-uid')));
  return updateSchedules();
};

window.addEventListener('load', fOnLoad, true);

updateSchedules = function() {
  var req;
  req = main.post('/service/schedule/get');
  return req.done(function(arrSchedules) {
    var img, parent, tr, trNew;
    console.log(arrSchedules);
    if (arrSchedules.length === 0) {
      parent = $('#tableSchedules').parent();
      $('#tableSchedules').remove();
      return parent.append($("<h3 class=\"empty\">No <b>Schedules</b> available! <a href=\"/views/schedule_create\">Create One first!</a></h3>"));
    } else {
      tr = d3.select('#tableSchedules tbody').selectAll('tr').data(arrSchedules, function(d) {
        return d.id;
      });
      tr.exit().remove();
      trNew = tr.enter().append('tr');
      trNew.append('td').each(function(d) {
        return d3.select(this).append('img').attr('class', 'icon del').attr('src', '/images/del.png').attr('title', 'Delete Module').on('click', deleteModule);
      });
      trNew.append('td').append('img').attr('class', 'icon edit').attr('src', '/images/edit.png').attr('title', 'Edit Module').on('click', function(d) {
        return window.location.href = 'modules_create?m=et&id=' + d.id;
      });
      trNew.append('td').append('img').attr('class', 'icon log').attr('src', '/images/log.png').attr('title', 'Show Rule Log').on('click', showLog);
      trNew.append('td').append('img').attr('class', 'icon log').attr('src', '/images/bulk.png').attr('title', 'Download Data Log').on('click', showDataLog);
      trNew.append('td').append('img').attr('class', 'icon log').attr('src', '/images/bulk_del.png').attr('title', 'Delete Data Log').on('click', clearDataLog);
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
      trNew.append('td').attr('class', 'consoled mediumfont').text(function(d) {
        return d.CodeModule.name + ' -> ' + d.execute.functions[0].name;
      });
      return trNew.append('td').attr('class', 'consoled mediumfont').text(function(d) {
        return d.text;
      });
    }
  });
};

updatePlayButton = function(d3This) {
  return d3This.attr('src', function(d) {
    return '/images/' + (d.running ? 'pause' : 'play') + '.png';
  }).attr('title', function(d) {
    if (d.running) {
      return 'Stop Module';
    } else {
      return 'Start Module';
    }
  });
};

showLog = function(d) {
  return main.post('/service/schedule/getlog/' + d.id).done(function(arrLog) {
    var d3tr;
    d3.select('#log_col').style('visibility', 'visible');
    d3.select('#log_col h3').text('Log file "' + d.name + '":');
    d3.selectAll('#log_col li').remove();
    d3tr = d3.select('#log_col ul').selectAll('li').data(arrLog);
    d3tr.enter().append('li').text((function(_this) {
      return function(d) {
        return d;
      };
    })(this));
    return d3.select('#log_col button').on('click', function() {
      return clearLog(d);
    });
  }).fail(function(err) {
    return main.setInfo(false, 'Could not get rule log: ' + err.responseText);
  });
};

showDataLog = function(d) {
  return window.location.href = '/service/schedule/getdatalog/' + d.id;
};

clearLog = function(d) {
  return main.post('/service/schedule/clearlog/' + d.id).done(function() {
    main.setInfo(true, 'Log deleted!');
    return showLog(d);
  });
};

clearDataLog = function(d) {
  if (confirm('Do you really want to delete all your gathered data?')) {
    return main.post('/service/schedule/cleardatalog/' + d.id).done(function() {
      main.setInfo(true, 'Data Log deleted!');
      return showLog(d);
    });
  }
};
