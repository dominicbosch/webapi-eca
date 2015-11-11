'use strict';
var deleteModule, editModule, fOnLoad, modName, updateModules, urlService;

urlService = '/service/';

if (oParams.m === 'ad') {
  urlService += 'actiondispatcher/';
  modName = 'Action Dispatcher';
} else {
  urlService += 'eventtrigger/';
  modName = 'Event Trigger';
}

updateModules = function() {
  var req;
  req = $.post(urlService + 'get');
  req.done(function(arrModules) {
    var tr, trNew;
    console.log(arrModules);
    if (arrModules.length === 0) {
      return $('#tableModules').html('<h3>No ' + modName + 's available!');
    } else {
      tr = d3.select('#tableModules').selectAll('tr').data(arrModules, function(d) {
        return d.id;
      });
      tr.exit().remove();
      trNew = tr.enter().append('tr');
      trNew.append('td').classed('smallpadded', true).append('img').attr('class', 'del').attr('title', 'Delete Module').attr('src', '/images/red_cross_small.png').on('click', deleteModule);
      trNew.append('td').classed('smallpadded', true).append('img').attr('class', 'log').attr('title', 'Edit Module').attr('src', '/images/edit.png').on('click', editModule);
      return trNew.append('td').classed('smallpadded', true).append('div').text(function(d) {
        return d.name;
      }).each(function(d) {
        if (d.comment) {
          return main.registerHoverInfoHTML(d3.select(this), d.comment);
        }
      });
    }
  });
  return req.fail(function(err) {
    if (err.status === 401) {
      window.location.href = '/';
    }
    return main.setInfo(false, 'Error in fetching all Modules: ' + err.responseText);
  });
};

deleteModule = function(d) {
  if (confirm('Do you really want to delete the Module "' + d.name + '"?')) {
    return $.post(urlService + 'delete', {
      id: d.id
    }).done(updateModules).fail(main.requestError(function(err) {
      return console.log(err);
    }));
  }
};

editModule = function(d) {
  if (oParams.m === 'ad') {
    return window.location.href = 'modules_create?m=ad&id=' + d.id;
  } else {
    return window.location.href = 'modules_create?m=et&id=' + d.id;
  }
};

fOnLoad = function() {
  $('.moduletype').text(modName);
  $('#linkMod').attr('href', '/views/modules_create?m=' + oParams.m);
  return updateModules();
};

window.addEventListener('load', fOnLoad, true);
