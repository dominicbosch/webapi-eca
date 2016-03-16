'use strict';

function fOnLoad() {	
	$('input').keypress(function(e) {
		if(e.which === 13) submit();
	})
	$('#loginButton').click(submit);
}

function submit() {	
	var hp = CryptoJS.SHA3($('#password').val(), {outputLength: 512});
	main.post('/service/session/login', {
			username: $('#username').val(),
			password: hp.toString()
		})
		.done(function() {
			main.setInfo(true, 'Authentication successful!');
			setTimeout(function() { window.location.href = 'profile' }, 500);
		})
		.fail(function(err) {
			main.setInfo(false, 'Authentication not successful!');
		});
}

window.addEventListener('load', fOnLoad, true);
