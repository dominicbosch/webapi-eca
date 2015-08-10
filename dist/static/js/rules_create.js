'use strict';
var editor, fAddActionUserArgs, fAddActionUserParams, fAddEventUserArgs, fAddSelectedAction, fConvertDayHourToMinutes, fConvertTimeToDate, fDisplayEventParams, fFetchActionFunctionArgs, fFetchActionParams, fFetchEventFunctionArgs, fFetchEventParams, fFillActionFunction, fFillEventParams, fOnLoad, fPrepareEventType, sendRequest, setEditorReadOnly, strPublicKey,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

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

fConvertTimeToDate = function(str) {
  var arrInp, dateConv, h, intHour, intMin, m, txtHr;
  if (!str) {
    dateConv = null;
  } else {
    dateConv = new Date();
    arrInp = str.split(':');
    if (arrInp.length === 1) {
      txtHr = str;
      dateConv.setMinutes(0);
    } else {
      txtHr = arrInp[0];
      intMin = parseInt(arrInp[1]) || 0;
      m = Math.max(0, Math.min(intMin, 59));
      dateConv.setMinutes(m);
    }
    intHour = parseInt(txtHr) || 12;
    h = Math.max(0, Math.min(intHour, 24));
    dateConv.setHours(h);
    dateConv.setSeconds(0);
    dateConv.setMilliseconds(0);
    if (dateConv < new Date()) {
      dateConv.setDate(dateConv.getDate() + 17);
    }
  }
  return dateConv;
};

fConvertDayHourToMinutes = function(strDayHour) {
  var arrInp, d, fParseTime, mins;
  fParseTime = function(str, hasDay) {
    var arrTime, def, h, time;
    arrTime = str.split(':');
    if (hasDay) {
      def = 0;
    } else {
      def = 10;
    }
    if (arrTime.length === 1) {
      time = parseInt(str) || def;
      if (hasDay) {
        return time * 60;
      } else {
        return time;
      }
    } else {
      h = parseInt(arrTime[0]) || 0;
      if (h > 0) {
        def = 0;
      }
      return h * 60 + (parseInt(arrTime[1]) || def);
    }
  };
  if (!strDayHour) {
    mins = 10;
  } else {
    arrInp = strDayHour.split(' ');
    if (arrInp.length === 1) {
      mins = fParseTime(strDayHour);
    } else {
      d = parseInt(arrInp[0]) || 0;
      mins = d * 24 * 60 + fParseTime(arrInp[1], true);
    }
  }
  mins = Math.min(mins, 35700);
  return Math.max(1, mins);
};

fPrepareEventType = function(eventtype, cb) {
  return console.warn('GONE!');
};

fFetchEventParams = function(name) {
  var arr;
  $('#event_trigger_params *').remove();
  if (name) {
    $('#eventParameters').append(domEventTriggerParameters);
    arr = name.split(' -> ');
    sendRequest({
      command: 'get_event_trigger_params',
      data: {
        body: JSON.stringify({
          id: arr[0]
        })
      },
      done: fDisplayEventParams(arr[0]),
      fail: console.log('Error fetching Event Trigger params')
    });
    sendRequest({
      command: 'get_event_trigger_comment',
      data: {
        body: JSON.stringify({
          id: arr[0]
        })
      },
      done: function(data) {
        return $('.comment', domInputEventTiming).html(data.message.replace(/\n/g, '<br>'));
      },
      fail: console.log('Error fetching Event Trigger comment')
    });
    return fFetchEventFunctionArgs(arr);
  }
};

fDisplayEventParams = function(id) {
  return function(data) {
    var i, inp, name, oParams, shielded, table, tr;
    if (data.message) {
      oParams = JSON.parse(data.message);
      table = $('<table>');
      i = 0;
      for (name in oParams) {
        shielded = oParams[name];
        i++;
        tr = $('<tr>');
        tr.append($('<td>').css('width', '20px'));
        tr.append($('<td>').attr('class', 'key').text(name));
        inp = $('<input>');
        if (shielded) {
          inp.attr('type', 'password');
        }
        tr.append($('<td>').text(' : ').append(inp));
        table.append(tr);
      }
      if (i > 0) {
        $('#event_trigger_params').html('<b>Required User-specific Data:</b>');
        $('#event_trigger_params').append(table);
        return fFillEventParams(id);
      }
    }
  };
};

fFillEventParams = function(moduleId) {
  return sendRequest({
    command: 'get_event_trigger_user_params',
    data: {
      body: JSON.stringify({
        id: moduleId
      })
    },
    done: function(data) {
      var oParam, oParams, par, param, results;
      oParams = JSON.parse(data.message);
      results = [];
      for (param in oParams) {
        oParam = oParams[param];
        par = $("#event_trigger_params tr").filter(function() {
          return $('td.key', this).text() === param;
        });
        $('input', par).val(oParam.value);
        $('input', par).attr('unchanged', 'true');
        results.push($('input', par).change(function() {
          return $(this).attr('unchanged', 'false');
        }));
      }
      return results;
    }
  });
};

fFetchEventFunctionArgs = function(arrName) {
  return sendRequest({
    command: 'get_event_trigger_function_arguments',
    data: {
      body: JSON.stringify({
        id: arrName[0]
      })
    },
    done: function(data) {
      var functionArgument, j, len, oParams, ref, table, td, tr;
      if (data.message) {
        oParams = JSON.parse(data.message);
        if (oParams[arrName[1]]) {
          if (oParams[arrName[1]].length > 0) {
            $('#event_trigger_params').append($("<b>").text('Required Rule-specific Data:'));
          }
          table = $('<table>').appendTo($('#event_trigger_params'));
          ref = oParams[arrName[1]];
          for (j = 0, len = ref.length; j < len; j++) {
            functionArgument = ref[j];
            tr = $('<tr>').attr('class', 'funcMappings').appendTo(table);
            tr.append($('<td>').css('width', '20px'));
            td = $('<td>').appendTo(tr);
            td.append($('<div>').attr('class', 'funcarg').text(functionArgument));
            tr.append(td);
            tr.append($('<td>').text(' : '));
            td = $('<td>').appendTo(tr);
            td.append($('<input>').attr('type', 'text'));
            tr.append(td);
          }
          return sendRequest({
            command: 'get_event_trigger_user_arguments',
            data: {
              body: JSON.stringify({
                ruleId: $('#input_id').val(),
                moduleId: arrName[0]
              })
            },
            done: fAddEventUserArgs(arrName[1])
          });
        }
      }
    },
    fail: console.log('Error fetching event trigger function arguments')
  });
};

fAddEventUserArgs = function(name) {
  return function(data) {
    var arrFuncs, key, oFunc, par, ref, results, tr;
    ref = data.message;
    results = [];
    for (key in ref) {
      arrFuncs = ref[key];
      par = $("#event_trigger_params");
      results.push((function() {
        var j, len, ref1, results1;
        ref1 = JSON.parse(arrFuncs);
        results1 = [];
        for (j = 0, len = ref1.length; j < len; j++) {
          oFunc = ref1[j];
          tr = $("tr", par).filter(function() {
            return $('.funcarg', this).text() === ("" + oFunc.argument);
          });
          results1.push($("input[type=text]", tr).val(oFunc.value));
        }
        return results1;
      })());
    }
    return results;
  };
};

fAddSelectedAction = function(name) {
  var arrEls, arrName, fDelayed, img, ref, table, td, tr;
  arrName = name.split(' -> ');
  arrEls = $("#action_dispatcher_params div.modName").map(function() {
    return $(this).text();
  }).get();
  table = $('#selected_actions');
  tr = $('<tr>').appendTo(table);
  img = $('<img>').attr('src', 'images/red_cross_small.png');
  tr.append($('<td>').css('width', '20px').append(img));
  tr.append($('<td>').attr('class', 'title').text(name));
  td = $('<td>').attr('class', 'funcMappings').appendTo(tr);
  fFetchActionFunctionArgs(td, arrName);
  if (ref = arrName[0], indexOf.call(arrEls, ref) < 0) {
    fFetchActionParams(arrName[0]);
  }
  $("#select_actions option").each(function() {
    if ($(this).text() === name) {
      return $(this).remove();
    }
  });
  fDelayed = function() {
    return fFillActionFunction(arrName[0]);
  };
  return setTimeout(fDelayed, 300);
};

fFetchActionParams = function(modName) {
  return sendRequest({
    command: 'get_action_dispatcher_params',
    data: {
      body: JSON.stringify({
        id: modName
      })
    },
    done: function(data) {
      var comment, div, inp, name, oParams, results, shielded, subdiv, table, tr;
      if (data.message) {
        oParams = JSON.parse(data.message);
        if (JSON.stringify(oParams) !== '{}') {
          domSectionActionParameters.show();
          div = $('<div>').appendTo($('#action_dispatcher_params'));
          subdiv = $('<div> ').appendTo(div);
          subdiv.append($('<div>')).attr('class', 'modName underlined').text(modName);
          comment = $('<div>').attr('class', 'comment indent20').appendTo(div);
          sendRequest({
            command: 'get_action_dispatcher_comment',
            data: {
              body: JSON.stringify({
                id: modName
              })
            },
            done: function(data) {
              return comment.html(data.message.replace(/\n/g, '<br>'));
            },
            fail: console.log('Error fetching Event Trigger comment')
          });
          table = $('<table>');
          div.append(table);
          results = [];
          for (name in oParams) {
            shielded = oParams[name];
            tr = $('<tr>');
            tr.append($('<td>').css('width', '20px'));
            tr.append($('<td>').attr('class', 'key').text(name));
            inp = $('<input>');
            if (shielded) {
              inp.attr('type', 'password');
            } else {
              inp.attr('type', 'text');
            }
            tr.append($('<td>').text(' : ').append(inp));
            results.push(table.append(tr));
          }
          return results;
        }
      }
    },
    fail: console.log('Error fetching action dispatcher params')
  });
};

fFetchActionFunctionArgs = function(tag, arrName) {
  return sendRequest({
    command: 'get_action_dispatcher_function_arguments',
    data: {
      body: JSON.stringify({
        id: arrName[0]
      })
    },
    done: function(data) {
      var functionArgument, j, len, oParams, ref, results, table, td, tr;
      if (data.message) {
        oParams = JSON.parse(data.message);
        if (oParams[arrName[1]]) {
          table = $('<table>').appendTo(tag);
          ref = oParams[arrName[1]];
          results = [];
          for (j = 0, len = ref.length; j < len; j++) {
            functionArgument = ref[j];
            tr = $('<tr>').appendTo(table);
            td = $('<td>').appendTo(tr);
            td.append($('<div>').attr('class', 'funcarg').text(functionArgument));
            tr.append(td);
            td = $('<td>').appendTo(tr);
            td.append($('<input>').attr('type', 'text'));
            results.push(tr.append(td));
          }
          return results;
        }
      }
    },
    fail: console.log('Error fetching action dispatcher function params')
  });
};

fFillActionFunction = function(name) {
  sendRequest({
    command: 'get_action_dispatcher_user_params',
    data: {
      body: JSON.stringify({
        id: name
      })
    },
    done: fAddActionUserParams(name)
  });
  return sendRequest({
    command: 'get_action_dispatcher_user_arguments',
    data: {
      body: JSON.stringify({
        ruleId: $('#input_id').val(),
        moduleId: name
      })
    },
    done: fAddActionUserArgs(name)
  });
};

fAddActionUserParams = function(name) {
  return function(data) {
    var domMod, oParam, oParams, par, param, results;
    oParams = JSON.parse(data.message);
    domMod = $("#action_dispatcher_params div").filter(function() {
      return $('div.modName', this).text() === name;
    });
    results = [];
    for (param in oParams) {
      oParam = oParams[param];
      par = $("tr", domMod).filter(function() {
        return $('td.key', this).text() === param;
      });
      $('input', par).val(oParam.value);
      $('input', par).attr('unchanged', 'true');
      results.push($('input', par).change(function() {
        return $(this).attr('unchanged', 'false');
      }));
    }
    return results;
  };
};

fAddActionUserArgs = function(name) {
  return function(data) {
    var arrFuncs, key, oFunc, par, ref, results, tr;
    ref = data.message;
    results = [];
    for (key in ref) {
      arrFuncs = ref[key];
      par = $("#selected_actions tr").filter(function() {
        return $('td.title', this).text() === (name + " -> " + key);
      });
      results.push((function() {
        var j, len, ref1, results1;
        ref1 = JSON.parse(arrFuncs);
        results1 = [];
        for (j = 0, len = ref1.length; j < len; j++) {
          oFunc = ref1[j];
          tr = $("tr", par).filter(function() {
            return $('.funcarg', this).text() === ("" + oFunc.argument);
          });
          results1.push($("input[type=text]", tr).val(oFunc.value));
        }
        return results1;
      })());
    }
    return results;
  };
};

setEditorReadOnly = function(isTrue) {
  editor.setReadOnly(isTrue);
  return $('.ace_content').css('background', isTrue ? '#BBB' : '#FFF');
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
      $('#selectWebhook').html('<h4 class="empty">No <b>Webhooks</b> available! <a href="/views/webhooks">Create one first!</a></h4>');
      return setEditorReadOnly(true);
    } else {
      domSelect = $('<select>').attr('class', 'mediummarged');
      createWebhookRow = function(oHook, isMine) {
        var img, tit;
        img = oHook.isPublic === 'true' ? 'public' : 'private';
        tit = oHook.isPublic === 'true' ? 'Public' : 'Private';
        return domSelect.append($("<option value=\"" + oHook.hookid + "\">" + oHook.hookname + " (" + (isMine ? 'yours' : oHook.username) + ")</option>"));
      };
      $('#selectWebhook').append($('<div>').append($('<h4>').text('Your available Webhooks:').append(domSelect)));
      ref = oHooks["private"];
      for (hookid in ref) {
        oHook = ref[hookid];
        createWebhookRow(oHook, true);
      }
      ref1 = oHooks["public"];
      results = [];
      for (hookid in ref1) {
        oHook = ref1[hookid];
        results.push(createWebhookRow(oHook));
      }
      return results;
    }
  });
  req = sendRequest('/service/actiondispatcher/getall');
  req.done(function(arrAD) {
    if (arrAD.length === 0) {
      $('#actionSelection').html('<h4 class="empty">No <b>Action Dispatchers</b> available! <a href="/views/modules_create?m=ad">Create one first!</a></h4>');
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
          } catch (_error) {}
        }
        return console.log('Error in upload: ' + msg)(err);
      }
    });
  }
};

window.addEventListener('load', fOnLoad, true);
