'use strict';
var arrSelectedActions, attachListeners, editor, fOnLoad, fillWebhooks, loadRule, setEditorReadOnly, strPublicKey;

editor = null;

strPublicKey = '';

arrSelectedActions = [];

setEditorReadOnly = function(isTrue) {
  editor.setReadOnly(isTrue);
  $('.ace_content').css('background', isTrue ? '#BBB' : '#FFF');
  return $('#fill_example').toggle(!isTrue);
};

fOnLoad = function() {
  var addPromise, afterwards, arrPromises, checkLength;
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
  checkLength = function(arr) {
    if (arr.length === 0) {
      return setEditorReadOnly(true);
    } else {
      return functions.fillList(arr);
    }
  };
  addPromise('/service/actiondispatcher/get', checkLength, 'Unable to fetch Action Dispatchers');
  Promise.all(arrPromises).then(function() {
    if (oParams.id === void 0) {
      return null;
    } else {
      return loadRule();
    }
  }).then(functions.init(false, strPublicKey)).then(attachListeners).then(function() {
    $('#input_name').get(0).setSelectionRange(0, 0);
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
  main.registerHoverInfo(d3.select('#actiontitle'), 'modules_params.html');
  return main.registerHoverInfo(d3.select('#conditionstitle'), 'conditions.html');
};

loadRule = function() {
  return new Promise(function(resolve, reject) {
    console.warn('TODO implement edit rules');
    return main.post('/service/rules/get/' + oParams.id).done(function(oRule) {
      $('#input_name').val(oRule.name);
      d3.select('#selectWebhook option[value="' + oRule.WebhookId + '"]').attr('selected', true);
      editor.setValue('\n' + (JSON.stringify(oRule.conditions, void 0, 2)) + '\n');
      editor.gotoLine(1, 1);
      functions.fillExisting(oRule.actions);
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
    console.log(oHooks);
    createWebhookRow = function(oHook, owner) {
      var isSel;
      isSel = oParams.webhook && oParams.webhook === oHook.hookurl ? true : null;
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
      results.push(createWebhookRow(oHook, oHook.User.username));
    }
    return results;
  }
};

attachListeners = function() {
  return $('#but_submit').click(function() {
    var arrActions, arrConditions, cmd, el, err, error, error1, hurl, j, len, obj;
    main.clearInfo(true);
    try {
      if ($('#input_name').val() === '') {
        $('#input_name').focus();
        throw new Error('Please enter a Rule name!');
      }
      hurl = parseInt($('#selectWebhook select').val());
      if (hurl === -1) {
        throw new Error('Please select a valid Webhook!');
      }
      arrActions = functions.getSelected();
      if (arrActions.length === 0) {
        throw new Error('Please select at least one action!');
      }
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
        hookurl: hurl,
        conditions: arrConditions,
        actions: arrActions
      };
      if (oParams.id === void 0) {
        cmd = 'create';
      } else {
        obj.id = oParams.id;
        cmd = 'update';
      }
      return main.post('/service/rules/' + cmd, obj).done(function(msg) {
        var newurl, wl;
        main.setInfo(true, 'Rule ' + (oParams.id === void 0 ? 'stored!' : 'updated!'));
        wl = window.location;
        oParams.id = msg.id;
        newurl = wl.protocol + "//" + wl.host + wl.pathname + '?id=' + msg.id;
        return window.history.pushState({
          path: newurl
        }, '', newurl);
      }).fail(function(err) {
        return main.setInfo(false, err.responseText);
      });
    } catch (error1) {
      err = error1;
      return main.setInfo(false, 'Error in upload: ' + err.message);
    }
  });
};

window.addEventListener('load', fOnLoad, true);
