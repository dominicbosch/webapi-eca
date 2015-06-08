'use strict';
var checkWebhookExists, editor, fFindKeyStringPair, fOnLoad;

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
    console.log('/service/webhooks/get/' + obj.eventname);
    return $.post('/service/webhooks/get/' + obj.eventname, function(err, data) {
      return console.log(err, data);
    });
  } catch (_error) {
    err = _error;
    return console.log(err);
  }
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
    return editor.getSession().on('change', function() {
      main.clearInfo();
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
