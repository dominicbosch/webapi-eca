'use strict';
var addAction, arrAllActions, arrSelectedActions, attachListeners, editor, fOnLoad, fillActions, fillWebhooks, loadRule, removeAction, setEditorReadOnly, strPublicKey, updateParameterList;

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
  var addPromise, afterwards, arrPromises;
  arrPromises = [];
  addPromise = function(url, thenFunc, failMsg) {
    var p;
    p = new Promise(function(resolve, reject) {
      return main.post(url).done(function(dat) {
        return resolve(dat);
      }).fail(function(err) {
        return reject(new Error(failMsg));
      });
    });
    return arrPromises.push(p.then(thenFunc));
  };
  afterwards = function(key) {
    return strPublicKey = key;
  };
  addPromise('/service/session/publickey', afterwards, 'Error when fetching public key. Unable to send user specific parameters securely!');
  addPromise('/service/webhooks/get', fillWebhooks, 'Unable to fetch Webhooks');
  addPromise('/service/actiondispatcher/get', fillActions, 'Unable to fetch Action Dispatchers');
  Promise.all(arrPromises).then(function() {
    if (oParams.id === void 0) {
      return null;
    } else {
      return loadRule();
    }
  }).then(attachListeners).then(function() {
    return $('#input_name').focus();
  })["catch"](function(err) {
    return main.setInfo(false, err.toString());
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
  return main.registerHoverInfo(d3.select('#actiontitle'), 'modules_params.html');
};

window.addEventListener('load', fOnLoad, true);

loadRule = function() {
  return new Promise(function(resolve, reject) {
    console.warn('TODO implement edit rules');
    return main.post('/service/rules/get/' + oParams.id).done(function(oRule) {
      var func, j, len, oAct, ref;
      $('#input_name').val(oRule.name);
      console.log(oRule);
      editor.setValue(JSON.stringify(oRule.conditions, void 0, 2));
      ref = oRule.actions;
      for (j = 0, len = ref.length; j < len; j++) {
        oAct = ref[j];
        for (func in oAct.functions) {
          addAction(oAct.id, func);
        }
      }
      return resolve('Rule loaded');
    }).fail(reject);
  });
};

fillWebhooks = function(oHooks) {
  var createWebhookRow, d3Sel, i, oHook, prl, pul, ref, ref1, results;
  prl = oHooks["private"] ? Object.keys(oHooks["private"]).length : 0;
  pul = oHooks["public"] ? Object.keys(oHooks["public"]).length : 0;
  if (prl + pul === 0) {
    d3.select('#selectWebhook').append('h3').classed('empty', true).html('No <b>Webhooks</b> available! <a href="/views/webhooks">Create one first!</a>');
    return setEditorReadOnly(true);
  } else {
    d3Sel = d3.select('#selectWebhook').append('h3').text('Active Webhooks:').append('select').attr('class', 'mediummarged smallfont');
    d3Sel.append('option').attr('value', -1).text('No Webhook selected');
    createWebhookRow = function(oHook, owner) {
      var isSel;
      isSel = oParams.webhook && oParams.webhook === oHook.hookid ? true : null;
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
};

fillActions = function(arrAD) {
  var d3row, d3sel;
  arrAllActions = arrAD;
  if (arrAD.length === 0) {
    return setEditorReadOnly(true);
  } else {
    d3.select('#actionEmpty').style('display', 'none');
    d3.select('#actionSection').style('visibility', 'visible').select('tbody').selectAll('tr').data(arrAD, function(d) {
      return d != null ? d.id : void 0;
    }).enter().append('tr').each(function(oMod) {
      var d3This, func, list, results, trNew;
      d3This = d3.select(this);
      main.registerHoverInfoHTML(d3This.append('td').text(oMod.name), oMod.comment);
      d3This.append('td').text(function(d) {
        return d.User.username;
      });
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
};

addAction = function(id, funcName) {
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
    name: funcName,
    modid: oSelMod.id,
    funcid: oSelMod.currid++,
    args: oSelMod.functions[funcName]
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
    var encrypted, key, nd, ref, results;
    ref = d.globals;
    results = [];
    for (key in ref) {
      encrypted = ref[key];
      nd = d3.select(this).append('div').attr('class', 'row glob');
      nd.append('div').attr('class', 'col-xs-3 key').text(key);
      results.push(nd.append('div').attr('class', 'col-xs-9 val').append('input').attr('type', encrypted ? 'password' : 'text').on('change', function() {
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

attachListeners = function() {
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
  return $('#but_submit').click(function() {
    var arrActions, arrConditions, cmd, el, err, error, error1, j, len, obj, wid;
    main.clearInfo(true);
    try {
      if ($('#input_name').val() === '') {
        $('#input_name').focus();
        throw new Error('Please enter a rule name!');
      }
      wid = parseInt($('#selectWebhook select').val());
      if (wid === -1) {
        throw new Error('Please select a valid Webhook!');
      }
      if (arrSelectedActions.length === 0) {
        throw new Error('Please select at least one action!');
      }
      arrActions = [];
      d3.selectAll('.firstlevel').each(function(oModule) {
        var d3module, oAction;
        oAction = {
          id: oModule.id,
          globals: {},
          functions: []
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
          if (oModule.globals[key] && d3val.attr('changed') === 'yes') {
            val = cryptico.encrypt(val, strPublicKey).cipher;
          }
          return oAction.globals[key] = val;
        });
        d3module.selectAll('.actions').each(function(dFunc) {
          var d3arg, func;
          func = {
            name: dFunc.name,
            args: []
          };
          d3arg = d3.select(this).selectAll('.arg').each(function(d) {
            var val;
            d3arg = d3.select(this);
            val = d3arg.select('.val input').node().value;
            if (val === '') {
              d3arg.node().focus();
              throw new Error('Please enter a value in all requested fields!');
            }
            return func.args[d] = val;
          });
          return oAction.functions.push(func);
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
        hookid: wid,
        conditions: arrConditions,
        actions: arrActions
      };
      if (oParams.id === void 0) {
        cmd = 'create';
      } else {
        cmd = 'update';
      }
      return main.post('/service/rules/' + cmd, obj).done(function(msg) {
        return main.setInfo(true, msg);
      }).fail(function(err) {
        return main.setInfo(false, err.responseText);
      });
    } catch (error1) {
      err = error1;
      return main.setInfo(false, 'Error in upload: ' + err.message);
    }
  });
};
