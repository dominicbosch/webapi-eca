'use strict';

if oParams.id
	oParams.id = decodeURIComponent oParams.id

fErrHandler = (errMsg) ->
	(err) ->
		if err.status is 401
			window.location.href = "/"
		else
			$('#log_col').text ""

fOnLoad = () ->
# TODO first check whether it is a valid module before setting the title
	title = if oParams.id then 'Edit ' else 'Create '
	title = title + if oParams.m is 'ad' then 'Action Dispatcher' else 'Event Trigger'
	$('#pagetitle').text title
	
	if oParams.m isnt 'ad'
		main.registerHoverInfo $('#schedule > h2'), 'modules_schedule.html'
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
		img = $('<img>').attr('title', 'Remove?').attr 'src', '/images/red_cross_small.png'
		cb = $('<input>').attr('type', 'checkbox').attr 'title', 'Password shielded input?'
		inp = $('<input>').attr('type', 'text').attr 'class', 'textinput'
		tr.append $('<td>').append img
		tr.append $('<td>').append cb
		tr.append $('<td>').append inp
		tag.append tr
		fChangeInputVisibility()
		tr

	$('#tableParams').on 'click', 'img', () ->
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
				
				$(this).toggleClass 'inputerror', i > 1
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
			alert "Please enter an #{ moduleName } name!"
		else
			listParams = {}
			$('#tableParams tr').each () ->
				val =  $('input.textinput', this).val()
				shld = $('input[type=checkbox]', this).is ':checked'
				if val isnt ""
					listParams[val] = shld
				true
			obj =
				body: JSON.stringify
					id: $('#input_id').val()
					lang: $('#editor_mode').val()
					public: $('#is_public').is ':checked'
					data: editor.getValue()
					params: JSON.stringify listParams
			fCheckOverwrite = (obj) ->
				(err) ->
					if err.status is 409
						if confirm 'Are you sure you want to overwrite the existing module?'
							bod = JSON.parse obj.body
							bod.overwrite = true
							obj.body = JSON.stringify bod
							$.post('/usercommand/forge_' + oParams.type, obj)
								.done (data) ->
									$('#info').text data.message
									$('#info').attr 'class', 'success'
									alert "You need to update the rules that use this module in 
													order for the changes to be applied to them!"
								.fail fErrHandler "#{ moduleName } not stored!"
					else
						fErrHandler("#{ moduleName } not stored!") err
			window.scrollTo 0, 0
			$.post('/usercommand/forge_' + oParams.type, obj)
				.done (data) ->
					$('#info').text data.message
					$('#info').attr 'class', 'success'
				.fail fCheckOverwrite obj
	
	# EDIT MODULES

	fAddUserParam = (param, shielded) ->
		tr = fAddInputRow $('#tableParams')
		$('input.textinput', tr).val param
		if shielded
			$('input[type=checkbox]', tr).prop 'checked', true

	if oParams.id
		obj =
			body: JSON.stringify 
				id: oParams.id

		$.post('/usercommand/get_full_' + oParams.type, obj)
			.done (data) ->
				oMod = JSON.parse data.message
				if oMod
					fAddUserParam param, shielded for param, shielded of JSON.parse oMod.params
					$('#input_id').val oMod.id
					$('#editor_mode').val oMod.lang
					if oMod.lang is 'CoffeeScript'
						editor.getSession().setMode "ace/mode/coffee"
					else 
						editor.getSession().setMode "ace/mode/javascript"

					if oMod.public is 'true' 
						$('#is_public').prop 'checked', true
					editor.setValue oMod.data
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
