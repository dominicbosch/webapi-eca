'use strict';
var addAction, arrAllActions, arrSelectedActions, editor, fOnLoad, removeAction, sendRequest, setEditorReadOnly, strPublicKey, updateParameterList;

editor = null;

strPublicKey = '';

arrAllActions = null;

arrSelectedActions = [];

sendRequest = function(url, data, cb) {
  var req;
  main.clearInfo();
  req = $.post(url, data);
  return req.fail(function(err) {
    if (err.status === 401) {
      return window.location.href = '/views/login';
    } else {
      return typeof cb === "function" ? cb(err) : void 0;
    }
  });
};

setEditorReadOnly = function(isTrue) {
  editor.setReadOnly(isTrue);
  $('.ace_content').css('background', isTrue ? '#BBB' : '#FFF');
  return $('#fill_example').toggle(!isTrue);
};

fOnLoad = function() {
  var req;
  req = sendRequest('/service/session/publickey', null, function(err) {
    return main.setInfo(false, 'Error when fetching public key. Unable to send user specific parameters securely!');
  });
  req.done(function(data) {
    return strPublicKey = data;
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
  $('#input_id').focus();
  req = sendRequest('/service/webhooks/getall');
  req.done(function(oHooks) {
    var createWebhookRow, d3Sel, hookid, oHook, prl, pul, ref, ref1, results;
    prl = oHooks["private"] ? Object.keys(oHooks["private"]).length : 0;
    pul = oHooks["public"] ? Object.keys(oHooks["public"]).length : 0;
    if (prl + pul === 0) {
      d3.select('#selectWebhook').append('h3').classed('empty', true).html('No <b>Webhooks</b> available! <a href="/views/webhooks">Create one first!</a>');
      return setEditorReadOnly(true);
    } else {
      d3Sel = d3.select('#selectWebhook').append('h3').text('Your Webhooks:').append('select').attr('class', 'mediummarged smallfont');
      createWebhookRow = function(hookid, oHook, owner) {
        var isSel;
        isSel = oParams.webhook && oParams.webhook === hookid ? true : null;
        return d3Sel.append('option').attr('value', hookid).attr('selected', isSel).text(oHook.hookname + ' (' + owner + ')');
      };
      ref = oHooks["private"];
      for (hookid in ref) {
        oHook = ref[hookid];
        createWebhookRow(hookid, oHook, 'yours');
      }
      ref1 = oHooks["public"];
      results = [];
      for (hookid in ref1) {
        oHook = ref1[hookid];
        results.push(createWebhookRow(hookid, oHook, oHook.username));
      }
      return results;
    }
  });
  req = sendRequest('/service/actiondispatcher/get');
  req.done(function(arrAD) {
    var d3as, d3row, d3sel;
    console.log(arrAD);
    arrAllActions = arrAD;
    d3as = d3.select('#actionSection').style('visibility', 'visible');
    if (arrAD.length === 0) {
      d3as.selectAll('*').remove();
      d3as.append('h3').classed('empty', true).html('No <b>Action Dispatchers</b> available! ').append('a').attr('href', '/views/modules_create?m=ad').text('Create one first!');
      return setEditorReadOnly(true);
    } else {
      d3as.select('table').selectAll('tr').data(arrAD, function(d) {
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
    var actFuncs, acts, ap, conds, err, error, error1, fCheckOverwrite, obj;
    window.scrollTo(0, 0);
    try {
      if ($('#input_id').val() === '') {
        $('#input_id').focus();
        throw new Error('Please enter a rule name!');
      }
      console.warn('GONE!');
      if ($('#selected_actions tr').length === 0) {
        throw new Error('Please select at least one action or create one!');
      }
      ap = {};
      $('> div', $('#action_dispatcher_params')).each(function() {
        var modName, params;
        modName = $('.modName', this).text();
        params = {};
        $('tr', this).each(function() {
          var encryptedParam, key, shielded, val;
          key = $('.key', this).text();
          val = $('input', this).val();
          shielded = $('input', this).attr('type') === 'password';
          if (val === '') {
            $('input', this).focus();
            throw new Error("'" + key + "' missing for '" + modName + "'");
          }
          params[key] = {
            shielded: shielded
          };
          if (!shielded || $('input', this).attr('unchanged') !== 'true') {
            encryptedParam = cryptico.encrypt(val, strPublicKey);
            return params[key].value = encryptedParam.cipher;
          } else {
            return params[key].value = val;
          }
        });
        return ap[modName] = params;
      });
      acts = [];
      actFuncs = {};
      $('#selected_actions td.title').each(function() {
        var actionName, par;
        actionName = $(this).text();
        actFuncs[actionName] = [];
        acts.push(actionName);
        par = $(this).parent();
        return $('.funcMappings tr', par).each(function() {
          return actFuncs[actionName].push({
            argument: $('div.funcarg', this).text(),
            value: $('input[type=text]', this).val()
          });
        });
      });
      try {
        conds = JSON.parse(editor.getValue());
      } catch (error) {
        err = error;
        throw new Error("Parsing of your conditions failed! Needs to be an Array of Strings!");
      }
      if (!(conds instanceof Array)) {
        throw new Error("Conditions Invalid! Needs to be an Array of Strings!");
      }
      fCheckOverwrite = function(obj) {
        return function(err) {
          var payl;
          if (err.status === 409) {
            if (confirm('Are you sure you want to overwrite the existing rule?')) {
              payl = JSON.parse(obj.body);
              payl.overwrite = true;
              obj.body = JSON.stringify(payl);
              return sendRequest({
                command: obj.command,
                data: obj,
                done: function(data) {
                  $('#info').text(data.message);
                  return $('#info').attr('class', 'success');
                },
                fail: console.log(obj.id + " not stored!")
              });
            }
          } else {
            return console.log(obj.id + " not stored!")(err);
          }
        };
      };
      console.warn('GONE!');
      obj = {
        body: JSON.stringify({
          id: $('#input_id').val(),
          eventtype: eventtype,
          eventname: eventname,
          eventparams: ep,
          eventstart: start,
          eventinterval: mins,
          eventfunctions: evtFuncs,
          conditions: conds,
          actions: acts,
          actionparams: ap,
          actionfunctions: actFuncs
        })
      };
      return sendRequest({
        command: 'forge_rule',
        data: obj,
        done: function(data) {
          $('#info').text(data.message);
          return $('#info').attr('class', 'success');
        },
        fail: fCheckOverwrite(obj)
      });
    } catch (error1) {
      err = error1;
      $('#info').text('Error in upload: ' + err.message);
      $('#info').attr('class', 'error');
      return alert(err.message);
    }
  });
  if (oParams.id) {
    return sendRequest({
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
          $('#input_id').val(oRule.id);
          return fPrepareEventType(oRule.eventtype, function() {
            var action, arrName, d, i, len, mins, ref, results;
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
            for (i = 0, len = ref.length; i < len; i++) {
              action = ref[i];
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
      name: oAd.name,
      globals: oAd.globals,
      functions: oAd.functions,
      arr: []
    };
    arrSelectedActions.push(oSelMod);
  }
  oSelMod.arr.push({
    name: name,
    functions: oSelMod.functions[name]
  });
  return updateParameterList();
};

removeAction = function(arrActions, id, name) {
  return updateParameterList();
};

updateParameterList = function() {
  var d3New, d3Rows, dModule, funcs, newFuncs, newModules, visibility;
  console.log(arrSelectedActions);
  visibility = arrSelectedActions.length > 0 ? 'visible' : 'hidden';
  d3.select('#selectedActions').style('visibility', visibility);
  d3Rows = d3.select('#selectedActions').selectAll('.firstlevel').data(arrSelectedActions, function(d) {
    return d.id;
  });
  d3Rows.exit().remove();
  d3New = d3Rows.enter().append('div').attr('class', 'row firstlevel');
  dModule = d3New.append('div').attr('class', 'col-sm-4');
  dModule.append('h4').text(function(d) {
    return d.name;
  });
  dModule.each(function(d) {
    var k, nd, ref, results, v;
    ref = d.globals;
    results = [];
    for (k in ref) {
      v = ref[k];
      nd = d3.select(this).append('div').attr('class', 'row');
      nd.append('div').attr('class', 'col-xs-4').text(k);
      results.push(nd.append('div').attr('class', 'col-xs-8').append('input').attr('type', v === 'true' ? 'password' : 'text'));
    }
    return results;
  });
  funcs = d3Rows.selectAll('.actions').data(function(d) {
    return d.arr;
  });
  funcs.exit().remove();
  newModules = funcs.enter().append('div').attr('class', 'actions col-sm-4');
  newModules.append('span').text(function(d) {
    return d.name;
  });
  newFuncs = newModules.append('div').attr('class', 'row').selectAll('div').data(function(d) {
    return d.functions;
  }).enter().append('div').attr('class', 'col-sm-6 params');
  newFuncs.append('div').attr('class', 'img del');
  return newFuncs.append('span').text(function(d) {
    return d;
  });
};
