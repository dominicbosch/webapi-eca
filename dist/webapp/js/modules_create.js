'use strict';
var fErrHandler, fOnLoad, moduleType, moduleTypeName;

moduleTypeName = oParams.m === 'ad' ? 'Action Dispatcher' : 'Event Trigger';

moduleType = oParams.m === 'ad' ? 'actiondispatcher' : 'eventtrigger';

fErrHandler = function(errMsg) {
  return function(err) {
    if (err.status === 401) {
      return window.location.href = "/";
    } else {
      return main.setInfo(false, errMsg);
    }
  };
};

fOnLoad = function() {
  var dateNow, editor, fAddInputRow, fAddUserParam, fChangeInputVisibility, title;
  title = oParams.id ? 'Edit ' : 'Create ';
  title += moduleTypeName;
  $('#pagetitle').text(title);
  main.registerHoverInfo(d3.select('#programcode'), 'modules_code.html');
  if (oParams.m !== 'ad') {
    main.registerHoverInfo(d3.select('#schedule > h2'), 'modules_schedule.html');
    $('#schedule').show();
    dateNow = new Date();
    $('#datetimePicker').datetimepicker({
      defaultDate: dateNow,
      minDate: dateNow
    });
    $('#timePicker').datetimepicker({
      format: 'LT'
    });
  }
  editor = ace.edit("editor");
  editor.setTheme("ace/theme/crimson_editor");
  editor.getSession().setMode("ace/mode/coffee");
  editor.setFontSize("14px");
  editor.setShowPrintMargin(false);
  editor.session.setUseSoftTabs(false);
  editor.getSession().on('change', function(el) {
    return console.warn('We should always search for export functions and provide means for ' + 'the user to enter a comment for each exported function');
  });
  $('#editor_mode').change(function(el) {
    if ($(this).val() === 'CoffeeScript') {
      return editor.getSession().setMode("ace/mode/coffee");
    } else {
      return editor.getSession().setMode("ace/mode/javascript");
    }
  });
  $('#editor_theme').change(function(el) {
    return editor.setTheme("ace/theme/" + $(this).val());
  });
  $('#editor_font').change(function(el) {
    return editor.setFontSize($(this).val());
  });
  fChangeInputVisibility = function() {
    return $('#tableParams tr').each(function(id) {
      if ($(this).is(':last-child' || $(this).is(':only-child'))) {
        $('.icon.del', this).hide();
        return $('input[type=checkbox]', this).hide();
      } else {
        $('.icon.del', this).show();
        return $('input[type=checkbox]', this).show();
      }
    });
  };
  fAddInputRow = function(tag) {
    var cb, img, inp, tr;
    tr = $('<tr>');
    img = $('<img>').attr('src', '/images/del.png').attr('title', 'Remove?').attr('class', 'icon del');
    cb = $('<input>').attr('type', 'checkbox').attr('title', 'Password shielded input?');
    inp = $('<input>').attr('type', 'text').attr('class', 'textinput');
    tr.append($('<td>').append(img));
    tr.append($('<td>').append(cb));
    tr.append($('<td>').append(inp));
    tag.append(tr);
    fChangeInputVisibility();
    return tr;
  };
  $('#tableParams').on('click', '.icon.del', function() {
    var par;
    main.clearInfo();
    par = $(this).closest('tr');
    if (!par.is(':last-child')) {
      par.remove();
    }
    return fChangeInputVisibility();
  });
  $('#tableParams').on('keyup', 'input', function(e) {
    var code, i, myNewVal, par;
    code = e.keyCode || e.which;
    if (code !== 9) {
      par = $(this).closest('tr');
      myNewVal = $(this).val();
      if (myNewVal !== '') {
        i = 0;
        $('#tableParams input.textinput').each(function() {
          if (myNewVal === $(this).val()) {
            return i++;
          }
        });
        $(this).toggleClass('error', i > 1);
        if (i > 1) {
          main.setInfo(false, 'User-specific properties can\'t have the same name!');
        } else {
          main.clearInfo();
        }
      }
      if (par.is(':last-child')) {
        return fAddInputRow(par.parent());
      } else if (myNewVal === '' && !par.is(':only-child')) {
        return par.remove();
      }
    }
  });
  fChangeInputVisibility();
  $('#but_submit').click(function() {
    var action, listParams, obj;
    if ($('#input_id').val() === '') {
      return main.setInfo(false, "Please enter an " + moduleTypeName + " name!");
    } else {
      if (!oParams.id || confirm('Are you sure you want to overwrite the existing module?')) {
        listParams = {};
        $('#tableParams tr').each(function() {
          var shld, val;
          val = $('input.textinput', this).val();
          shld = $('input[type=checkbox]', this).is(':checked');
          if (val !== "") {
            listParams[val] = shld;
          }
          return true;
        });
        obj = {
          id: oParams.id,
          name: $('#input_id').val(),
          lang: $('#editor_mode').val(),
          published: $('#is_public').is(':checked'),
          code: editor.getValue(),
          globals: listParams
        };
        action = oParams.id ? 'update' : 'create';
        return main.post('/service/' + moduleType + '/' + action, obj).done(function(msg) {
          main.setInfo(true, msg);
          if (oParams.id) {
            return alert("You need to update the rules that use this module in order for the changes to be applied to them!");
          }
        }).fail(function(err) {
          return main.setInfo(false, err.responseText);
        });
      }
    }
  });
  fAddUserParam = function(param, shielded) {
    var tr;
    tr = fAddInputRow($('#tableParams'));
    $('input.textinput', tr).val(param);
    if (shielded) {
      return $('input[type=checkbox]', tr).prop('checked', true);
    }
  };
  if (oParams.id) {
    return main.post('/service/' + moduleType + '/get/' + oParams.id).done(function(oMod) {
      var param, ref, shielded;
      if (oMod) {
        ref = oMod.globals;
        for (param in ref) {
          shielded = ref[param];
          fAddUserParam(param, shielded);
        }
        $('#input_id').val(oMod.name);
        $('#editor_mode').val(oMod.lang);
        if (oMod.lang === 'CoffeeScript') {
          editor.getSession().setMode("ace/mode/coffee");
        } else {
          editor.getSession().setMode("ace/mode/javascript");
        }
        if (oMod.published) {
          $('#is_public').prop('checked', true);
        }
        editor.setValue(oMod.code);
        editor.moveCursorTo(0, 0);
      }
      return fAddUserParam('', false);
    }).fail(fErrHandler("Could not get module " + oParams.id + "!"));
  } else {
    $('#input_id').val('Hello World');
    if (oParams.m === 'ad') {
      editor.insert($('#adSource').text());
      fAddUserParam('', false);
    } else {
      editor.insert($('#etSource').text());
      fAddUserParam('', false);
    }
    return editor.moveCursorTo(0, 0);
  }
};

window.addEventListener('load', fOnLoad, true);
