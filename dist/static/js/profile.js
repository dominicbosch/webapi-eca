'use strict';
var fOnLoad;

fOnLoad = function() {
  var comparePWs, submit;
  comparePWs = function() {
    if ($('#pwnew').val() !== $('#pwnewverify').val()) {
      return main.setInfo(false, "Passwords do not match!");
    } else {
      return main.setInfo(true, "Passwords match!");
    }
  };
  submit = function() {
    var data, np, op;
    if ($('#pwnew').val() === $('#pwnewverify').val()) {
      op = CryptoJS.SHA3($('#pwcurrent').val(), {
        outputLength: 512
      });
      np = CryptoJS.SHA3($('#pwnew').val(), {
        outputLength: 512
      });
      data = {
        oldpassword: op.toString(),
        newpassword: np.toString()
      };
      return $.post('/service/user/passwordchange', data).done(function(data) {
        return main.setInfo(true, data);
      }).fail(function(err) {
        return main.setInfo(false, err.responseText);
      });
    }
  };
  $('input').keypress(function(e) {
    if (e.which === 13) {
      return submit();
    }
  });
  $('#pwnewverify').on('input', comparePWs);
  $('#pwnew').on('input', comparePWs);
  return $('#submit').click(submit);
};

window.addEventListener('load', fOnLoad, true);
