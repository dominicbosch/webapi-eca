'use strict';
var fOnLoad;

fOnLoad = function() {
  document.title = 'Administrate';
  $('#pagetitle').text('Hi {{{user.username}}}, issue your commands please:');
  if (!window.CryptoJS) {
    $('#info').attr('class', 'error');
    $('#info').text('CryptoJS library missing! Are you connected to the internet?');
  }
  $('#but_submit').click(function() {
    var data;
    data = {
      command: $('#inp_command').val()
    };
    return $.post('admincommand', data).done(function(data) {
      $('#info').text(data.message);
      return $('#info').attr('class', 'success');
    }).fail(function(err) {
      var fDelayed;
      fDelayed = function() {
        if (err.responseText === '') {
          err.responseText = 'No Response from Server!';
        }
        $('#info').text('Error: ' + err.responseText);
        $('#info').attr('class', 'error');
        if (err.status === 401) {
          return window.location.href = 'admin';
        }
      };
      return setTimeout(fDelayed, 500);
    });
  });
  return $('#inp_password').keyup(function() {
    var hp;
    hp = CryptoJS.SHA3($(this).val(), {
      outputLength: 512
    });
    return $('#display_hash').text(hp.toString());
  });
};

window.addEventListener('load', fOnLoad, true);
