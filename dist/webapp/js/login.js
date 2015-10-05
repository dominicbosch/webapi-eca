'use strict';
var fOnLoad, fSubmit;

fOnLoad = function() {
  $('#password').keypress(function(e) {
    if (e.which === 13) {
      return fSubmit();
    }
  });
  return $('#loginButton').click(fSubmit);
};

fSubmit = function() {
  var data, hp;
  main.clearInfo();
  hp = CryptoJS.SHA3($('#password').val(), {
    outputLength: 512
  });
  data = {
    username: $('#username').val(),
    password: hp.toString()
  };
  return $.post('/service/session/login', data).done(function(data) {
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
