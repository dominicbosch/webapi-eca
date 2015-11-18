'use strict';

moduleTypeName = if oParams.m is 'ad' then 'Action Dispatcher' else 'Event Trigger'
moduleType = if oParams.m is 'ad' then 'actiondispatcher' else 'eventtrigger'

fErrHandler = (errMsg) ->
	(err) ->
		if err.status is 401
			window.location.href = "/"
		else
			main.setInfo false, errMsg

fOnLoad = () ->
# TODO first check whether oParams.m edit is a valid module before setting the title
	title = if oParams.id then 'Edit ' else 'Create '
	title += moduleTypeName
	$('#pagetitle').text title
	main.registerHoverInfo d3.select('#programcode'), 'modules_code.html'
	
	if oParams.m isnt 'ad'
		main.registerHoverInfo d3.select('#schedule > h2'), 'modules_schedule.html'
		$('#schedule').show()
		# document.getElementById('datePicker').value = new Date().toDateInputValue();
		dateNow = new Date()
		# dateNow.setMinutes dateNow.getMinutes() + 10
		$('#datetimePicker').datetimepicker
			defaultDate: dateNow
			minDate: dateNow
		$('#timePicker').datetimepicker
			format: 'LT'

	# Setup the ACE editor
	editor = ace.edit "editor"
	editor.setTheme "ace/theme/crimson_editor"
	# editor.setTheme "ace/theme/monokai"
	editor.getSession().setMode "ace/mode/coffee"
	editor.setFontSize "14px"
	editor.setShowPrintMargin false
	editor.session.setUseSoftTabs false
	editor.getSession().on 'change', (el) ->
		console.warn 'We should always search for export functions and provide means for ' +
		'the user to enter a comment for each exported function'

	$('#editor_mode').change (el) ->
		if $(this).val() is 'CoffeeScript'
			editor.getSession().setMode "ace/mode/coffee"
		else 
			editor.getSession().setMode "ace/mode/javascript"

	$('#editor_theme').change (el) ->
		editor.setTheme "ace/theme/" + $(this).val()
		
	$('#editor_font').change (el) ->
		editor.setFontSize $(this).val()

	# Add parameter list functionality
	fChangeInputVisibility = () ->
		$('#tableParams tr').each (id) ->
			if $(this).is ':last-child' or $(this).is ':only-child'
				$('img', this).hide()
				$('input[type=checkbox]', this).hide()
			else
				$('img', this).show()
				$('input[type=checkbox]', this).show()

	fAddInputRow = (tag) ->
		tr = $ '<tr>'
		img = $('<div>').attr('title', 'Remove?').attr 'class', 'del'
		cb = $('<input>').attr('type', 'checkbox').attr 'title', 'Password shielded input?'
		inp = $('<input>').attr('type', 'text').attr 'class', 'textinput'
		tr.append $('<td>').append img
		tr.append $('<td>').append cb
		tr.append $('<td>').append inp
		tag.append tr
		fChangeInputVisibility()
		tr

	$('#tableParams').on 'click', 'img', () ->
		main.clearInfo()
		par = $(this).closest 'tr' 
		if not par.is ':last-child'
			par.remove()
		fChangeInputVisibility()


	$('#tableParams').on 'keyup', 'input', (e) ->
		code = e.keyCode or e.which
		if code isnt 9
			par = $(this).closest('tr')
			myNewVal = $(this).val()
			if myNewVal isnt ''
				i = 0
				$('#tableParams input.textinput').each () ->
					i++ if myNewVal is $(this).val() 
				
				$(this).toggleClass 'error', i > 1
				if i > 1
					main.setInfo false, 'User-specific properties can\'t have the same name!'
				else 
					main.clearInfo()
			if par.is ':last-child'
				fAddInputRow par.parent()
			else if myNewVal is '' and not par.is ':only-child'
				par.remove()

	fChangeInputVisibility()

	# Add submit button logic
	$('#but_submit').click () ->
		if $('#input_id').val() is ''
			main.setInfo false, "Please enter an #{moduleTypeName} name!"
		else
			if !oParams.id or confirm 'Are you sure you want to overwrite the existing module?'

				listParams = {}
				$('#tableParams tr').each () ->
					val =  $('input.textinput', this).val()
					shld = $('input[type=checkbox]', this).is ':checked'
					if val isnt ""
						listParams[val] = shld
					true

				obj =
					id: oParams.id
					name: $('#input_id').val()
					lang: $('#editor_mode').val()
					published: $('#is_public').is ':checked'
					code: editor.getValue()
					globals: listParams

				action = if oParams.id then 'update' else 'create'
				$.post('/service/'+moduleType+'/'+action, obj)
					.done (msg) ->
						main.setInfo true, msg
						if oParams.id then alert "You need to update the rules that use this module in 
										order for the changes to be applied to them!"

					.fail (err) ->
						main.setInfo false, err.responseText

	
	# EDIT MODULES

	fAddUserParam = (param, shielded) ->
		tr = fAddInputRow $('#tableParams')
		$('input.textinput', tr).val param
		if shielded
			$('input[type=checkbox]', tr).prop 'checked', true

	if oParams.id
		$.post('/service/'+moduleType+'/get/'+oParams.id)
			.done (oMod) ->
				if oMod
					fAddUserParam param, shielded for param, shielded of oMod.globals
					$('#input_id').val oMod.name
					$('#editor_mode').val oMod.lang
					if oMod.lang is 'CoffeeScript'
						editor.getSession().setMode "ace/mode/coffee"
					else 
						editor.getSession().setMode "ace/mode/javascript"

					if oMod.published 
						$('#is_public').prop 'checked', true
					editor.setValue oMod.code
					editor.moveCursorTo 0, 0
				fAddUserParam '', false

			.fail fErrHandler "Could not get module #{ oParams.id }!"

	else
		# We add the standard template, params and names
		$('#input_id').val 'Hello World'
		if oParams.m is 'ad'
			editor.insert $('#adSource').text()
			fAddUserParam '', false
		else
			editor.insert $('#etSource').text()
			fAddUserParam '', false
		editor.moveCursorTo 0, 0

window.addEventListener 'load', fOnLoad, true
