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
  return $.post('/service/webhooks/getallvisible').done(function(oHooks) {
    var createWebhookRow, hookid, oHook, prl, pul, ref, ref1, results, table;
    $('#table_webhooks *').remove();
    prl = oHooks["private"] ? Object.keys(oHooks["private"]).length : 0;
    pul = oHooks["public"] ? Object.keys(oHooks["public"]).length : 0;
    if (prl + pul > 0) {
      createWebhookRow = function(oHook, isMine) {
        var img, tit;
        img = oHook.isPublic === 'true' ? 'public' : 'private';
        tit = oHook.isPublic === 'true' ? 'Public' : 'Private';
        return table.append($("<tr>\n	<td>" + (isMine ? '<img class="del" title="Delete Webhook" src="/images/red_cross_small.png">' : '') + "</td>\n	<td style=\"white-space: nowrap\"><kbd>" + oHook.hookname + "</kbd></td>\n	<td style=\"white-space: nowrap\">" + (isMine ? '(you)' : oHook.username) + "</td>\n	<td class=\"centered\" title=\"" + tit + "\">\n		<img src=\"/images/" + img + ".png\"></td>\n	<td><input value=\"" + hostUrl + "/service/webhooks/event/" + hookid + "\"></td>\n</tr>"));
      };
      $('#table_webhooks').append($('<h4>').text('Your available Webhooks:'));
      table = $('<table>').appendTo($('#table_webhooks'));
      table.append('<tr><th></th><th>Event Name</th><th>Owner</th><th></th><th>Hook Url</th></tr>');
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
    } else {
      return $('#table_webhooks').append($('<div>').attr('id', 'listhooks').text('There are no webhooks available for you!'));
    }
  }).fail(failedRequest('Unable to get Webhook list'));
};

fShowWebhookUsage = function(hookid, hookname) {
  $('#display_hookurl *').remove();
  if (hookid) {
    main.setInfo(true, 'Webhook created!');
    return $('#display_hookurl').append($("<div>This is the Webhook Url you can use for your Events <kbd>" + hookname + "</kbd> :</div>\n<input class=\"url\" type=\"text\" value=\"" + hostUrl + "/service/webhooks/event/" + hookid + "\"><br>\n<div><b>Now you can <a href=\"/views/events?webhook=" + hookid + "\">emit an Event</a> \non this Webhook!</b></div>"));
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
      }).fail(function(err) {
        return failedRequest(err.responseText)(err);
      });
    }
  });
};

window.addEventListener('load', fOnLoad, true);
