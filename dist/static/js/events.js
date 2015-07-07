'use strict';
var checkRuleExists, editor, fFindKeyStringPair, fOnLoad, parseEvent, updateWebhookList;

editor = null;

parseEvent = function() {
  var err, obj;
  try {
    return obj = JSON.parse(editor.getValue());
  } catch (_error) {
    err = _error;
    return main.setInfo(false, 'You have errors in your JSON object! ' + err);
  }
};

fFindKeyStringPair = function(obj) {
  var key, oRet, val;
  for (key in obj) {
    val = obj[key];
    if (typeof val === 'string' || typeof val === 'number') {
      return {
        key: key,
        val: val
      };
    } else if (typeof val === 'object') {
      oRet = fFindKeyStringPair(val);
      if (oRet) {
        return oRet;
      }
    }
  }
  return null;
};

updateWebhookList = function() {
  return $.post('/service/webhooks/getallvisible', function(oHooks) {
    var createRow, exists, hook, id, numHooks, ref, ref1, table;
    $('#listhooks *').remove();
    numHooks = 0;
    exists = false;
    table = $('<table>');
    table.append($("<tr><th>Event Name</th><th>Webhook Owner</th></tr>"));
    createRow = function(hook, isMine) {
      var elm;
      numHooks++;
      elm = $("<tr><td><kbd>" + hook.hookname + "</kbd></td><td>" + (isMine ? '(you)' : hook.username) + "</td></tr>");
      table.append(elm);
      if (hook.hookname === $('#inp_webh').val()) {
        elm.attr('class', 'exists');
        return exists = true;
      }
    };
    ref = oHooks["private"];
    for (id in ref) {
      hook = ref[id];
      createRow(hook, true);
    }
    ref1 = oHooks["public"];
    for (id in ref1) {
      hook = ref1[id];
      createRow(hook);
    }
    if (exists) {
      $('#tlwebh').removeClass('red').addClass('green');
      $('#but_webh').hide();
      checkRuleExists();
    } else {
      $('#tlwebh').removeClass('green').addClass('red');
      $('#but_webh').show();
      $('#but_rule').hide();
      $('#but_emit').hide();
    }
    if (numHooks === 0) {
      return $('#sel_webh').hide();
    } else {
      return $('#sel_webh').show();
    }
  });
};

checkRuleExists = function() {
  return $.post('/service/rules/getall', function(oRules) {
    var exists, i, len, prop, rule;
    exists = false;
    for (rule = i = 0, len = oRules.length; i < len; rule = ++i) {
      prop = oRules[rule];
      if (rule.eventtype === 'Webhook' && rule.eventname === name) {
        exists = true;
      }
    }
    if (exists) {
      $('#tlrule').removeClass('red').addClass('green');
      $('#but_rule').hide();
      return $('#but_emit').show();
    } else {
      $('#tlrule').removeClass('green').addClass('red');
      $('#but_rule').show();
      return $('#but_emit').hide();
    }
  });
};

fOnLoad = function() {
  var txt;
  main.registerHoverInfo($('#pagetitle'), 'eventinfo.html');
  editor = ace.edit('editor');
  editor.setTheme('ace/theme/crimson_editor');
  editor.setOptions({
    maxLines: 15
  });
  editor.setFontSize('16px');
  editor.getSession().setMode('ace/mode/json');
  editor.setShowPrintMargin(false);
  if (oParams.hookname) {
    $('#inp_webh').val(oParams.hookname);
  }
  txt = '\n' + JSON.stringify(JSON.parse($('#eventSource').text()), null, '\t') + '\n';
  editor.setValue(txt, -1);
  $('#editor_theme').change(function(el) {
    return editor.setTheme('ace/theme/' + $(this).val());
  });
  $('#editor_font').change(function(el) {
    return editor.setFontSize($(this).val());
  });
  $('#inp_webh').on('input', updateWebhookList);
  $('#but_emit').click(function() {
    var obj;
    window.scrollTo(0, 0);
    obj = parseEvent();
    if (obj) {
      return $.post('/event', obj).done(function(data) {
        return main.setInfo(true, data.message);
      }).fail(function(err) {
        var fDelayed;
        if (err.status === 401) {
          return window.location.href = '/views/events';
        } else {
          fDelayed = function() {
            if (err.responseText === '') {
              err.responseText = 'No Response from Server!';
            }
            return main.setInfo(false, 'Error in upload: ' + err.responseText);
          };
          return setTimeout(fDelayed, 500);
        }
      });
    }
  });
  $('#but_webh').click(function() {
    return window.location.href = '/views/webhooks?id=' + encodeURIComponent($('#inp_webh').val());
  });
  return $('#but_rule').on('click', function() {
    var oSelector, obj, sel, url;
    obj = parseEvent();
    if (obj) {
      if (obj.eventname && typeof obj.eventname === 'string' && obj.eventname !== '') {
        sel = '';
        if (obj.body && typeof obj.body === 'object') {
          oSelector = fFindKeyStringPair(obj.body);
          if (oSelector) {
            sel = "&selkey=" + oSelector.key + "&selval=" + oSelector.val;
          }
        }
        url = 'rules_create?eventtype=custom&eventname=' + obj.eventname + sel;
        return window.open(url, '_blank');
      } else {
        return main.setInfo(false, 'Please provide a valid eventname');
      }
    }
  });
};

window.addEventListener('load', fOnLoad, true);
