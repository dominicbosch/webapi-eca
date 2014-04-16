
fOnLoad = () ->
	document.title = 'Forge Event Poller'
	$( '#pagetitle' ).text "{{{user.username}}}, forge your custom event poller!"

	# Setup the ACE editor
	editor = ace.edit "editor"
	editor.setTheme "ace/theme/monokai"
	editor.getSession().setMode "ace/mode/coffee"
	editor.setShowPrintMargin false
	
	$( '#editor_mode' ).change ( el ) ->
		if $( this ).val() is 'CoffeeScript'
			editor.getSession().setMode "ace/mode/coffee"
		else 
			editor.getSession().setMode "ace/mode/javascript"
	
	# Add parameter list functionality
	fChangeInputVisibility = () ->
		$( '#tableParams tr' ).each ( id ) ->
			if $( this ).is ':last-child' or $( this ).is ':only-child'
				$( 'img', this ).hide()
				$( 'input[type=checkbox]', this ).hide()
			else
				$( 'img', this ).show()
				$( 'input[type=checkbox]', this ).show()

	$( '#tableParams' ).on 'click', 'img', () ->
		par = $( this ).closest 'tr' 
		if not par.is ':last-child'
			par.remove()
		fChangeInputVisibility()

	$( '#tableParams' ).on 'keyup', 'input', ( e ) ->
		code = e.keyCode or e.which
		if code isnt 9
			par = $( this ).closest( 'tr' )
			if par.is ':last-child'
				tr = $ '<tr>'
				img = $( '<img>' ).attr( 'title', 'Remove?').attr 'src', 'red_cross_small.png'
				cb = $( '<input>' ).attr( 'type', 'checkbox' ).attr 'title', 'Password shielded input?'
				inp = $( '<input>' ).attr( 'type', 'text' ).attr 'class', 'textinput'
				tr.append( $( '<td>' ).append img )
				tr.append( $( '<td>' ).append cb )
				tr.append( $( '<td>' ).append inp )
				tr.append $( '<td>' )
				par.parent().append tr
				fChangeInputVisibility()
			else if $( this ).val() is '' and not par.is ':only-child'
				par.remove()

	fChangeInputVisibility()

	# Add submit button logic
	$( '#but_submit' ).click () ->
		if $( '#input_id' ).val() is ''
			alert 'Please enter an event poller name!'
		else
			listParams = {}
			$( '#tableParams tr' ).each () ->
				val =  $( 'input.textinput', this ).val()
				shld = $( 'input[type=checkbox]', this ).is ':checked'
				if val isnt ""
					listParams[val] = shld
				true
			obj =
				command: 'forge_event_poller'
				payload:
					id: $( '#input_id' ).val()
					lang: $( '#editor_mode' ).val()
					public: $( '#is_public' ).is ':checked'
					data: editor.getValue()
					params: JSON.stringify listParams
			obj.payload = JSON.stringify obj.payload
			window.scrollTo 0, 0
			$.post( '/usercommand', obj )
				.done ( data ) ->
					$( '#info' ).text data.message
					$( '#info' ).attr 'class', 'success'
				.fail ( err ) ->
					if err.status is 401
						window.location.href = 'forge?page=forge_event_poller'
					else
						fDelayed = () ->
							if err.responseText is ''
								msg = 'No Response from Server!'
							else
								try
									oErr = JSON.parse err.responseText
									msg = oErr.message
							$( '#info' ).text 'Event Poller not stored! ' + msg
							$( '#info' ).attr 'class', 'error'
						setTimeout fDelayed, 500

window.addEventListener 'load', fOnLoad, true
