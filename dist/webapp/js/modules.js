'use strict';
var deleteModule, editModule, fOnLoad, modName, startStopModule, updateModules, urlService;

urlService = '/service/';

if (oParams.m === 'ad') {
  urlService += 'actiondispatcher';
  modName = 'Action Dispatcher';
} else {
  urlService += 'eventtrigger';
  modName = 'Event Trigger';
}

updateModules = function(uid) {
  var req;
  req = main.post(urlService + '/get');
  req.done(function(arrModules) {
    var parent, tr, trNew;
    console.log(arrModules);
    if (arrModules.length === 0) {
      parent = $('#tableModules').parent();
      $('#tableModules').remove();
      return parent.append($("<h3 class=\"empty\">No " + modName + "s available! <a href=\"/views/modules_create?m=" + oParams.m + "\">Create One first!</a></h3>"));
    } else {
      tr = d3.select('#tableModules tbody').selectAll('tr').data(arrModules, function(d) {
        return d.id;
      });
      tr.exit().remove();
      trNew = tr.enter().append('tr');
      trNew.append('td').classed('smallpadded', true).each(function(d) {
        if (d.UserId === uid) {
          return d3.select(this).append('img').attr('class', 'icon del').attr('src', '/images/del.png').attr('title', 'Delete Module').on('click', deleteModule);
        }
      });
      trNew.append('td').classed('smallpadded', true).append('img').attr('class', 'icon edit').attr('src', '/images/edit.png').attr('title', 'Edit Module').on('click', editModule);
      if (oParams.m !== 'ad') {
        trNew.append('td').classed('smallpadded', true).append('img').attr('class', 'icon edit').attr('src', function(d) {
          return '/images/' + (d.running ? 'pause' : 'play') + '.png';
        }).attr('title', 'Edit Module').on('click', startStopModule);
      }
      trNew.append('td').classed('smallpadded', true).append('div').text(function(d) {
        return d.name;
      }).each(function(d) {
        if (d.comment) {
          return main.registerHoverInfoHTML(d3.select(this), d.comment);
        }
      });
      trNew.append('td').text(function(d) {
        return d.User.username;
      });
      if (oParams.m !== 'ad') {
        return trNew.append('td').attr('class', 'consoled mediumfont').text(function(d) {
          return d.schedule.text;
        });
      }
    }
  });
  return req.fail(function(err) {
    return main.setInfo(false, 'Error in fetching all Modules: ' + err.responseText);
  });
};

deleteModule = function(d) {
  if (confirm('Do you really want to delete the Module "' + d.name + '"?')) {
    return main.post(urlService + '/delete', {
      id: d.id
    }).done(function() {
      main.setInfo(true, 'Action Dispatcher deleted!', true);
      return updateModules();
    }).fail(function(err) {
      return main.setInfo(false, err.responseText);
    });
  }
};

editModule = function(d) {
  if (oParams.m === 'ad') {
    return window.location.href = 'modules_create?m=ad&id=' + d.id;
  } else {
    return window.location.href = 'modules_create?m=et&id=' + d.id;
  }
};

startStopModule = function(d) {
  console.log(d);
  d.running = !d.running;
  return d3.select(this).attr('src', '/images/' + (d.running ? 'pause' : 'play') + '.png');
};

fOnLoad = function() {
  $('.moduletype').text(modName);
  $('#linkMod').attr('href', '/views/modules_create?m=' + oParams.m);
  if (oParams.m !== 'ad') {
    d3.select('#tableModules thead tr').append('th').text('Schedule');
    d3.select('#tableModules thead tr').insert('th', ':first-child');
  }
  return updateModules(parseInt(d3.select('body').attr('data-uid')));
};

window.addEventListener('load', fOnLoad, true);
