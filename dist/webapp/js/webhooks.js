'use strict';
var fOnLoad, fShowWebhookUsage, hostUrl, updateWebhookList;

hostUrl = [location.protocol, '//', location.host].join('');

updateWebhookList = function() {
  return main.post('/service/webhooks/get').done(function(oHooks) {
    var createWebhookRow, hookurl, oHook, prl, pul, ref, results, table;
    $('#table_webhooks *').remove();
    prl = oHooks["private"] ? Object.keys(oHooks["private"]).length : 0;
    pul = oHooks["public"] ? Object.keys(oHooks["public"]).length : 0;
    if (prl + pul > 0) {
      createWebhookRow = function(oHook, isMine) {
        var img, tit;
        img = oHook.isPublic ? 'public' : 'private';
        tit = oHook.isPublic ? 'Public' : 'Private';
        return table.append($("<tr>\n	<td>" + (isMine ? '<img class="icon del" src="/images/del.png" title="Delete Webhook" data-id="' + oHook.id + '">' : '') + "</td>\n	<td style=\"white-space: nowrap\"><kbd>" + oHook.hookname + "</kbd></td>\n	<td style=\"white-space: nowrap\">" + (isMine ? '(you)' : oHook.User.username) + "</td>\n	<td class=\"centered\" title=\"" + tit + "\">\n		<img src=\"/images/" + img + ".png\"></td>\n	<td class=\"hundredwide\"><input class=\"smallfont hundredwide\" value=\"" + hostUrl + "/service/webhooks/event/" + oHook.hookurl + "\" readonly></td>\n</tr>"));
      };
      $('#table_webhooks').append($('<h2>').text('Available Webhooks'));
      table = $('<table>').attr('class', 'hundredywide').appendTo($('#table_webhooks'));
      table.append('<tr><th></th><th>Event Name</th><th>Owner</th><th></th><th>Hook Url</th></tr>');
      ref = oHooks["private"];
      results = [];
      for (hookurl in ref) {
        oHook = ref[hookurl];
        results.push(createWebhookRow(oHook, true));
      }
      return results;
    } else {
      return $('#table_webhooks').append($('<h3>').attr('class', 'empty').text('You don\'t have any active Webhooks!'));
    }
  }).fail(function(err) {
    return main.setInfo(false, 'Unable to get Webhook list: ' + err.responseText);
  });
};

fShowWebhookUsage = function(hookurl, hookname) {
  $('#display_hookurl *').remove();
  if (hookurl) {
    main.setInfo(true, 'Webhook created!');
    return $('#display_hookurl').append($("<div>This is the Webhook Url you can use for your Events <kbd>" + hookname + "</kbd> :</div>\n<input class=\"seventywide smallfont\" type=\"text\" value=\"" + hostUrl + "/service/webhooks/event/" + hookurl + "\" readonly><br>\n<div><b>Now you can <a href=\"/views/events?webhook=" + hookurl + "\">emit an Event</a> \non this Webhook!</b></div>"));
  }
};

fOnLoad = function() {
  main.registerHoverInfo(d3.select('#pagetitle'), 'webhooks_info.html');
  updateWebhookList();
  if (oParams.hookname) {
    $('#inp_hookname').val(decodeURIComponent(oParams.hookname));
  }
  $('#but_submit').click(function() {
    var data, hookname;
    hookname = $('#inp_hookname').val();
    if (hookname === '') {
      return main.setInfo(false, 'Please provide an Event Name for your new Webhook!');
    } else {
      data = {
        hookname: hookname,
        isPublic: $('#inp_public').is(':checked')
      };
      return main.post('/service/webhooks/create', data).done(function(data) {
        updateWebhookList();
        return fShowWebhookUsage(data.hookurl, data.hookname);
      }).fail(function(err) {
        if (err.status === 409) {
          return main.setInfo(false, 'Webhook Event Name already existing!');
        } else {
          return main.setInfo(false, 'Unable to create Webhook! ' + err.responseText);
        }
      });
    }
  });
  return $('#table_webhooks').on('click', '.del', function() {
    if (confirm("Do you really want to delete this webhook?")) {
      return main.post('/service/webhooks/delete/' + $(this).attr('data-id')).done(function() {
        $('#display_hookurl *').remove();
        main.setInfo(true, 'Webhook deleted!');
        return updateWebhookList();
      }).fail(function(err) {
        return main.setInfo(false, err.responseText);
      });
    }
  });
};

window.addEventListener('load', fOnLoad, true);
