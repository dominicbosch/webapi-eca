'use strict';
var fOnLoad, modName, urlService;

urlService = '/service/';

if (oParams.m === 'ad') {
  urlService += 'actiondispatcher/';
  modName = 'Action Dispatcher';
} else {
  urlService += 'eventtrigger/';
  modName = 'Event Trigger';
}

fOnLoad = function() {
  var req;
  $('.moduletype').text(modName);
  $('#linkMod').attr('href', '/views/modules_create?m=' + oParams.m);
  req = $.post(urlService + 'getall');
  req.done(function(arrModules) {
    var img, inp, results, tr;
    if (arrModules.length === 0) {
      return $('#tableModules').html('<h3>No ' + modName + 's available!');
    } else {
      results = [];
      for (modName in arrModules) {
        tr = $('<tr>');
        inp = $('<div>').text(modName);
        img = $('<img>').attr('class', 'del').attr('title', 'Delete Module').attr('src', 'images/red_cross_small.png');
        tr.append($('<td>').append(img));
        img = $('<img>').attr('class', 'log').attr('title', 'Edit Module').attr('src', 'images/edit.png');
        tr.append($('<td>').append(img));
        tr.append($('<td>').append(inp));
        results.push($('#tableModules').append(tr));
      }
      return results;
    }
  });
  req.fail(function(err) {
    if (err.status === 401) {
      window.location.href = '/';
    }
    return main.setInfo(false, 'Error in fetching all Modules: ' + err.responseText);
  });
  $('#tableModules').on('click', 'img.del', function() {
    var cmd, data;
    modName = $('div', $(this).closest('tr')).text();
    if (confirm("Do you really want to delete the Module '" + modName + "'? The module might still be active in some of your rules!")) {
      if ($('#module_type').val() === 'Event Trigger') {
        cmd = 'delete_event_trigger';
      } else {
        cmd = 'delete_action_dispatcher';
      }
      data = {
        body: JSON.stringify({
          id: modName
        })
      };
      return $.post('/usercommand/' + cmd, data).done(fFetchModules).fail(fErrHandler('Could not delete module! '));
    }
  });
  return $('#tableModules').on('click', 'img.log', function() {
    modName = encodeURIComponent($('div', $(this).closest('tr')).text());
    if ($('#module_type').val() === 'Event Trigger') {
      return window.location.href = 'forge?page=forge_module&type=event_trigger&id=' + modName;
    } else {
      return window.location.href = 'forge?page=forge_module&type=action_dispatcher&id=' + modName;
    }
  });
};

window.addEventListener('load', fOnLoad, true);
