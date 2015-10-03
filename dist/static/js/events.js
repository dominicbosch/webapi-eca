'use strict';
var checkRuleExists, createWebhookList, editor, fOnLoad, updateWebhookSelection;

editor = null;

createWebhookList = function() {
  var list;
  $('#but_rule').hide();
  $('#but_emit').hide();
  if (oParams.webhook) {
    $('#inp_webh').hide();
    $('#but_webh').hide();
  }
  list = $('#sel_webh');
  $('*', list).remove();
  list.append($('<option>[ create new webhook with name: ]</option>'));
  return $.post('/service/webhooks/getall', function(oHooks) {
    var createRow, hook, id, ref, ref1, selEl;
    createRow = function(id, hook, isMine) {
      var elm, owner;
      owner = isMine ? 'yours' : hook.username + '\'s';
      elm = $('<option value="' + id + '">' + hook.hookname + ' (' + owner + ')</option>');
      return list.append(elm);
    };
    ref = oHooks["private"];
    for (id in ref) {
      hook = ref[id];
      createRow(id, hook, true);
    }
    ref1 = oHooks["public"];
    for (id in ref1) {
      hook = ref1[id];
      createRow(id, hook);
    }
    if (oParams.webhook) {
      selEl = $('#sel_webh [value="' + oParams.webhook + '"]');
      if (selEl.length > 0) {
        selEl.prop('selected', true);
        return updateWebhookSelection();
      } else {

      }
    }
  });
};

updateWebhookSelection = function() {
  if ($(':selected', this).index() === 0) {
    $('#tlwebh').removeClass('green').addClass('red');
    $('#inp_webh').show();
    $('#but_webh').show();
    return $('#but_rule').hide();
  } else {
    $('#tlwebh').removeClass('red').addClass('green');
    $('#inp_webh').hide();
    $('#but_webh').hide();
    return checkRuleExists();
  }
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
      $('#but_emit').show();
      return main.setInfo(true, 'Webhook valid and Rule is setup for your events! Go on and push your event!');
    } else {
      $('#tlrule').removeClass('green').addClass('red');
      $('#but_rule').show();
      return $('#but_emit').hide();
    }
  });
};

fOnLoad = function() {
  var txt;
  main.registerHoverInfo($('#eventbody'), 'events_info.html');
  main.registerHoverInfo($('#info_webhook'), 'webhooks_info.html');
  main.registerHoverInfo($('#info_rule'), 'rules_info.html');
  editor = ace.edit('editor');
  editor.setTheme('ace/theme/crimson_editor');
  editor.setOptions({
    maxLines: 15
  });
  editor.setFontSize('14px');
  editor.getSession().setMode('ace/mode/json');
  editor.setShowPrintMargin(false);
  txt = '\n' + JSON.stringify(JSON.parse($('#eventSource').text()), null, '\t') + '\n';
  editor.setValue(txt, -1);
  $('#editor_theme').change(function() {
    return editor.setTheme('ace/theme/' + $(this).val());
  });
  $('#editor_font').change(function() {
    return editor.setFontSize($(this).val());
  });
  $('#sel_webh').on('change', updateWebhookSelection);
  $('#but_webh').click(function() {
    if ($('#inp_webh').val() === '') {
      return main.setInfo(false, 'Please enter a Webhook name');
    } else {
      return window.location.href = '/views/webhooks?id=' + $('#inp_webh').val();
    }
  });
  $('#but_rule').on('click', function() {
    return window.open('rules_create?webhook=' + $('#sel_webh').val(), '_blank');
  });
  $('#but_emit').click(function() {
    var err, error, obj, selectedHook;
    window.scrollTo(0, 0);
    try {
      obj = JSON.parse(editor.getValue());
    } catch (error) {
      err = error;
      main.setInfo(false, 'You have errors in your JSON object! ' + err);
    }
    selectedHook = $('#sel_webh').val();
    if (obj) {
      console.log('posting to ' + '/service/webhooks/event/' + selectedHook);
      return $.post('/service/webhooks/event/' + selectedHook, obj).done(function(data) {
        return main.setInfo(true, data.message);
      }).fail(function(err) {
        if (err.status === 401) {
          window.location.href = '/';
        }
        return main.setInfo(false, 'Error in upload: ' + err.responseText);
      });
    }
  });
  return createWebhookList();
};

window.addEventListener('load', fOnLoad, true);
