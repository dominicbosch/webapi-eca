var fOnLoad;

fOnLoad = function() {
  if (!window.CryptoJS) {
    $('#info').text('CryptoJS library missing! Are you connected to the internet?');
  }
  return $('#but_submit').click(function() {
    var data, hp;
    hp = CryptoJS.SHA3($('#password').val(), {
      outputLength: 512
    });
    data = {
      username: $('#username').val(),
      password: hp.toString()
    };
    return $.post('/session/login', data).done(function(data) {
      return window.location.href = document.URL;
    }).fail(function(err) {
      return alert('Authentication not successful!');
    });
  });
};

window.addEventListener('load', fOnLoad, true);
