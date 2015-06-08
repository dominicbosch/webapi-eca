'use strict';
var checkRuleExists, checkWebhookExists, editor, fFindKeyStringPair, fOnLoad;

editor = null;

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

checkWebhookExists = function() {
  var err, obj;
  try {
    obj = JSON.parse(editor.getValue());
    return $.post('/service/webhooks/getall', function(oHooks) {
      var elm, exist, exists, hook, id, numHooks, ul;
      $('#listhooks *').remove();
      numHooks = 0;
      exist = false;
      ul = $('<ul>');
      for (id in oHooks) {
        hook = oHooks[id];
        numHooks++;
        elm = $('<li>').text('"' + hook.hookname + '"');
        ul.append(elm);
        if (hook.hookname === obj.eventname) {
          elm.attr('class', 'exists');
          exists = true;
        }
      }
      if (exists) {
        main.setInfo(true, 'A Webhook exists for this Event!');
        setTimeout(checkRuleExists, 2000);
      } else {
        main.setInfo(false, 'No Webhook exists for this Event Name, please create one!');
      }
      if (numHooks === 0) {
        return $('#listhooks').text('You do not have any Webhooks! Create one first!');
      } else {
        $('#listhooks').text('The Event Names of your available Webhooks are:');
        return $('#listhooks').append(ul);
      }
    });
  } catch (_error) {
    err = _error;
    return console.log(err);
  }
};

checkRuleExists = function(name) {
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
      main.setInfo(true, 'The required Webhook exists and a Rule is listening for events with this name! Go on and push your event!');
    } else {
      main.setInfo(false, 'No Rule is listening for this Event Name, please create one!');
    }
    return console.log(oRules);
  });
};

fOnLoad = function() {
  main.registerHoverInfo($('#pagetitle'), 'eventinfo.html');
  editor = ace.edit('editor');
  editor.setTheme('ace/theme/crimson_editor');
  editor.setOptions({
    maxLines: 15
  });
  editor.setFontSize('16px');
  editor.getSession().setMode('ace/mode/json');
  editor.setShowPrintMargin(false);
  $.get('/data/example_event.txt', function(data) {
    editor.setValue(data, -1);
    checkWebhookExists();
    return editor.getSession().on('change', function() {
      return checkWebhookExists();
    });
  });
  $('#editor_theme').change(function(el) {
    return editor.setTheme('ace/theme/' + $(this).val());
  });
  $('#editor_font').change(function(el) {
    return editor.setFontSize($(this).val());
  });
  $('#but_emit').click(function() {
    var err, obj;
    try {
      obj = JSON.parse(editor.getValue());
      window.scrollTo(0, 0);
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
    } catch (_error) {
      err = _error;
      return main.setInfo(false, 'You have errors in your JSON object! ' + err);
    }
  });
  $('#but_webh').click(function() {
    return console.log('webhook');
  });
  return $('#but_prep').on('click', function() {
    var err, oSelector, obj, sel, url;
    try {
      obj = JSON.parse(editor.getValue());
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
    } catch (_error) {
      err = _error;
      return main.setInfo(false, 'You have errors in your JSON object! ' + err);
    }
  });
};

window.addEventListener('load', fOnLoad, true);
