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
    var parent, tr, trNew;
    console.log(arrModules);
    if (arrModules.length === 0) {
      parent = $('#tableModules').parent();
      $('#tableModules').remove();
      return parent.append($("<h3 class=\"empty\">No " + modName + "s available! <a href=\"/views/modules_create?m=" + oParams.m + "\">Create One first!</a></h3>"));
    } else {
      tr = d3.select('#tableModules').selectAll('tr').data(arrModules, function(d) {
        return d.id;
      });
      tr.exit().remove();
      trNew = tr.enter().append('tr');
      trNew.append('td').classed('smallpadded', true).append('img').attr('class', 'icon del').attr('src', '/images/del.png').attr('title', 'Delete Module').on('click', deleteModule);
      trNew.append('td').classed('smallpadded', true).append('img').attr('class', 'icon edit').attr('src', '/images/edit.png').attr('title', 'Edit Module').on('click', editModule);
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
