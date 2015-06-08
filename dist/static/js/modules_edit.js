'use strict';
var fOnLoad;

fOnLoad = function() {
  var fErrHandler, fFetchModules, fUpdateModuleList;
  $('#module_type').change(function() {
    return fFetchModules();
  });
  fErrHandler = function(errMsg) {
    return function(err) {
      var fDelayed;
      if (err.status === 401) {
        return window.location.href = 'forge?page=edit_modules';
      } else {
        fDelayed = function() {
          var msg, oErr;
          if (err.responseText === '') {
            msg = 'No Response from Server!';
          } else {
            try {
              oErr = JSON.parse(err.responseText);
              msg = oErr.message;
            } catch (_error) {}
          }
          $('#info').text(errMsg + msg);
          return $('#info').attr('class', 'error');
        };
        return setTimeout(fDelayed, 500);
      }
    };
  };
  fFetchModules = function() {
    var cmd;
    if ($('#module_type').val() === 'Event Trigger') {
      cmd = 'get_event_triggers';
    } else {
      cmd = 'get_action_dispatchers';
    }
    return $.post('/usercommand/' + cmd).done(fUpdateModuleList).fail(fErrHandler('Did not retrieve rules! '));
  };
  fUpdateModuleList = function(data) {
    var img, inp, modName, oMods, results, tr;
    $('#tableModules tr').remove();
    oMods = JSON.parse(data.message);
    results = [];
    for (modName in oMods) {
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
  };
  fFetchModules();
  $('#tableModules').on('click', 'img.del', function() {
    var cmd, data, modName;
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
    var modName;
    modName = encodeURIComponent($('div', $(this).closest('tr')).text());
    if ($('#module_type').val() === 'Event Trigger') {
      return window.location.href = 'forge?page=forge_module&type=event_trigger&id=' + modName;
    } else {
      return window.location.href = 'forge?page=forge_module&type=action_dispatcher&id=' + modName;
    }
  });
};

window.addEventListener('load', fOnLoad, true);
