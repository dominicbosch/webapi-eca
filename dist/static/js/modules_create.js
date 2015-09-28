'use strict';
var fErrHandler, fOnLoad;

if (oParams.id) {
  oParams.id = decodeURIComponent(oParams.id);
}

fErrHandler = function(errMsg) {
  return function(err) {
    if (err.status === 401) {
      return window.location.href = "/";
    } else {
      return $('#log_col').text("");
    }
  };
};

fOnLoad = function() {
  var dateNow, editor, fAddInputRow, fAddUserParam, fChangeInputVisibility, obj, title;
  title = oParams.id ? 'Edit ' : 'Create ';
  title = title + (oParams.m === 'ad' ? 'Action Dispatcher' : 'Event Trigger');
  $('#pagetitle').text(title);
  if (oParams.m !== 'ad') {
    main.registerHoverInfo($('#schedule > h2'), 'modules_schedule.html');
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
        $('img', this).hide();
        return $('input[type=checkbox]', this).hide();
      } else {
        $('img', this).show();
        return $('input[type=checkbox]', this).show();
      }
    });
  };
  fAddInputRow = function(tag) {
    var cb, img, inp, tr;
    tr = $('<tr>');
    img = $('<img>').attr('title', 'Remove?').attr('src', '/images/red_cross_small.png');
    cb = $('<input>').attr('type', 'checkbox').attr('title', 'Password shielded input?');
    inp = $('<input>').attr('type', 'text').attr('class', 'textinput');
    tr.append($('<td>').append(img));
    tr.append($('<td>').append(cb));
    tr.append($('<td>').append(inp));
    tag.append(tr);
    fChangeInputVisibility();
    return tr;
  };
  $('#tableParams').on('click', 'img', function() {
    var par;
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
        $(this).toggleClass('inputerror', i > 1);
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
    var fCheckOverwrite, listParams, obj;
    if ($('#input_id').val() === '') {
      return alert("Please enter an " + moduleName + " name!");
    } else {
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
        body: JSON.stringify({
          id: $('#input_id').val(),
          lang: $('#editor_mode').val(),
          "public": $('#is_public').is(':checked'),
          data: editor.getValue(),
          params: JSON.stringify(listParams)
        })
      };
      fCheckOverwrite = function(obj) {
        return function(err) {
          var bod;
          if (err.status === 409) {
            if (confirm('Are you sure you want to overwrite the existing module?')) {
              bod = JSON.parse(obj.body);
              bod.overwrite = true;
              obj.body = JSON.stringify(bod);
              return $.post('/usercommand/forge_' + oParams.type, obj).done(function(data) {
                $('#info').text(data.message);
                $('#info').attr('class', 'success');
                return alert("You need to update the rules that use this module in order for the changes to be applied to them!");
              }).fail(fErrHandler(moduleName + " not stored!"));
            }
          } else {
            return fErrHandler(moduleName + " not stored!")(err);
          }
        };
      };
      window.scrollTo(0, 0);
      return $.post('/usercommand/forge_' + oParams.type, obj).done(function(data) {
        $('#info').text(data.message);
        return $('#info').attr('class', 'success');
      }).fail(fCheckOverwrite(obj));
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
    obj = {
      body: JSON.stringify({
        id: oParams.id
      })
    };
    return $.post('/usercommand/get_full_' + oParams.type, obj).done(function(data) {
      var oMod, param, ref, shielded;
      oMod = JSON.parse(data.message);
      if (oMod) {
        ref = JSON.parse(oMod.params);
        for (param in ref) {
          shielded = ref[param];
          fAddUserParam(param, shielded);
        }
        $('#input_id').val(oMod.id);
        $('#editor_mode').val(oMod.lang);
        if (oMod.lang === 'CoffeeScript') {
          editor.getSession().setMode("ace/mode/coffee");
        } else {
          editor.getSession().setMode("ace/mode/javascript");
        }
        if (oMod["public"] === 'true') {
          $('#is_public').prop('checked', true);
        }
        editor.setValue(oMod.data);
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
