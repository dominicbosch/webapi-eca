'use strict';
var fOnLoad, fShowWebhookUsage, failedRequest, hostUrl, updateWebhookList;

hostUrl = [location.protocol, '//', location.host].join('');

failedRequest = function(msg) {
  return function(err) {
    if (err.status === 401) {
      return window.location.href = '/';
    } else {
      return main.setInfo(false, msg);
    }
  };
};

updateWebhookList = function() {
  main.clearInfo();
  return $.post('/service/webhooks/getall').done(function(oHooks) {
    var hookid, img, oHook, results, table, tit;
    $('#table_webhooks *').remove();
    if (Object.keys(oHooks).length > 0) {
      $('#table_webhooks').append($('<h4>').text('Your Webhooks:'));
      table = $('<table>').appendTo($('#table_webhooks'));
      results = [];
      for (hookid in oHooks) {
        oHook = oHooks[hookid];
        img = oHook.isPublic === 'true' ? 'public' : 'private';
        tit = oHook.isPublic === 'true' ? 'Public' : 'Private';
        results.push(table.append($("<tr>\n	<td><img class=\"del\" title=\"Delete Webhook\" src=\"/images/red_cross_small.png\"></td>\n	<td style=\"white-space: nowrap\"><kbd>" + oHook.hookname + "</kbd></td>\n	<td class=\"centered\" title=\"" + tit + "\">\n		<img src=\"/images/" + img + ".png\"></td>\n	<td><input value=\"" + hostUrl + "/service/webhooks/event/" + hookid + "\"></td>\n</tr>")));
      }
      return results;
    } else {
      return $('#table_webhooks').append($('<div>').attr('id', 'listhooks').text('You don\'t have any existing webhooks'));
    }
  }).fail(failedRequest('Unable to get Webhook list'));
};

fShowWebhookUsage = function(hookid, hookname) {
  $('#display_hookurl *').remove();
  if (hookid) {
    return $('#display_hookurl').append($("<div>This is the Webhook Url you can use for your Events <kbd>" + hookname + "</kbd> :</div>\n<input class=\"url\" type=\"text\" value=\"" + hostUrl + "/service/webhooks/event/" + hookid + "\"><br>\n<div><b>Now you can <a href=\"/views/events?hookname=" + hookname + "\">emit an Event</a> \non this Webhook!</b></div>"));
  }
};

fOnLoad = function() {
  main.registerHoverInfo($('#pagetitle'), 'webhookinfo.html');
  updateWebhookList();
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
        updateWebhookList();
        return fShowWebhookUsage(data.hookid, data.hookname);
      }).fail(function(err) {
        if (err.status === 409) {
          return failedRequest('Webhook Event Name already existing!')(err);
        } else {
          return failedRequest('Unable to create Webhook! ' + err.message)(err);
        }
      });
    }
  });
  return $('#table_webhooks').on('click', 'img', function() {
    var arrUrl, url;
    if (confirm("Do you really want to delete this webhook?")) {
      url = $('input', $(this).closest('tr')).val();
      arrUrl = url.split('/');
      return $.post('/service/webhooks/delete/' + arrUrl[arrUrl.length - 1]).done(function() {
        $('#display_hookurl *').remove();
        main.setInfo(true, 'Webhook deleted!');
        return updateWebhookList();
      }).fail(failedRequest('Unable to delete Webhook!'));
    }
  });
};

window.addEventListener('load', fOnLoad, true);
