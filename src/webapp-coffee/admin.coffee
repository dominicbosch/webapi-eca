
fOnLoad = () ->
	document.title = 'Administrate'
	$( '#pagetitle' ).text 'Hi {{{user.username}}}, issue your commands please:'
	
	if not window.CryptoJS
		$( '#info' ).attr 'class', 'error'
		$( '#info' ).text 'CryptoJS library missing! Are you connected to the internet?'

	$( '#but_submit' ).click () ->
		data = 
			command: $( '#inp_command' ).val()
		$.post( 'admincommand', data )
			.done ( data ) ->
				$( '#info' ).text data.message
				$( '#info' ).attr 'class', 'success'
			.fail ( err ) ->
				fDelayed = () ->
					if err.responseText is ''
						err.responseText = 'No Response from Server!'
					$( '#info' ).text 'Error: ' + err.responseText
					$( '#info' ).attr 'class', 'error'
					if err.status is 401
						window.location.href = 'admin'
				setTimeout fDelayed, 500

	$( '#inp_password' ).keyup () ->
		hp = CryptoJS.SHA3 $( this ).val(),
			outputLength: 512
		$( '#display_hash' ).text hp.toString()

window.addEventListener 'load', fOnLoad, true
