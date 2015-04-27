
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
	$( '#pagetitle' ).text 'Trigger your custom event in the engine!'

	editor = ace.edit "editor"
	# editor.setTheme "ace/theme/monokai"
	editor.setTheme "ace/theme/crimson_editor"
	editor.setOptions maxLines: 15
	editor.setFontSize "18px"
	editor.getSession().setMode "ace/mode/json"
	editor.setShowPrintMargin false

	editor.getSession().on 'change', () ->
		main.clearInfo()


	$.get '/data/example_event.txt', ( data ) ->
		editor.setValue data, -1

	$( '#editor_theme' ).change ( el ) ->
		editor.setTheme "ace/theme/" + $( this ).val()
		
	$( '#editor_font' ).change ( el ) ->
		editor.setFontSize $( this ).val()

	$( '#but_submit' ).click () ->
		try
			obj = JSON.parse editor.getValue() # try to parse, throw an error if JSON not valid
			window.scrollTo 0, 0
			$.post( '/event', obj )
				.done ( data ) ->
					main.setInfo true, data.message
				.fail ( err ) ->
					if err.status is 401
						window.location.href = '/views/events'
					else
						fDelayed = () ->
							if err.responseText is ''
								err.responseText = 'No Response from Server!'
							main.setInfo false, 'Error in upload: ' + err.responseText
						setTimeout fDelayed, 500
					
		catch err
			main.setInfo false, 'You have errors in your JSON object! ' + err
		 
	$( '#but_prepare' ). on 'click', () ->

		try
			obj = JSON.parse editor.getValue() # try to parse, throw an error if JSON not valid
			if obj.eventname and typeof obj.eventname is 'string' and obj.eventname isnt ''
				sel = ''
				if obj.body and typeof obj.body is 'object'
					oSelector = fFindKeyStringPair obj.body
					if oSelector
						sel = "&selkey=#{ oSelector.key }&selval=#{ oSelector.val }"
				url = 'rules_create?eventtype=custom&eventname=' + obj.eventname + sel
				window.open url, '_blank'
			else
				main.setInfo false, 'Please provide a valid eventname'
		catch err
			main.setInfo false, 'You have errors in your JSON object! ' + err

window.addEventListener 'load', fOnLoad, true
