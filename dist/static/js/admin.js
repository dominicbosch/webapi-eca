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
        $('#users').append($("<tr>\n	<td><img class=\"del\" title=\"Delete User\"\n		src=\"/images/red_cross_small.png\" data-userid=\"" + name + "\"></td>\n	<td>" + (oUser.admin === 'true' ? '<img title="Administrator" src="/images/admin.png">' : '') + "</td>\n	<td class=\"name\">" + name + "</td>\n	<td>Change Password:</td>\n	<td><input type=\"password\" data-userid=\"" + name + "\"></td>\n</tr>"));
      }
      $('#users .del').click(function() {
        var data, uid;
        uid = $(this).attr('data-userid');
        if (confirm('Do you really want to delete user "' + uid + '"')) {
          data = {
            username: uid
          };
          return $.post('/service/admin/deleteuser', data).done(function(msg) {
            main.setInfo(true, msg);
            return updateUserList();
          }).fail(failHandler);
        }
      });
      return $('#users input').keypress(function(e) {
        var data, hp, uid;
        if (e.which === 13) {
          uid = $(this).attr('data-userid');
          if (confirm('Do you really want to change user "' + uid + '"\'s password?')) {
            hp = CryptoJS.SHA3($(this).val(), {
              outputLength: 512
            });
            data = {
              username: uid,
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
