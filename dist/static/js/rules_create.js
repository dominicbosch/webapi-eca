'use strict';
var editor, fOnLoad, sendRequest, setEditorReadOnly, strPublicKey;

editor = null;

strPublicKey = '';

if (oParams.id) {
  oParams.id = decodeURIComponent(oParams.id);
}

sendRequest = function(url, data, cb) {
  var req;
  console.log('sending request to ' + url);
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
  editor.setFontSize("16px");
  editor.getSession().setMode("ace/mode/json");
  editor.setShowPrintMargin(false);
  $('#editor_theme').change(function(el) {
    return editor.setTheme("ace/theme/" + $(this).val());
  });
  $('#editor_font').change(function(el) {
    return editor.setFontSize($(this).val());
  });
  $('#fill_example').click(function() {
    return editor.setValue("\n[\n	{\n		\"selector\": \".nested_property\",\n		\"type\": \"string\",\n		\"operator\": \"<=\",\n		\"compare\": \"has this value\"\n	}\n]");
  });
  $('#input_id').focus();
  req = sendRequest('/service/webhooks/getallvisible');
  req.done(function(oHooks) {
    var createWebhookRow, domSelect, hookid, oHook, prl, pul, ref, ref1, results;
    prl = oHooks["private"] ? Object.keys(oHooks["private"]).length : 0;
    pul = oHooks["public"] ? Object.keys(oHooks["public"]).length : 0;
    if (prl + pul === 0) {
      $('#selectWebhook').html('<h3 class="empty">No <b>Webhooks</b> available! <a href="/views/webhooks">Create one first!</a></h3>');
      return setEditorReadOnly(true);
    } else {
      domSelect = $('<select>').attr('class', 'mediummarged');
      createWebhookRow = function(hookid, oHook, isMine) {
        var img, owner, selStr;
        img = oHook.isPublic === 'true' ? 'public' : 'private';
        owner = isMine ? 'yours' : oHook.username;
        selStr = oParams.webhook && oParams.webhook === hookid ? 'selected' : '';
        return domSelect.append($("<option value=\"" + hookid + "\" " + selStr + ">" + oHook.hookname + " (" + owner + ")</option>"));
      };
      $('#selectWebhook').append($('<h3>').text('Your available Webhooks:').append(domSelect));
      ref = oHooks["private"];
      for (hookid in ref) {
        oHook = ref[hookid];
        createWebhookRow(hookid, oHook, true);
      }
      ref1 = oHooks["public"];
      results = [];
      for (hookid in ref1) {
        oHook = ref1[hookid];
        results.push(createWebhookRow(hookid, oHook));
      }
      return results;
    }
  });
  req = sendRequest('/service/actiondispatcher/getall');
  req.done(function(arrAD) {
    if (arrAD.length === 0) {
      $('#actionSelection').html('<h3 class="empty">No <b>Action Dispatchers</b> available! <a href="/views/modules_create?m=ad">Create one first!</a></h3>');
      return setEditorReadOnly(true);
    } else {
      return console.log('AWESOME', arrAD);
    }
  });
  $('#select_actions').on('change', function() {
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
    $('#select_actions').append(opt);
    return $(this).closest('tr').remove();
  });
  $('#but_submit').click(function() {
    var actFuncs, acts, ap, conds, err, fCheckOverwrite, obj;
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
      } catch (_error) {
        err = _error;
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
    } catch (_error) {
      err = _error;
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
          } catch (_error) {}
        }
        return console.log('Error in upload: ' + msg)(err);
      }
    });
  }
};

window.addEventListener('load', fOnLoad, true);
