'use strict';
var fOnLoad, fSubmit;

fOnLoad = function() {
  $('input').keypress(function(e) {
    if (e.which === 13) {
      return fSubmit();
    }
  });
  return $('#loginButton').click(fSubmit);
};

fSubmit = function() {
  var data, hp;
  hp = CryptoJS.SHA3($('#password').val(), {
    outputLength: 512
  });
  data = {
    username: $('#username').val(),
    password: hp.toString()
  };
  return main.post('/service/session/login', data).done(function(data) {
    var redirect;
    main.setInfo(true, 'Authentication successful!');
    redirect = function() {
      return window.location.href = '/';
    };
    return setTimeout(redirect, 500);
  }).fail(function(err) {
    return main.setInfo(false, 'Authentication not successful!');
  });
};

window.addEventListener('load', fOnLoad, true);
