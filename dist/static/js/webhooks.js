'use strict';
var fFailedRequest, fOnLoad, fProcessWebhookList, fShowWebhookUsage, fUpdateWebhookList, hostUrl;

hostUrl = [location.protocol, '//', location.host].join('');

fFailedRequest = function(msg) {
  return function(err) {
    if (err.status === 401) {
      return window.location.href = '/';
    } else {
      return main.setInfo(false, msg);
    }
  };
};

fUpdateWebhookList = function(cb) {
  main.clearInfo();
  return $.post('/service/webhooks/getall').done(fProcessWebhookList(cb)).fail(fFailedRequest('Unable to get Webhook list'));
};

fProcessWebhookList = function(cb) {
  return function(oHooks) {
    var hookid, img, isPub, oHook, tdName, tdUrl, tr;
    $('#table_webhooks *').remove();
    $('#table_webhooks').append($('<h3>').text('Your existing Webhooks:'));
    for (hookid in oHooks) {
      oHook = oHooks[hookid];
      tr = $('<tr>');
      tdName = $('<div>').text(oHook.hookname);
      tdUrl = $('<input>').attr('class', 'url').val(hostUrl + "/service/webhooks/event/" + hookid);
      img = $('<img>').attr('class', 'del').attr('title', 'Delete Webhook').attr('src', '/images/red_cross_small.png');
      tr.append($('<td>').append(img));
      isPub = oHook.isPublic === 'true';
      tr.append($('<td>').attr('style', 'padding-left:10px').append(tdName));
      img = $('<img>').attr('src', '/images/' + (isPub ? 'public' : 'private') + '.png');
      tr.append($('<td>').attr('class', 'centered').attr('title', (isPub ? 'Public' : 'Private')).append(img));
      tr.append($('<td>').attr('style', 'padding-left:10px').append(tdUrl));
      $('#table_webhooks').append(tr);
    }
    return typeof cb === "function" ? cb(oHook.hookid, oHook.hookname) : void 0;
  };
};

fShowWebhookUsage = function(hookid, hookname) {
  var b, div, inp;
  $('#display_hookurl *').remove();
  if (hookid) {
    b = $('<b>').text("This is the Webhook Url you can use for your Events '" + hookname + "' : ");
    $('#display_hookurl').append(b);
    $('#display_hookurl').append($('<br>'));
    inp = $('<input>').attr('class', 'url').attr('type', 'text').val(hostUrl + "/webhooks/" + hookid);
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
  main.registerHoverInfo($('#pagetitle'), 'webhookinfo.html');
  fUpdateWebhookList(fShowWebhookUsage);
  $('#inp_hookname').val(oParams.id);
  $('#but_submit').click(function() {
    var data, hookname;
    main.clearInfo();
    hookname = $('#inp_hookname').val();
    if (hookname === '') {
      return main.setInfo(false, 'Please provide an Event Name for your new Webhook!');
    } else {
      data = {
        hookname: hookname,
        isPublic: $('#inp_public').is(':checked')
      };
      return $.post('/service/webhooks/create', data).done(function(data) {
        return fShowWebhookUsage(data.hookid, data.hookname);
      }).fail(function(err) {
        if (err.status === 409) {
          return fFailedRequest('Webhook Event Name already existing!')(err);
        } else {
          return fFailedRequest('Unable to create Webhook! ' + err.message)(err);
        }
      });
    }
  });
  return $('#table_webhooks').on('click', 'img', function() {
    var arrUrl, url;
    if (confirm("Do you really want to delete this webhook?")) {
      url = $('input', $(this).closest('tr')).val();
      arrUrl = url.split('/');
      return $.post('/service/webhooks/delete/' + arrUrl[arrUrl.length - 1]).done(function(data) {
        return fUpdateWebhookList(function(data) {
          $('#info').text('Webhook deleted!');
          return $('#info').attr('class', 'success');
        });
      }).fail(function(err) {
        return fFailedRequest('Unable to delete Webhook!')(err);
      });
    }
  });
};

window.addEventListener('load', fOnLoad, true);
