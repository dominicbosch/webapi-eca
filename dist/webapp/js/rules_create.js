'use strict';
var addAction, arrAllActions, arrSelectedActions, editor, fOnLoad, removeAction, setEditorReadOnly, strPublicKey, updateParameterList;

editor = null;

strPublicKey = '';

arrAllActions = null;

arrSelectedActions = [];

setEditorReadOnly = function(isTrue) {
  editor.setReadOnly(isTrue);
  $('.ace_content').css('background', isTrue ? '#BBB' : '#FFF');
  return $('#fill_example').toggle(!isTrue);
};

fOnLoad = function() {
  main.post('/service/session/publickey').done(function(data) {
    return strPublicKey = data;
  }).fail(function(err) {
    return main.setInfo(false, 'Error when fetching public key. Unable to send user specific parameters securely!');
  });
  editor = ace.edit("divConditionsEditor");
  editor.setTheme("ace/theme/crimson_editor");
  editor.setFontSize("14px");
  editor.getSession().setMode("ace/mode/json");
  editor.setShowPrintMargin(false);
  $('#editor_theme').change(function(el) {
    return editor.setTheme("ace/theme/" + $(this).val());
  });
  $('#editor_font').change(function(el) {
    return editor.setFontSize($(this).val());
  });
  $('#fill_example').click(function() {
    editor.setValue("\n[\n	{\n		\"selector\": \".nested_property\",\n		\"type\": \"string\",\n		\"operator\": \"<=\",\n		\"compare\": \"has this value\"\n	}\n]");
    return editor.gotoLine(1, 1);
  });
  $('#input_name').focus();
  main.post('/service/webhooks/get').done(function(oHooks) {
    var createWebhookRow, d3Sel, i, oHook, prl, pul, ref, ref1, results;
    prl = oHooks["private"] ? Object.keys(oHooks["private"]).length : 0;
    pul = oHooks["public"] ? Object.keys(oHooks["public"]).length : 0;
    if (prl + pul === 0) {
      d3.select('#selectWebhook').append('h3').classed('empty', true).html('No <b>Webhooks</b> available! <a href="/views/webhooks">Create one first!</a>');
      return setEditorReadOnly(true);
    } else {
      d3Sel = d3.select('#selectWebhook').append('h3').text('Active Webhooks:').append('select').attr('class', 'mediummarged smallfont');
      createWebhookRow = function(oHook, owner) {
        var isSel;
        isSel = oParams.webhook && oParams.webhook === oHook.id ? true : null;
        return d3Sel.append('option').attr('value', oHook.id).attr('selected', isSel).text(oHook.hookname + ' (' + owner + ')');
      };
      ref = oHooks["private"];
      for (i in ref) {
        oHook = ref[i];
        createWebhookRow(oHook, 'yours');
      }
      ref1 = oHooks["public"];
      results = [];
      for (i in ref1) {
        oHook = ref1[i];
        results.push(createWebhookRow(oHook, oHook.username));
      }
      return results;
    }
  });
  main.registerHoverInfo(d3.select('#actiontitle'), 'modules_params.html');
  main.post('/service/actiondispatcher/get').done(function(arrAD) {
    var d3row, d3sel;
    arrAllActions = arrAD;
    if (arrAD.length === 0) {
      return setEditorReadOnly(true);
    } else {
      d3.select('#actionEmpty').style('display', 'none');
      d3.select('#actionSection').style('visibility', 'visible').select('table').selectAll('tr').data(arrAD, function(d) {
        return d != null ? d.id : void 0;
      }).enter().append('tr').each(function(oMod) {
        var d3This, func, list, results, trNew;
        d3This = d3.select(this);
        main.registerHoverInfoHTML(d3This.append('td').text(oMod.name), oMod.comment);
        list = d3This.append('td').append('table');
        results = [];
        for (func in oMod.functions) {
          trNew = list.append('tr');
          trNew.append('td').append('button').text('add').attr('onclick', 'addAction(' + oMod.id + ', "' + func + '")');
          results.push(trNew.append('td').text(func));
        }
        return results;
      });
      d3sel = d3.select('#actionSection table');
      d3row = d3sel.selectAll('tr').data(arrAD).enter().append('tr');
      d3row.append('td').text(function(d) {
        return d.name;
      });
      return d3row.append('td');
    }
  });
  $('#actionSection select').on('change', function() {
    var opt;
    domSectionSelectedActions.show();
    opt = $('option:selected', this);
    return fAddSelectedAction(opt.text());
  });
  $('#selected_actions').on('click', 'img', function() {
    var act, arrName, nMods, opt;
    act = $(this).closest('td').siblings('.title').text();
    arrName = act.split(' -> ');
    nMods = 0;
    $("#selected_actions td.title").each(function() {
      var arrNm;
      arrNm = $(this).text().split(' -> ');
      if (arrNm[0] === arrName[0]) {
        return nMods++;
      }
    });
    if (nMods === 1) {
      $('#action_dispatcher_params > div').each(function() {
        if ($(this).children('div.modName').text() === arrName[0]) {
          return $(this).remove();
        }
      });
    }
    if ($('#selected_actions td.title').length === 0) {
      domSectionSelectedActions.hide();
    }
    if ($('#action_dispatcher_params > div').length === 0) {
      domSectionActionParameters.hide();
    }
    opt = $('<option>').text(act);
    $('#actionSection select').append(opt);
    return $(this).closest('tr').remove();
  });
  $('#but_submit').click(function() {
    var arrActions, arrConditions, el, err, error, error1, j, len, obj;
    window.scrollTo(0, 0);
    main.clearInfo();
    try {
      if ($('#input_name').val() === '') {
        $('#input_name').focus();
        throw new Error('Please enter a rule name!');
      }
      if (arrSelectedActions.length === 0) {
        throw new Error('Please select at least one action or create one!');
      }
      arrActions = [];
      d3.selectAll('.firstlevel').each(function(oModule) {
        var d3module, oAction;
        oAction = {
          id: oModule.id,
          globals: {},
          functions: {}
        };
        d3module = d3.select(this);
        d3module.selectAll('.glob').each(function() {
          var d3t, d3val, key, val;
          d3t = d3.select(this);
          key = d3t.select('.key').text();
          d3val = d3t.select('.val input');
          val = d3val.node().value;
          if (val === '') {
            d3val.node().focus();
            throw new Error('Please enter a value in all requested fields!');
          }
          if (oAction.globals[key] === 'true' && d3val.attr('changed') === 'yes') {
            val = cryptico.encrypt(val, strPublicKey).cipher;
          }
          return oAction.globals[key] = val;
        });
        d3module.selectAll('.actions').each(function(dFunc) {
          var d3arg;
          oAction.functions[dFunc.name] = {};
          return d3arg = d3.select(this).selectAll('.arg').each(function(d) {
            var val;
            d3arg = d3.select(this);
            val = d3arg.select('.val input').node().value;
            if (val === '') {
              d3arg.node().focus();
              throw new Error('Please enter a value in all requested fields!');
            }
            return oAction.functions[dFunc.name][d] = val;
          });
        });
        return arrActions.push(oAction);
      });
      try {
        arrConditions = JSON.parse(editor.getValue());
      } catch (error) {
        err = error;
        throw new Error("Parsing of your conditions failed! Needs to be an Array of Strings!");
      }
      if (!(arrConditions instanceof Array)) {
        throw new Error("Conditions Invalid! Needs to be an Array of Objects!");
      }
      for (j = 0, len = arrConditions.length; j < len; j++) {
        el = arrConditions[j];
        if (!(el instanceof Object)) {
          throw new Error("Conditions Invalid! Needs to be an Array of Objects!");
        }
      }
      obj = {
        name: $('#input_name').val(),
        hookid: $('#selectWebhook select').val(),
        conditions: arrConditions,
        actions: arrActions
      };
      return main.post('/service/rules/store', obj).done(function(msg) {
        return main.setInfo(true, msg);
      }).fail(function(err) {
        if (err.status === 409) {
          if (confirm('Are you sure you want to overwrite the existing rule?')) {
            obj.overwrite = true;
            return main.post('service/rules/store', obj).done(function(msg) {
              return main.setInfo(true, msg);
            }).fail(function(err) {
              return main.setInfo(false, err.responseText);
            });
          }
        } else {
          return main.setInfo(false, err.responseText);
        }
      });
    } catch (error1) {
      err = error1;
      return main.setInfo(false, 'Error in upload: ' + err.message);
    }
  });
  if (oParams.id) {
    return main.post({
      command: 'get_rule',
      data: {
        body: JSON.stringify({
          id: oParams.id
        })
      },
      done: function(data) {
        var oRule;
        oRule = JSON.parse(data.message);
        if (oRule) {
          $('#input_name').val(oRule.id);
          return fPrepareEventType(oRule.eventtype, function() {
            var action, arrName, d, j, len, mins, ref, results;
            switch (oRule.eventtype) {
              case 'Event Trigger':
                $('select', domSelectEventTrigger).val(oRule.eventname);
                if ($('select', domSelectEventTrigger).val() === oRule.eventname) {
                  fFetchEventParams(oRule.eventname);
                  d = new Date(oRule.eventstart);
                  mins = d.getMinutes();
                  if (mins.toString().length === 1) {
                    mins = '0' + mins;
                  }
                  $('#input_start', domInputEventTiming).val(d.getHours() + ':' + mins);
                  $('#input_interval', domInputEventTiming).val(oRule.eventinterval);
                } else {
                  window.scrollTo(0, 0);
                  $('#info').text('Error loading Rule: Your Event Trigger does not exist anymore!');
                  $('#info').attr('class', 'error');
                }
                break;
              case 'Webhook':
                $('select', domSelectWebhook).val(oRule.eventname);
                if ($('select', domSelectWebhook).val() === oRule.eventname) {
                  window.scrollTo(0, 0);
                  $('#info').text('Your Webhook does not exist anymore!');
                  $('#info').attr('class', 'error');
                }
            }
            editor.setValue(JSON.stringify(oRule.conditions, void 0, 2));
            domSectionSelectedActions.show();
            ref = oRule.actions;
            results = [];
            for (j = 0, len = ref.length; j < len; j++) {
              action = ref[j];
              arrName = action.split(' -> ');
              results.push(fAddSelectedAction(action));
            }
            return results;
          });
        }
      },
      fail: function(err) {
        var msg;
        if (err.responseText === '') {
          msg = 'No Response from Server!';
        } else {
          try {
            msg = JSON.parse(err.responseText).message;
          } catch (undefined) {}
        }
        return console.log('Error in upload: ' + msg)(err);
      }
    });
  }
};

window.addEventListener('load', fOnLoad, true);

addAction = function(id, name) {
  var oAd, oSelMod;
  oSelMod = arrSelectedActions.filter(function(o) {
    return o.id === id;
  })[0];
  if (!oSelMod) {
    oAd = arrAllActions.filter(function(d) {
      return d.id === id;
    })[0];
    oSelMod = {
      id: oAd.id,
      currid: 0,
      name: oAd.name,
      globals: oAd.globals,
      functions: oAd.functions,
      arr: []
    };
    arrSelectedActions.push(oSelMod);
  }
  oSelMod.arr.push({
    name: name,
    modid: oSelMod.id,
    funcid: oSelMod.currid++,
    args: oSelMod.functions[name]
  });
  return updateParameterList();
};

removeAction = function(d) {
  var arrSel, d3t, id;
  d3t = d3.select(this);
  arrSel = arrSelectedActions.filter(function(o) {
    return o.id === d.modid;
  })[0];
  id = arrSel.arr.map(function(o) {
    return o.funcid;
  }).indexOf(d.funcid);
  arrSel.arr.splice(id, 1);
  if (arrSel.arr.length === 0) {
    id = arrSelectedActions.map(function(o) {
      return o.id;
    }).indexOf(d.modid);
    arrSelectedActions.splice(id, 1);
  }
  return updateParameterList();
};

updateParameterList = function() {
  var d3New, d3Rows, dModule, funcParams, funcs, newFuncs, title, visibility;
  visibility = arrSelectedActions.length > 0 ? 'visible' : 'hidden';
  d3.select('#selectedActions').style('visibility', visibility);
  d3Rows = d3.select('#selectedActions').selectAll('.firstlevel').data(arrSelectedActions, function(d) {
    return d.id;
  });
  d3Rows.exit().transition().style('opacity', 0).remove();
  d3New = d3Rows.enter().append('div').attr('class', 'row firstlevel');
  dModule = d3New.append('div').attr('class', 'col-sm-6');
  dModule.append('h4').text(function(d) {
    return d.name;
  });
  dModule.each(function(d) {
    var k, nd, ref, results, v;
    ref = d.globals;
    results = [];
    for (k in ref) {
      v = ref[k];
      nd = d3.select(this).append('div').attr('class', 'row glob');
      nd.append('div').attr('class', 'col-xs-3 key').text(k);
      results.push(nd.append('div').attr('class', 'col-xs-9 val').append('input').attr('type', v === 'true' ? 'password' : 'text').on('change', function() {
        return d3.select(this).attr('changed', 'yes');
      }));
    }
    return results;
  });
  funcs = d3Rows.selectAll('.actions').data(function(d) {
    return d.arr;
  });
  funcs.exit().transition().style('opacity', 0).remove();
  newFuncs = funcs.enter().append('div').attr('class', 'actions col-sm-6').append('div').attr('class', 'row');
  title = newFuncs.append('div').attr('class', 'col-sm-12');
  title.append('img').attr('src', '/images/del.png').attr('class', 'icon del').on('click', removeAction);
  title.append('span').text(function(d) {
    return d.name;
  });
  funcParams = newFuncs.selectAll('.notexisting').data(function(d) {
    return d.args;
  }).enter().append('div').attr('class', 'col-sm-12 arg').append('div').attr('class', 'row');
  funcParams.append('div').attr('class', 'col-xs-3 key').text(function(d) {
    return d;
  });
  return funcParams.append('div').attr('class', 'col-xs-9 val').append('input').attr('type', 'text');
};
