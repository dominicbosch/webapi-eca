'use strict';
var fOnLoad;

fOnLoad = function() {
  var deleteRule, editRule, fUpdateRuleList, fetchRules, showLog;
  fetchRules = function() {
    return main.post('/service/rules/get').done(fUpdateRuleList).fail(function(err) {
      return main.setInfo(false, 'Did not retrieve rules: ' + err.responseText);
    });
  };
  fUpdateRuleList = function(data) {
    var d3div, d3newTrs, d3tr;
    d3div = d3.select('#tableRules');
    if (data.length === 0) {
      d3div.selectAll('table').remove();
      return d3div.append('h3').classed('empty', true).html("You don't have any rules! <a href=\"/views/rules_create\">Create One first!</a>");
    } else {
      d3div.selectAll('h3').remove();
      d3tr = d3div.select('table').selectAll('tr').data(data, function(d) {
        return d.id;
      });
      d3tr.exit().transition().style('opacity', 0).remove();
      d3newTrs = d3tr.enter().append('tr');
      d3newTrs.append('td').append('img').attr('class', 'icon del').attr('src', '/images/del.png').attr('title', 'Delete Rule').on('click', deleteRule);
      d3newTrs.append('td').append('img').attr('class', 'icon edit').attr('src', '/images/edit.png').attr('title', 'Edit Rule').on('click', editRule);
      d3newTrs.append('td').append('img').attr('class', 'icon log').attr('src', '/images/log.png').attr('title', 'Show Rule Log').on('click', showLog);
      return d3newTrs.append('td').text(function(d) {
        return d.name;
      });
    }
  };
  fetchRules();
  deleteRule = function(d) {
    if (confirm("Do you really want to delete the rule '" + d.name + "'?")) {
      return main.post('/service/rules/delete', {
        id: d.id
      }).done(fetchRules).fail(function(err) {
        return main.setInfo(false, 'Could not delete rule: ' + err.responseText);
      });
    }
  };
  editRule = function(d) {
    return window.location.href = 'rules_create?id=' + d.id;
  };
  return showLog = function(d) {
    console.warn('TODO open div over whole page with log in editor');
    return main.post('/service/rules/getlog', {
      id: d.id
    }).done(function(data) {
      var log, ts;
      ts = (new Date()).toISOString();
      log = data.message.replace(new RegExp("\n", 'g'), "<br>");
      return $('#log_col').html("<h3>" + ruleName + " Log:</h3> <i>(updated UTC|" + ts + ")</i><br/><br/>" + log);
    }).fail(function(err) {
      return main.setInfo(false, 'Could not get rule log: ' + err.responseText);
    });
  };
};

window.addEventListener('load', fOnLoad, true);
