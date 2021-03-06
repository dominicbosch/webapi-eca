'use strict';
var arrUsedModules, fOnLoad, moduleType, moduleTypeName, updateTitle;

oParams.m = oParams.m === 'ad' ? 'ad' : 'et';

moduleTypeName = oParams.m === 'ad' ? 'Action Dispatcher' : 'Event Trigger';

moduleType = oParams.m === 'ad' ? 'actiondispatcher' : 'eventtrigger';

arrUsedModules = null;

updateTitle = function() {
  var title;
  title = oParams.id ? 'Edit ' : 'Create ';
  title += moduleTypeName;
  return $('#pagetitle').text(title);
};

fOnLoad = function() {
  var editor, fAddInputRow, fAddUserParam, fChangeInputVisibility, updateUsedModules;
  updateTitle();
  main.registerHoverInfo(d3.select('#programcode'), 'modules_code.html');
  main.registerHoverInfo(d3.select('#webhookinfo'), 'webhooks_events.html');
  editor = ace.edit("editor");
  editor.setTheme("ace/theme/crimson_editor");
  editor.getSession().setMode("ace/mode/javascript");
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
  updateUsedModules = function(arrMods) {
    if (arrMods) {
      arrUsedModules = arrMods;
    }
    if (arrUsedModules) {
      return d3.selectAll('#listModules input').property('checked', function(d) {
        return arrUsedModules.indexOf(d.name) > -1;
      });
    }
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
  fChangeInputVisibility();
  main.registerHoverInfoHTML(d3.select('#moduleinfo'), 'The more modules you require, the more memory will be used by your worker');
  main.post('/service/modules/get').done(function(arr) {
    var arrAllowed, newTr;
    arrAllowed = arr.filter(function(o) {
      return o.allowed;
    });
    newTr = d3.select('#listModules').selectAll('tr').data(arrAllowed).enter().append('tr');
    newTr.append('td').append('input').attr('type', 'checkbox');
    newTr.append('td').text(function(d) {
      return d.name;
    });
    newTr.append('td').attr('class', 'smallfont').each(function(d) {
      return main.registerHoverInfoHTML(d3.select(this), d.description + '<br> -> version ' + d.version);
    });
    return updateUsedModules();
  });
  main.post('/service/webhooks/get').done(function(o) {
    var arr;
    arr = o["private"];
    if (arr.length === 0) {
      return d3.select('#listWebhooks').text('No Webhooks available!');
    } else {
      return d3.select('#listWebhooks').selectAll('li').data(arr).enter().append('li').append('kbd').text(function(d) {
        return d.hookname;
      });
    }
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
  $('#but_submit').click(function() {
    var action, e, error, listParams, obj;
    if ($('#input_id').val() === '') {
      return main.setInfo(false, "Please enter an " + moduleTypeName + " name!");
    } else {
      if (!oParams.id || confirm('Are you sure you want to overwrite the existing module?')) {
        try {
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
            code: editor.getValue(),
            globals: listParams,
            modules: []
          };
          d3.selectAll('#listModules tr').each(function(d) {
            if (d3.select(this).select('input').property('checked')) {
              return obj.modules.push(d.name);
            }
          });
          action = oParams.id ? 'update' : 'create';
          return main.post('/service/' + moduleType + '/' + action, obj).done(function(msg) {
            var newurl, wl;
            main.setInfo(true, moduleTypeName + ' stored!', true);
            if (oParams.id && oParams.m === 'ad') {
              alert("You need to update the rules that use this module in order for the changes to be applied to them!");
            }
            setTimeout(function() {
              return window.location.href = 'list_' + oParams.m;
            }, 500);
            wl = window.location;
            oParams.id = msg.id;
            newurl = wl.href + '&id=' + msg.id;
            window.history.pushState({
              path: newurl
            }, '', newurl);
            return updateTitle();
          }).fail(function(err) {
            return main.setInfo(false, err.responseText, true);
          });
        } catch (error) {
          e = error;
          return alert(e);
        }
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
      var param, ref, shielded, uid;
      if (oMod) {
        uid = parseInt(d3.select('body').attr('data-uid'));
        ref = oMod.globals;
        for (param in ref) {
          shielded = ref[param];
          fAddUserParam(param, shielded);
        }
        $('#input_id').val(oMod.name);
        if (uid === oMod.UserId) {
          fAddUserParam('', false);
        } else {
          $('#input_id').addClass('readonly').attr('readonly', true);
          editor.setReadOnly(true);
          $('#editor').addClass('readonly');
          $('#editor_mode').hide();
          $('#but_submit').hide();
          $('#tableParams input').addClass('readonly').attr('readonly', true).attr('disabled', true);
          $('#tableParams img').remove();
        }
        $('#editor_mode').val(oMod.lang);
        if (oMod.lang === 'CoffeeScript') {
          editor.getSession().setMode("ace/mode/coffee");
        } else {
          editor.getSession().setMode("ace/mode/javascript");
        }
        editor.setValue(oMod.code);
        editor.gotoLine(1, 1);
        return updateUsedModules(oMod.modules);
      }
    }).fail(function(err) {
      var newurl, wl;
      fAddUserParam('', false);
      main.setInfo(false, 'Could not get module ' + oParams.id + ': ' + err.responseText);
      wl = window.location;
      newurl = wl.origin + wl.pathname + '?m=' + oParams.m;
      window.history.pushState({
        path: newurl
      }, '', newurl);
      delete oParams.id;
      return updateTitle();
    });
  } else {
    $('#input_id').val('Hello World');
    if (oParams.m === 'ad') {
      editor.insert($('#adSource').text());
      fAddUserParam('', false);
    } else {
      editor.insert($('#etSource').text());
      fAddUserParam('', false);
    }
    return editor.gotoLine(1, 1);
  }
};

window.addEventListener('load', fOnLoad, true);
