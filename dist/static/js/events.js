var fFindKeyStringPair, fOnLoad;

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

fOnLoad = function() {
  var editor;
  document.title = 'Push Events!';
  $('#pagetitle').text('Trigger your custom event in the engine!');
  editor = ace.edit("editor");
  editor.setTheme("ace/theme/crimson_editor");
  editor.setOptions({
    maxLines: 15
  });
  editor.setFontSize("18px");
  editor.getSession().setMode("ace/mode/json");
  editor.setShowPrintMargin(false);
  $.get('/data/example_event.txt', function(data) {
    return editor.setValue(data, -1);
  });
  $('#editor_theme').change(function(el) {
    return editor.setTheme("ace/theme/" + $(this).val());
  });
  $('#editor_font').change(function(el) {
    return editor.setFontSize($(this).val());
  });
  $('#but_submit').click(function() {
    var err, val;
    try {
      val = editor.getValue();
      JSON.parse(val);
      window.scrollTo(0, 0);
      return $.post('/event', val).done(function(data) {
        $('#info').text(data.message);
        return $('#info').attr('class', 'success');
      }).fail(function(err) {
        var fDelayed;
        if (err.status === 401) {
          return window.location.href = 'forge?page=forge_event';
        } else {
          fDelayed = function() {
            if (err.responseText === '') {
              err.responseText = 'No Response from Server!';
            }
            $('#info').text('Error in upload: ' + err.responseText);
            return $('#info').attr('class', 'error');
          };
          return setTimeout(fDelayed, 500);
        }
      });
    } catch (_error) {
      err = _error;
      $('#info').text('You have errors in your JSON object! ' + err);
      return $('#info').attr('class', 'error');
    }
  });
  return $('#but_prepare').on('click', function() {
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
        url = 'forge?page=forge_rule&eventtype=custom&eventname=' + obj.eventname + sel;
        return window.open(url, '_blank');
      } else {
        $('#info').text('Please provide a valid eventname');
        return $('#info').attr('class', 'error');
      }
    } catch (_error) {
      err = _error;
      $('#info').text('You have errors in your JSON object! ' + err);
      return $('#info').attr('class', 'error');
    }
  });
};

window.addEventListener('load', fOnLoad, true);
