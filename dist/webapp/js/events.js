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
  return main.post('/service/webhooks/get').done(function(oHooks) {
    var createRow, hook, id, ref, ref1, selEl;
    createRow = function(hook, isMine) {
      var elm, owner;
      owner = isMine ? 'yours' : hook.User.username + '\'s';
      elm = $('<option value="' + hook.hookurl + '">' + hook.hookname + ' (' + owner + ')</option>');
      return list.append(elm);
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
    $('#tlwebh').removeClass('green').addClass('red').attr('src', '/images/tl_red.png');
    $('#inp_webh').show();
    $('#but_webh').show();
    return $('#but_rule').hide();
  } else {
    $('#tlwebh').removeClass('red').addClass('green').attr('src', '/images/tl_green.png');
    $('#inp_webh').hide();
    $('#but_webh').hide();
    return checkRuleExists();
  }
};

checkRuleExists = function() {
  return main.post('/service/rules/get').done(function(arrRules) {
    var arrListeners;
    arrListeners = arrRules.filter(function(o) {
      return o.Webhook && o.Webhook.hookurl === $('#sel_webh').val();
    });
    if (arrListeners.length > 0) {
      $('#tlrule').removeClass('red').addClass('green').attr('src', '/images/tl_green.png');
      $('#but_rule').hide();
      $('#but_emit').show();
      return main.setInfo(true, 'Webhook valid and Rule is setup for your events! Go on and push your event!');
    } else {
      $('#tlrule').removeClass('green').addClass('red').attr('src', '/images/tl_red.png');
      $('#but_rule').show();
      return $('#but_emit').hide();
    }
  });
};

fOnLoad = function() {
  var txt;
  main.registerHoverInfo(d3.select('#eventbody'), 'events_info.html');
  main.registerHoverInfo(d3.select('#info_webhook'), 'webhooks_info.html');
  main.registerHoverInfo(d3.select('#info_rule'), 'rules_info.html');
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
      return window.location.href = '/views/webhooks?hookname=' + encodeURIComponent($('#inp_webh').val());
    }
  });
  $('#but_rule').on('click', function() {
    return window.location.href = 'rules_create?webhook=' + $('#sel_webh').val();
  });
  $('#but_emit').click(function() {
    var err, error, obj, selectedHook;
    try {
      obj = JSON.parse(editor.getValue());
    } catch (error) {
      err = error;
      main.setInfo(false, 'You have errors in your JSON object! ' + err, true);
    }
    selectedHook = $('#sel_webh').val();
    if (obj) {
      return main.post('/service/webhooks/event/' + selectedHook, obj).done(function(msg) {
        return main.setInfo(true, msg);
      }).fail(function(err) {
        return main.setInfo(false, 'Error in upload: ' + err.responseText, true);
      });
    }
  });
  return createWebhookList();
};

window.addEventListener('load', fOnLoad, true);
