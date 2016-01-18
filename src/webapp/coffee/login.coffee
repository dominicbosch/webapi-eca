'use strict';


fOnLoad = () ->
	$('input').keypress (e) ->
    	if(e.which is 13)
    		fSubmit()

	$('#loginButton').click fSubmit

fSubmit = () ->
	hp = CryptoJS.SHA3 $('#password').val(),
		outputLength: 512
	data =
		username: $('#username').val()
		password: hp.toString()
	main.post('/service/session/login', data)
		.done (data) ->
			main.setInfo true, 'Authentication successful!'
			redirect = () ->
				window.location.href = '/'
			setTimeout redirect, 500
		.fail (err) ->
			main.setInfo false, 'Authentication not successful!'

window.addEventListener 'load', fOnLoad, true

