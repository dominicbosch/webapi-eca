'use strict';
var fOnLoad;

fOnLoad = function() {
  var fUpdateRuleList, fetchRules;
  fetchRules = function() {
    return main.post('/service/rules/get').done(fUpdateRuleList).fail(function(err) {
      return main.setInfo(false, 'Did not retrieve rules: ' + err.responseText);
    });
  };
  fUpdateRuleList = function(data) {
    var i, len, parent, results, ruleName;
    console.log(data);
    $('#tableRules tr').remove();
    if (data.length === 0) {
      parent = $('#tableRules').parent();
      $('#tableRules').remove();
      return parent.append($("<h3 class=\"empty\">You don't have any rules! <a href=\"/views/rules_create\">Create One first!</a></h3>"));
    } else {
      results = [];
      for (i = 0, len = data.length; i < len; i++) {
        ruleName = data[i];
        results.push($('#tableRules').append($("<tr>\n	<td><img class=\"icon del\" src=\"/images/del.png\" title=\"Delete Rule\"></td>\n	<td><img class=\"icon edit\" src=\"/images/edit.png\" title=\"Edit Rule\"></td>\n	<td><img class=\"icon log\" src=\"/images/log.png\" title=\"Show Rule Log\"></td>\n	<td><div>" + ruleName + "</div></td>\n</tr>")));
      }
      return results;
    }
  };
  fetchRules();
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
      return main.post('/usercommand/delete_rule', data).done(fetchRules).fail(function(err) {
        return main.setInfo(false, 'Could not delete rule: ' + err.responseText);
      });
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
    return main.post('/usercommand/get_rule_log', data).done(function(data) {
      var log, ts;
      ts = (new Date()).toISOString();
      log = data.message.replace(new RegExp("\n", 'g'), "<br>");
      return $('#log_col').html("<h3>" + ruleName + " Log:</h3> <i>(updated UTC|" + ts + ")</i><br/><br/>" + log);
    }).fail(function(err) {
      return main.setInfo(false, 'Could not get rule log: ' + err.responseText);
    });
  });
};

window.addEventListener('load', fOnLoad, true);
