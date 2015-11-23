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
    if (data.length === 0) {
      return d3.select('#hasrules').style('display', 'none');
    } else {
      d3.select('#hasnorules').style('display', 'none');
      d3div = d3.select('#tableRules');
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
    return main.post('/service/rules/getlog/' + d.id).done(function(arrLog) {
      var d3tr;
      d3.select('#log_col h3').text('Log file "' + d.name + '":');
      d3tr = d3.select('#log_col ul').selectAll('li').data(arrLog);
      d3tr.exit().transition().style('opacity', 0).remove();
      return d3tr.enter().append('li').text((function(_this) {
        return function(d) {
          return d;
        };
      })(this));
    }).fail(function(err) {
      return main.setInfo(false, 'Could not get rule log: ' + err.responseText);
    });
  };
};

window.addEventListener('load', fOnLoad, true);
