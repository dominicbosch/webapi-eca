'use strict';
var fOnLoad;

fOnLoad = function() {
  var fErrHandler, fFetchRules, fUpdateRuleList;
  fErrHandler = function(errMsg) {
    return function(err) {
      if (err.status === 401) {
        return window.location.href = '/';
      } else {
        return console.log('WHOOPS');
      }
    };
  };
  fFetchRules = function() {
    return $.post('/service/rules/getall').done(fUpdateRuleList).fail(fErrHandler('Did not retrieve rules! '));
  };
  fUpdateRuleList = function(data) {
    var i, len, results, ruleName;
    $('#tableRules tr').remove();
    if (data.length === 0) {
      return $('#tableRules').html('<tr><td><h3>You don\'t have any rules!</h3></td></tr>');
    } else {
      results = [];
      for (i = 0, len = data.length; i < len; i++) {
        ruleName = data[i];
        results.push($('#tableRules').append($("<tr>\n	<td><div class=\"img del\" title=\"Delete Rule\"></div></td>\n	<td><div class=\"img edit\" title=\"Edit Rule\"></div></td>\n	<td><div class=\"img log\" title=\"Show Rule Log\"></div></td>\n	<td><div>" + ruleName + "</div></td>\n</tr>")));
      }
      return results;
    }
  };
  fFetchRules();
  $('#tableRules').on('click', '.del', function() {
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
  $('#tableRules').on('click', '.edit', function() {
    var ruleName;
    ruleName = $('div', $(this).closest('tr')).text();
    return window.location.href = 'forge?page=forge_rule&id=' + encodeURIComponent(ruleName);
  });
  return $('#tableRules').on('click', '.log', function() {
    var data, ruleName;
    console.warn('TODO open div over whole page with log in editor');
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
      return $('#log_col').html("<h3>" + ruleName + " Log:</h3> <i>(updated UTC|" + ts + ")</i><br/><br/>" + log);
    }).fail(fErrHandler('Could not get rule log! '));
  });
};

window.addEventListener('load', fOnLoad, true);
