'use strict';
var clearDataLog, clearLog, deleteModule, fOnLoad, showDataLog, showLog, startStopSchedule, strPublicKey, updateModules, updatePlayButton, updateSchedules;

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
      return parent.append($("<h3 class=\"empty\">No <b>Event Trigger</b> available! <a href=\"/views/modules_create?m=et\">Create One first!</a></h3>"));
    } else {
      tr = d3.select('#tableModules tbody').selectAll('tr').data(arrModules, function(d) {
        return d.id;
      });
      tr.exit().remove();
      trNew = tr.enter().append('tr');
      trNew.append('td').each(function(d) {
        if (d.UserId === uid) {
          return d3.select(this).append('img').attr('class', 'icon del').attr('src', '/images/del.png').attr('title', 'Delete Event Trigger').on('click', deleteModule);
        }
      });
      trNew.append('td').append('img').attr('class', 'icon edit').attr('src', '/images/edit.png').attr('title', 'Edit Event Trigger').on('click', function(d) {
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
    return main.setInfo(false, 'Error in fetching all Event Triggers: ' + err.responseText);
  });
};

deleteModule = function(d) {
  if (confirm('Do you really want to delete the Event Trigger "' + d.name + '"? All running Schedules that use this Event Trigger will be deleted!')) {
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

startStopSchedule = function(d) {
  var action, req;
  action = d.running ? 'stop' : 'start';
  req = main.post('/service/schedule/' + action + '/' + d.id);
  req.done(function() {
    action = d.running ? 'stopped' : 'started';
    d.running = !d.running;
    updatePlayButton(d3.select('#ico' + d.id));
    main.setInfo(true, 'Schedule ' + action);
    return setTimeout(function() {
      return showLog(d);
    }, 500);
  });
  return req.fail(function(err) {
    action = d.running ? 'stop' : 'start';
    return main.setInfo(false, 'Unable to ' + action + ' Schedule');
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
      trNew.append('td').attr('class', 'jumping').each(function(d) {
        if (d.error) {
          return d3.select(this).append('img').attr('src', '/images/exclamation.png').attr('title', d.error);
        }
      });
      trNew.append('td').each(function(d) {
        return d3.select(this).append('img').attr('class', 'icon del').attr('src', '/images/del.png').attr('title', 'Delete Schedule').on('click', deleteSchedule);
      });
      trNew.append('td').append('img').attr('class', 'icon edit').attr('src', '/images/edit.png').attr('title', 'Edit Schedule').on('click', function(d) {
        return window.location.href = 'schedule_create?id=' + d.id;
      });
      trNew.append('td').append('img').attr('class', 'icon log').attr('src', '/images/log.png').attr('title', 'Show Schedule Log').on('click', showLog);
      trNew.append('td').append('img').attr('class', 'icon log').attr('src', '/images/bulk.png').attr('title', 'Download Data Log').on('click', showDataLog);
      trNew.append('td').append('img').attr('class', 'icon log').attr('src', '/images/bulk_del.png').attr('title', 'Delete Data Log').on('click', clearDataLog);
      img = trNew.append('td').append('img').attr('id', function(d) {
        return 'ico' + d.id;
      }).attr('class', function(d) {
        return 'icon edit';
      }).on('click', startStopSchedule);
      updatePlayButton(img);
      trNew.append('td').append('div').text(function(d) {
        return d.name;
      }).each(function(d) {
        if (d.comment) {
          return main.registerHoverInfoHTML(d3.select(this), d.comment);
        }
      });
      trNew.append('td').attr('class', 'consoled mediumfont').text(function(d) {
        console.log(d);
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
      return 'Stop Schedule';
    } else {
      return 'Start Schedule';
    }
  });
};

deleteModule = function(d) {
  if (confirm('Do you really want to delete the Schedule "' + d.name + '"?')) {
    return main.post('/service/schedule/delete', {
      id: d.id
    }).done(function() {
      main.setInfo(true, 'Schedule deleted!', true);
      return updateSchedules();
    }).fail(function(err) {
      return main.setInfo(false, err.responseText);
    });
  }
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
