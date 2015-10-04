'use strict';
var fOnLoad;

fOnLoad = function() {
  var failHandler, updateUserList;
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
    $('#users *').remove();
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
  updateUserList();
  return $('#but_submit').click(function() {
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
};

window.addEventListener('load', fOnLoad, true);
