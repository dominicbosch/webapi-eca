var arrKV, arrParams, domEventTriggerParameters, domInputEventName, domInputEventTiming, domSectionActionParameters, domSectionSelectedActions, domSelectEventTrigger, domSelectWebhook, el, fAddActionUserArgs, fAddActionUserParams, fAddEventUserArgs, fAddSelectedAction, fConvertDayHourToMinutes, fConvertTimeToDate, fDisplayEventParams, fFailedRequest, fFetchActionFunctionArgs, fFetchActionParams, fFetchEventFunctionArgs, fFetchEventParams, fFillActionFunction, fFillEventParams, fIssueRequest, fOnLoad, fPrepareEventType, j, len, oParams, param, strPublicKey, table, tr,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

strPublicKey = '';

arrParams = window.location.search.substring(1).split('&');

oParams = {};

for (j = 0, len = arrParams.length; j < len; j++) {
  param = arrParams[j];
  arrKV = param.split('=');
  oParams[arrKV[0]] = arrKV[1];
}

if (oParams.id) {
  oParams.id = decodeURIComponent(oParams.id);
}

domInputEventName = $('<div>');

el = $('<input>').attr('type', 'text').attr('style', 'font-size:1em').attr('id', 'input_eventname');

domInputEventName.append($('<h4>').text('Event Name : ').append(el));

domSelectWebhook = $('<div>');

el = $('<select>').attr('type', 'text').attr('style', 'font-size:1em').attr('id', 'select_eventhook');

domSelectWebhook.append($('<h4>').text('Webhook Name : ').append(el));

domSelectEventTrigger = $('<div>');

el = $('<select>').attr('type', 'text').attr('style', 'font-size:1em').attr('id', 'select_eventtrigger');

el.change(function() {
  return fFetchEventParams($(this).val());
});

domSelectEventTrigger.append($('<h4>').text('Event Trigger : ').append(el));

domInputEventTiming = $('<div>').attr('class', 'indent20');

$('<div>').attr('class', 'comment').appendTo(domInputEventTiming);

table = $('<table>').appendTo(domInputEventTiming);

tr = $('<tr>').appendTo(table);

tr.append($('<td>').text("Start Time : "));

tr.append($('<td>').append($('<input>').attr('id', 'input_start').attr('type', 'text')));

tr.append($('<td>').html(" <b>\"hh:mm\"</b>, default = Immediately"));

tr = $('<tr>').appendTo(table);

tr.append($('<td>').text("Interval : "));

tr.append($('<td>').append($('<input>').attr('id', 'input_interval').attr('type', 'text')));

tr.append($('<td>').html(" <b>\"days hours:minutes\"</b>, default = 10 minutes"));

domEventTriggerParameters = $('<div>').attr('id', 'event_trigger_params');

domSectionSelectedActions = $('<div>');

domSectionSelectedActions.append($('<div>').html("<b>Selected Actions:</b>"));

domSectionSelectedActions.append($('<table> ').attr('id', 'selected_actions'));

domSectionSelectedActions.hide();

domSectionActionParameters = $('<div>');

domSectionActionParameters.append($('<div>').html("<br><br><b>Required User-specific Data:</b><br><br>"));

domSectionActionParameters.append($('<div>').attr('id', 'action_dispatcher_params'));

domSectionActionParameters.append($('<div>').html("<br><br>"));

domSectionActionParameters.hide();

fFailedRequest = function(msg) {
  return function(err) {
    if (err.status === 401) {
      return window.location.href = 'forge?page=forge_rule';
    } else {
      return fDisplayError(msg);
    }
  };
};

fIssueRequest = function(args) {
  fClearInfo();
  return $.post('/usercommand/' + args.command, args.data).done(args.done).fail(args.fail);
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
  $('#select_event_type').val(eventtype);
  $('#event_parameters > div').detach();
  switch (eventtype) {
    case 'Custom Event':
      $('#event_parameters').append(domInputEventName);
      return typeof cb === "function" ? cb() : void 0;
    case 'Webhook':
      return fIssueRequest({
        command: 'get_all_webhooks',
        done: function(data) {
          var err, hookid, hookname, i, oHooks, selHook;
          try {
            oHooks = JSON.parse(data.message);
            selHook = $('select', domSelectWebhook);
            selHook.children().remove();
            i = 0;
            for (hookid in oHooks) {
              hookname = oHooks[hookid];
              i++;
              selHook.append($('<option>').text(hookname));
            }
            if (i > 0) {
              $('#event_parameters').append(domSelectWebhook);
            } else {
              fDisplayError('No webhooks found! Choose another Event Type or create a Webhook.');
              $('#select_event_type').val('');
            }
          } catch (_error) {
            err = _error;
            fDisplayError('Badly formed webhooks!');
          }
          return typeof cb === "function" ? cb() : void 0;
        },
        fail: function() {
          fFailedRequest('Unable to get webhooks!');
          return typeof cb === "function" ? cb() : void 0;
        }
      });
    case 'Event Trigger':
      return fIssueRequest({
        command: 'get_event_triggers',
        done: function(data) {
          var err, events, evt, id, k, len1, oEps;
          try {
            oEps = JSON.parse(data.message);
            if (JSON.stringify(oEps) === '{}') {
              fDisplayError('No Event Triggers found! Create one first!');
              $('#select_event_type').val('');
            } else {
              $('#event_parameters').append(domSelectEventTrigger);
              $('#event_parameters').append(domInputEventTiming.show());
              $('#select_eventtrigger option').remove();
              for (id in oEps) {
                events = oEps[id];
                for (k = 0, len1 = events.length; k < len1; k++) {
                  evt = events[k];
                  $('#select_eventtrigger').append($('<option>').text(id + ' -> ' + evt));
                }
              }
              fFetchEventParams($('option:selected', domSelectEventTrigger).text());
            }
          } catch (_error) {
            err = _error;
            console.error('ERROR: non-object received for event trigger from server: ' + data.message);
          }
          return typeof cb === "function" ? cb() : void 0;
        },
        fail: function() {
          fFailedRequest('Error fetching Event Trigger');
          return typeof cb === "function" ? cb() : void 0;
        }
      });
  }
};

fFetchEventParams = function(name) {
  var arr;
  $('#event_trigger_params *').remove();
  if (name) {
    $('#event_parameters').append(domEventTriggerParameters);
    arr = name.split(' -> ');
    fIssueRequest({
      command: 'get_event_trigger_params',
      data: {
        body: JSON.stringify({
          id: arr[0]
        })
      },
      done: fDisplayEventParams(arr[0]),
      fail: fFailedRequest('Error fetching Event Trigger params')
    });
    fIssueRequest({
      command: 'get_event_trigger_comment',
      data: {
        body: JSON.stringify({
          id: arr[0]
        })
      },
      done: function(data) {
        return $('.comment', domInputEventTiming).html(data.message.replace(/\n/g, '<br>'));
      },
      fail: fFailedRequest('Error fetching Event Trigger comment')
    });
    return fFetchEventFunctionArgs(arr);
  }
};

fDisplayEventParams = function(id) {
  return function(data) {
    var i, inp, name, shielded;
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
  return fIssueRequest({
    command: 'get_event_trigger_user_params',
    data: {
      body: JSON.stringify({
        id: moduleId
      })
    },
    done: function(data) {
      var oParam, par, results;
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
  return fIssueRequest({
    command: 'get_event_trigger_function_arguments',
    data: {
      body: JSON.stringify({
        id: arrName[0]
      })
    },
    done: function(data) {
      var functionArgument, k, len1, ref, td;
      if (data.message) {
        oParams = JSON.parse(data.message);
        if (oParams[arrName[1]]) {
          if (oParams[arrName[1]].length > 0) {
            $('#event_trigger_params').append($("<b>").text('Required Rule-specific Data:'));
          }
          table = $('<table>').appendTo($('#event_trigger_params'));
          ref = oParams[arrName[1]];
          for (k = 0, len1 = ref.length; k < len1; k++) {
            functionArgument = ref[k];
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
          return fIssueRequest({
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
    fail: fFailedRequest('Error fetching event trigger function arguments')
  });
};

fAddEventUserArgs = function(name) {
  return function(data) {
    var arrFuncs, key, oFunc, par, ref, results;
    ref = data.message;
    results = [];
    for (key in ref) {
      arrFuncs = ref[key];
      par = $("#event_trigger_params");
      results.push((function() {
        var k, len1, ref1, results1;
        ref1 = JSON.parse(arrFuncs);
        results1 = [];
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          oFunc = ref1[k];
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
  var arrEls, arrName, fDelayed, img, ref, td;
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
  return fIssueRequest({
    command: 'get_action_dispatcher_params',
    data: {
      body: JSON.stringify({
        id: modName
      })
    },
    done: function(data) {
      var comment, div, inp, name, results, shielded, subdiv;
      if (data.message) {
        oParams = JSON.parse(data.message);
        if (JSON.stringify(oParams) !== '{}') {
          domSectionActionParameters.show();
          div = $('<div>').appendTo($('#action_dispatcher_params'));
          subdiv = $('<div> ').appendTo(div);
          subdiv.append($('<div>')).attr('class', 'modName underlined').text(modName);
          comment = $('<div>').attr('class', 'comment indent20').appendTo(div);
          fIssueRequest({
            command: 'get_action_dispatcher_comment',
            data: {
              body: JSON.stringify({
                id: modName
              })
            },
            done: function(data) {
              return comment.html(data.message.replace(/\n/g, '<br>'));
            },
            fail: fFailedRequest('Error fetching Event Trigger comment')
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
    fail: fFailedRequest('Error fetching action dispatcher params')
  });
};

fFetchActionFunctionArgs = function(tag, arrName) {
  return fIssueRequest({
    command: 'get_action_dispatcher_function_arguments',
    data: {
      body: JSON.stringify({
        id: arrName[0]
      })
    },
    done: function(data) {
      var functionArgument, k, len1, ref, results, td;
      if (data.message) {
        oParams = JSON.parse(data.message);
        if (oParams[arrName[1]]) {
          table = $('<table>').appendTo(tag);
          ref = oParams[arrName[1]];
          results = [];
          for (k = 0, len1 = ref.length; k < len1; k++) {
            functionArgument = ref[k];
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
    fail: fFailedRequest('Error fetching action dispatcher function params')
  });
};

fFillActionFunction = function(name) {
  fIssueRequest({
    command: 'get_action_dispatcher_user_params',
    data: {
      body: JSON.stringify({
        id: name
      })
    },
    done: fAddActionUserParams(name)
  });
  return fIssueRequest({
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
    var domMod, oParam, par, results;
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
    var arrFuncs, key, oFunc, par, ref, results;
    ref = data.message;
    results = [];
    for (key in ref) {
      arrFuncs = ref[key];
      par = $("#selected_actions tr").filter(function() {
        return $('td.title', this).text() === (name + " -> " + key);
      });
      results.push((function() {
        var k, len1, ref1, results1;
        ref1 = JSON.parse(arrFuncs);
        results1 = [];
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          oFunc = ref1[k];
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

fOnLoad = function() {
  var editor, name;
  fIssueRequest({
    command: 'get_public_key',
    done: function(data) {
      return strPublicKey = data.message;
    },
    fail: function(err) {
      if (err.status === 401) {
        return window.location.href = 'forge?page=forge_rule';
      } else {
        return fDisplayError('When fetching public key. Unable to send user specific parameters securely!');
      }
    }
  });
  editor = ace.edit("editor_conditions");
  editor.setTheme("ace/theme/crimson_editor");
  editor.setFontSize("18px");
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
  $('#action_parameters').append(domSectionSelectedActions);
  $('#action_parameters').append(domSectionActionParameters);
  $('#input_id').focus();
  $('#select_event_type').change(function() {
    return fPrepareEventType($(this).val());
  });
  switch (oParams.eventtype) {
    case 'custom':
      name = decodeURIComponent(oParams.eventname);
      $('#input_id').val("My '" + name + "' Rule");
      fPrepareEventType('Custom Event', function() {
        $('input', domInputEventName).val(name);
        $('input', domInputEventName).focus();
        return editor.setValue("[\n\n]");
      });
      break;
    case 'webhook':
      name = decodeURIComponent(oParams.hookname);
      $('#input_id').val("My '" + name + "' Rule");
      fPrepareEventType('Webhook', function() {
        return $('select', domSelectWebhook).val(name);
      });
  }
  fIssueRequest({
    command: 'get_action_dispatchers',
    done: function(data) {
      var act, actions, arrEls, err, i, module, oAis, results;
      try {
        oAis = JSON.parse(data.message);
      } catch (_error) {
        err = _error;
        console.error('ERROR: non-object received from server: ' + data.message);
        return;
      }
      i = 0;
      results = [];
      for (module in oAis) {
        actions = oAis[module];
        results.push((function() {
          var k, len1, results1;
          results1 = [];
          for (k = 0, len1 = actions.length; k < len1; k++) {
            act = actions[k];
            i++;
            arrEls = $("#action_dispatcher_params div").filter(function() {
              return $(this).text() === (module + " -> " + act);
            });
            if (arrEls.length === 0) {
              results1.push($('#select_actions').append($('<option>').text(module + ' -> ' + act)));
            } else {
              results1.push(void 0);
            }
          }
          return results1;
        })());
      }
      return results;
    },
    fail: fFailedRequest('Error fetching Action Dispatchers')
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
    var actFuncs, acts, ap, conds, ep, err, eventname, eventtype, evtFuncs, fCheckOverwrite, mins, obj, start;
    window.scrollTo(0, 0);
    fClearInfo();
    try {
      if ($('#input_id').val() === '') {
        $('#input_id').focus();
        throw new Error('Please enter a rule name!');
      }
      eventtype = $('#select_event_type').val();
      switch (eventtype) {
        case '':
          $('#select_event_type').focus();
          throw new Error('Please choose an event type!');
          break;
        case 'Custom Event':
          el = $('#input_eventname');
          if (el.val() === '') {
            el.focus();
            throw new Error('Please assign an Event Name!');
          }
          eventname = el.val();
          break;
        case 'Webhook':
          eventname = $('#select_eventhook').val();
          break;
        case 'Event Trigger':
          eventname = $('#select_eventtrigger').val();
          ep = {};
          $("#event_trigger_params tr").each(function() {
            var encryptedParam, key, shielded, val;
            key = $(this).children('.key').text();
            val = $('input', this).val();
            if (val === '') {
              $('input', this).focus();
              throw new Error("Please enter a value for '" + key + "' in the event module!");
            }
            shielded = $('input', this).attr('type') === 'password';
            ep[key] = {
              shielded: shielded
            };
            if (!shielded || $('input', this).attr('unchanged') !== 'true') {
              encryptedParam = cryptico.encrypt(val, strPublicKey);
              return ep[key].value = encryptedParam.cipher;
            } else {
              return ep[key].value = val;
            }
          });
          evtFuncs = {};
          evtFuncs[eventname] = [];
          $('#event_trigger_params tr.funcMappings').each(function() {
            return evtFuncs[eventname].push({
              argument: $('div.funcarg', this).text(),
              value: $('input[type=text]', this).val()
            });
          });
      }
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
              return fIssueRequest({
                command: obj.command,
                data: obj,
                done: function(data) {
                  $('#info').text(data.message);
                  return $('#info').attr('class', 'success');
                },
                fail: fFailedRequest(obj.id + " not stored!")
              });
            }
          } else {
            return fFailedRequest(obj.id + " not stored!")(err);
          }
        };
      };
      if ($('#select_event_type').val() === 'Event Trigger') {
        start = fConvertTimeToDate($('#input_start').val()).toISOString();
        mins = fConvertDayHourToMinutes($('#input_interval').val());
      }
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
      return fIssueRequest({
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
    return fIssueRequest({
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
            var action, arrName, d, k, len1, mins, ref, results;
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
                break;
              case 'Custom Event':
                $('input', domInputEventName).val(oRule.eventname);
            }
            editor.setValue(JSON.stringify(oRule.conditions, void 0, 2));
            domSectionSelectedActions.show();
            ref = oRule.actions;
            results = [];
            for (k = 0, len1 = ref.length; k < len1; k++) {
              action = ref[k];
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
        return fFailedRequest('Error in upload: ' + msg)(err);
      }
    });
  }
};

window.addEventListener('load', fOnLoad, true);
