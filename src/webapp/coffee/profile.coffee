'use strict';

fOnLoad = () ->
	comparePWs = () ->
		if $('#pwnew').val() isnt $('#pwnewverify').val()
			main.setInfo false, "Passwords do not match!"
		else
			main.setInfo true, "Passwords match!"

	submit = () ->
		if $('#pwnew').val() is $('#pwnewverify').val()
			op = CryptoJS.SHA3 $('#pwcurrent').val(), outputLength: 512
			np = CryptoJS.SHA3 $('#pwnew').val(), outputLength: 512
			data = 
				oldpassword: op.toString()
				newpassword: np.toString()
			main.post('/service/user/passwordchange', data)
				.done (data) ->
					main.setInfo true, data
				.fail (err) ->
					main.setInfo false, err.responseText
	
	$('input').keypress (e) ->
		if e.which is 13
			submit()
	$('#pwnewverify').on 'input', comparePWs
	$('#pwnew').on 'input', comparePWs
	$('#submit').click submit

window.addEventListener 'load', fOnLoad, true
