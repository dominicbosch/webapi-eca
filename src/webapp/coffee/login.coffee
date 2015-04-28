
fOnLoad = () ->
	if not window.CryptoJS
		$( '#info' ).text 'CryptoJS library missing! Are you connected to the internet?'

	$( '#but_submit' ).click () ->
		hp = CryptoJS.SHA3 $( '#password' ).val(),
			outputLength: 512
		data =
			username: $( '#username' ).val()
			password: hp.toString()
		$.post( '/session/login', data )
			.done ( data ) ->
				window.location.href = document.URL
			.fail ( err ) ->
				alert 'Authentication not successful!'

window.addEventListener 'load', fOnLoad, true

