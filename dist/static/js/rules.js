'use strict';
var fOnLoad;

fOnLoad = function() {
  var fErrHandler, fFetchRules, fUpdateRuleList;
  fErrHandler = function(errMsg) {
    return function(err) {
      var fDelayed;
      if (err.status === 401) {
        return window.location.href = '/';
      } else {
        $('#log_col').text("");
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
  fFetchRules = function() {
    return $.post('/usercommand/get_rules').done(fUpdateRuleList).fail(fErrHandler('Did not retrieve rules! '));
  };
  fUpdateRuleList = function(data) {
    var i, img, inp, len, ref, results, ruleName, tr;
    $('#tableRules tr').remove();
    ref = data.message;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      ruleName = ref[i];
      tr = $('<tr>');
      img = $('<img>').attr('class', 'del').attr('title', 'Delete Rule').attr('src', 'images/red_cross_small.png');
      tr.append($('<td>').append(img));
      img = $('<img>').attr('class', 'edit').attr('title', 'Edit Rule').attr('src', 'images/edit.png');
      tr.append($('<td>').append(img));
      img = $('<img>').attr('class', 'log').attr('title', 'Show Rule Log').attr('src', 'images/logicon.png');
      tr.append($('<td>').append(img));
      inp = $('<div>').text(ruleName);
      tr.append($('<td>').append(inp));
      results.push($('#tableRules').append(tr));
    }
    return results;
  };
  fFetchRules();
  $('#tableRules').on('click', 'img.del', function() {
    var data, ruleName;
    ruleName = $('div', $(this).closest('tr')).text();
    if (confirm("Do you really want to delete the rule '" + ruleName + "'?")) {
      $('#log_col').text("");
      data = {
        body: JSON.stringify({
          id: ruleName
        })
      };
      return $.post('/usercommand/delete_rule', data).done(fFetchRules).fail(fErrHandler('Could not delete rule! '));
    }
  });
  $('#tableRules').on('click', 'img.edit', function() {
    var ruleName;
    ruleName = $('div', $(this).closest('tr')).text();
    return window.location.href = 'forge?page=forge_rule&id=' + encodeURIComponent(ruleName);
  });
  return $('#tableRules').on('click', 'img.log', function() {
    var data, ruleName;
    ruleName = $('div', $(this).closest('tr')).text();
    data = {
      body: JSON.stringify({
        id: ruleName
      })
    };
    return $.post('/usercommand/get_rule_log', data).done(function(data) {
      var log, ts;
      ts = (new Date()).toISOString();
      log = data.message.replace(new RegExp("\n", 'g'), "<br>");
      return $('#log_col').html("<h3>" + ruleName + " Log:</h3> <i>( updated UTC|" + ts + " )</i><br/><br/>" + log);
    }).fail(fErrHandler('Could not get rule log! '));
  });
};

window.addEventListener('load', fOnLoad, true);
