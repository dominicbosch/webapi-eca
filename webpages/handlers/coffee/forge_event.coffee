
fFindKeyStringPair = ( obj ) ->
	for key, val of obj
		if typeof val is 'string' or typeof val is 'number'
			return key: key, val: val
		else if typeof val is 'object'
			oRet = fFindKeyStringPair val
			if oRet
				return oRet
	null

fOnLoad = () ->
	document.title = 'Push Events!'
	$( '#pagetitle' ).text 'Push your own event directly into the engine!'

	editor = ace.edit "editor"
	# editor.setTheme "ace/theme/monokai"
	editor.setTheme "ace/theme/cimson_editor"
	editor.setFontSize "18px"
	editor.getSession().setMode "ace/mode/json"
	editor.setShowPrintMargin false
	$( '#editor' ).css 'height', '400px'
	$( '#editor' ).css 'width', '600px'
	
	$( '#editor_theme' ).change ( el ) ->
		editor.setTheme "ace/theme/" + $( this ).val()
		
	$( '#editor_font' ).change ( el ) ->
		editor.setFontSize $( this ).val()

	$( '#but_submit' ).click () ->
		try
			val = editor.getValue()
			JSON.parse val # try to parse, throw an error if JSON not valid
			window.scrollTo 0, 0
			$.post( '/event', val )
				.done ( data ) ->
					$( '#info' ).text data.message
					$( '#info' ).attr 'class', 'success'
				.fail ( err ) ->
					if err.status is 401
						window.location.href = 'forge?page=forge_event'
					else
						fDelayed = () ->
							if err.responseText is ''
								err.responseText = 'No Response from Server!'
							$( '#info' ).text 'Error in upload: ' + err.responseText
							$( '#info' ).attr 'class', 'error'
						setTimeout fDelayed, 500
					
		catch err
			$( '#info' ).text 'You have errors in your JSON object! ' + err
			$( '#info' ).attr 'class', 'error'
		 
	$( '#but_prepare' ). on 'click', () ->

		try
			obj = JSON.parse editor.getValue() # try to parse, throw an error if JSON not valid
			if obj.eventname and typeof obj.eventname is 'string' and obj.eventname isnt ''
				sel = ''
				if obj.body and typeof obj.body is 'object'
					oSelector = fFindKeyStringPair obj.body
					if oSelector
						sel = "&selkey=#{ oSelector.key }&selval=#{ oSelector.val }"
				url = 'forge?page=forge_rule&eventtype=custom&eventname=' + obj.eventname + sel
				window.open url, '_blank'
			else
				$( '#info' ).text 'Please provide a valid eventname'
				$( '#info' ).attr 'class', 'error'
		catch err
			$( '#info' ).text 'You have errors in your JSON object! ' + err
			$( '#info' ).attr 'class', 'error'
			


window.addEventListener 'load', fOnLoad, true
