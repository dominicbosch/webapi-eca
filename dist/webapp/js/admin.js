'use strict';
var fOnLoad;

fOnLoad = function() {
  var failHandler, requestModuleList, updateModuleList, updateUserList;
  failHandler = function(err) {
    if (err.status === 401) {
      window.location.href = '/';
    }
    if (err.responseText === '') {
      err.responseText = 'No Response from Server!';
    }
    return main.setInfo(false, err.responseText);
  };
  updateUserList = function() {
    d3.selectAll('#users *').remove();
    return $.post('/service/user/getall').done(function(arrUsers) {
      var name, oUser;
      for (name in arrUsers) {
        oUser = arrUsers[name];
        $('#users').append($("<tr>\n	<td><img class=\"del\" title=\"Delete User\"\n		src=\"/images/red_cross_small.png\" data-userid=\"" + oUser.id + "\" data-username=\"" + oUser.username + "\"></td>\n	<td>" + (oUser.isAdmin ? '<img title="Administrator" src="/images/admin.png">' : '') + "</td>\n	<td class=\"highlight\">" + oUser.username + "</td>\n	<td>Change Password:</td>\n	<td><input type=\"password\" data-userid=\"" + oUser.id + "\" data-username=\"" + oUser.username + "\"></td>\n</tr>"));
      }
      $('#users .del').click(function() {
        var data;
        if (confirm('Do you really want to delete user "' + $(this).attr('data-username') + '"')) {
          data = {
            userid: $(this).attr('data-userid'),
            username: $(this).attr('data-username')
          };
          return $.post('/service/admin/deleteuser', data).done(function(msg) {
            main.setInfo(true, msg);
            return updateUserList();
          }).fail(failHandler);
        }
      });
      return $('#users input').keypress(function(e) {
        var data, hp;
        if (e.which === 13) {
          if (confirm('Do you really want to change user "' + $(this).attr('data-username') + '"\'s password?')) {
            hp = CryptoJS.SHA3($(this).val(), {
              outputLength: 512
            });
            data = {
              userid: $(this).attr('data-userid'),
              newpassword: hp.toString()
            };
            return $.post('/service/user/forcepasswordchange', data).done(function(msg) {
              return main.setInfo(true, msg);
            }).fail(failHandler);
          }
        }
      });
    });
  };
  requestModuleList = function() {
    return $.post('/service/modules/get').done(updateModuleList);
  };
  updateModuleList = function(arrModules) {
    var dMods, name, oModule, tr;
    dMods = d3.select('#modules');
    dMods.selectAll('*').remove();
    for (name in arrModules) {
      oModule = arrModules[name];
      tr = dMods.append('tr');
      tr.append('td').append('input').attr('type', 'checkbox').attr('title', 'Allowed').attr('data-module', oModule.name).property('checked', oModule.allowed);
      tr.append('td').classed('highlight', true).text(oModule.name);
      tr.append('td').classed('highlight', true).text('(' + oModule.version + ')');
      tr.append('td').text(oModule.description);
    }
    return $('#modules input').click(function() {
      var dThis, strAllowed;
      dThis = d3.select(this);
      strAllowed = dThis.property('checked') ? 'allow' : 'forbid';
      if (confirm('Are you sure you want to ' + strAllowed + ' the module "' + dThis.attr('data-module') + '"?')) {
        return $.post('/service/modules/' + strAllowed, {
          module: dThis.attr('data-module')
        }).done(function(msg) {
          main.setInfo(true, msg);
          return requestModuleList();
        }).fail(function(err) {
          dThis.property('checked', !dThis.property('checked'));
          return failHandler(err);
        });
      }
    });
  };
  updateUserList();
  requestModuleList();
  $('#but_submit').click(function() {
    var data, hp;
    hp = CryptoJS.SHA3($('#pw').val(), {
      outputLength: 512
    });
    data = {
      username: $('#user').val(),
      password: hp.toString(),
      isAdmin: $('#admin').is(':checked')
    };
    return $.post('/service/admin/createuser', data).done(function(msg) {
      main.setInfo(true, msg);
      return updateUserList();
    }).fail(failHandler);
  });
  return $('#refresh').click(function() {
    d3.select('#refresh').classed('spin', true);
    return $.post('/service/modules/reload').done(function(arrModules) {
      updateModuleList(arrModules);
      main.setInfo(true, 'Allowed Modules list updated!');
      return d3.select('#refresh').classed('spin', false);
    }).fail(function(err) {
      d3.select('#refresh').classed('spin', false);
      return failHandler(err);
    });
  });
};

window.addEventListener('load', fOnLoad, true);
