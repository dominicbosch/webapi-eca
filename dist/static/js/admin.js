'use strict';
var fOnLoad;

fOnLoad = function() {
  var updateUserList;
  updateUserList = function() {
    $('#users *').remove();
    return $.post('/service/user/getall').done(function(arrUsers) {
      var i, len, results, user;
      results = [];
      for (i = 0, len = arrUsers.length; i < len; i++) {
        user = arrUsers[i];
        results.push($('#users').append($("<tr>\n	<td><img class=\"del\" title=\"Delete User\" src=\"/images/red_cross_small.png\"></td>\n	<td><kbd>" + user + "</kbd></td>\n	<td>Change Password:</td>\n	<td><input type=\"password\"></td>\n</tr>")));
      }
      return results;
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
    }).fail(function(err) {
      if (err.status === 401) {
        window.location.href = '/';
      }
      if (err.responseText === '') {
        err.responseText = 'No Response from Server!';
      }
      return main.setInfo(false, err.responseText);
    });
  });
};

window.addEventListener('load', fOnLoad, true);
