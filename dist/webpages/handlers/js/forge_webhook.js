var arrKV, arrParams, fClearInfo, fDisplayError, fFailedRequest, fIssueRequest, fOnLoad, fProcessWebhookList, fShowWebhookUsage, fUpdateWebhookList, hostUrl, oParams, param, _i, _len;

arrParams = window.location.search.substring(1).split('&');

oParams = {};

for (_i = 0, _len = arrParams.length; _i < _len; _i++) {
  param = arrParams[_i];
  arrKV = param.split('=');
  oParams[arrKV[0]] = arrKV[1];
}

if (oParams.id) {
  oParams.id = decodeURIComponent(oParams.id);
}

hostUrl = [location.protocol, '//', location.host].join('');

fClearInfo = function() {
  $('#info').text('');
  return $('#info').attr('class', 'neutral');
};

fDisplayError = function(msg) {
  window.scrollTo(0, 0);
  $('#info').text("Error: " + msg);
  return $('#info').attr('class', 'error');
};

fIssueRequest = function(args) {
  fClearInfo();
  return $.post('/usercommand', args.body).done(args.done).fail(args.fail);
};

fFailedRequest = function(msg) {
  return function(err) {
    if (err.status === 401) {
      return window.location.href = 'forge?page=forge_rule';
    } else {
      return fDisplayError(msg);
    }
  };
};

fUpdateWebhookList = function(cb) {
  return fIssueRequest({
    body: {
      command: 'get_all_webhooks'
    },
    done: fProcessWebhookList(cb),
    fail: fFailedRequest('Unable to get Webhook list')
  });
};

fProcessWebhookList = function(cb) {
  return function(data) {
    var hookid, hookname, img, oHooks, tdName, tdUrl, tr;
    $('#table_webhooks *').remove();
    if (data.message) {
      oHooks = JSON.parse(data.message);
      $('#table_webhooks').append($('<h3>').text('Your existing Webhooks:'));
      for (hookid in oHooks) {
        hookname = oHooks[hookid];
        tr = $('<tr>');
        tdName = $('<div>').text(hookname);
        tdUrl = $('<input>').attr('style', 'width:600px').val("" + hostUrl + "/webhooks/" + hookid);
        img = $('<img>').attr('class', 'del').attr('title', 'Delete Module').attr('src', 'images/red_cross_small.png');
        tr.append($('<td>').append(img));
        tr.append($('<td>').attr('style', 'padding-left:10px').append(tdName));
        tr.append($('<td>').attr('style', 'padding-left:10px').append(tdUrl));
        $('#table_webhooks').append(tr);
      }
    } else {
      fShowWebhookUsage(null);
    }
    return typeof cb === "function" ? cb(hookid, hookname) : void 0;
  };
};

fShowWebhookUsage = function(hookid, hookname) {
  var b, div, inp;
  $('#display_hookurl *').remove();
  if (hookid) {
    b = $('<b>').text("This is the Webhook Url you can use for your Events '" + hookname + "' : ");
    $('#display_hookurl').append(b);
    $('#display_hookurl').append($('<br>'));
    inp = $('<input>').attr('type', 'text').attr('style', 'width:600px').val("" + hostUrl + "/webhooks/" + hookid);
    $('#display_hookurl').append(inp);
    $('#display_hookurl').append($('<br>'));
    div = $('<div>');
    div.append($('<br>'));
    div.append($('<div>').html("1. Try it out and push your location to your new webhook via <a target=\"_blank\" href=\"" + hostUrl + "/mobile.html?hookid=" + hookid + "\">this page</a>."));
    div.append($('<br>'));
    div.append($('<div>').html("2. Then you should setup <a target=\"_blank\" href=\"forge?page=forge_rule&eventtype=webhook&hookname=" + hookname + "\">a Rule for the '" + hookname + "' Event!</a>"));
    return $('#display_hookurl').append(div);
  }
};

fOnLoad = function() {
  document.title = 'Create Webhooks!';
  $('#pagetitle').text('Create your own Webhooks!');
  fUpdateWebhookList(fShowWebhookUsage);
  $('#but_submit').click(function() {
    var hookname;
    fClearInfo();
    hookname = $('#inp_hookname').val();
    if (hookname === '') {
      return fDisplayError('Please provide an Event Name for your new Webhook!');
    } else {
      return fIssueRequest({
        body: {
          command: 'create_webhook',
          body: JSON.stringify({
            hookname: hookname
          })
        },
        done: function(data) {
          var oAnsw;
          oAnsw = JSON.parse(data.message);
          fShowWebhookUsage(oAnsw.hookid, oAnsw.hookname);
          return fUpdateWebhookList(function(data) {
            $('#info').text("New Webhook successfully created!");
            return $('#info').attr('class', 'success');
          });
        },
        fail: function(err) {
          if (err.status === 409) {
            return fFailedRequest('Webhook Event Name already existing!')(err);
          } else {
            return fFailedRequest('Unable to create Webhook! ' + err.message)(err);
          }
        }
      });
    }
  });
  return $('#table_webhooks').on('click', 'img', function() {
    var arrUrl, url;
    if (confirm("Do you really want to delete this webhook?")) {
      url = $('input', $(this).closest('tr')).val();
      arrUrl = url.split('/');
      return fIssueRequest({
        body: {
          command: 'delete_webhook',
          body: JSON.stringify({
            hookid: arrUrl[arrUrl.length - 1]
          })
        },
        done: function(data) {
          return fUpdateWebhookList(function(data) {
            $('#info').text('Webhook deleted!');
            return $('#info').attr('class', 'success');
          });
        },
        fail: function(err) {
          return fFailedRequest('Unable to delete Webhook!')(err);
        }
      });
    }
  });
};

window.addEventListener('load', fOnLoad, true);
