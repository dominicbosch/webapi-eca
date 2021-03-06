'use strict';

# We support event trigger and action dispatcher
oParams.m = if oParams.m is 'ad' then 'ad' else 'et'

moduleTypeName = if oParams.m is 'ad' then 'Action Dispatcher' else 'Event Trigger'
moduleType = if oParams.m is 'ad' then 'actiondispatcher' else 'eventtrigger'
arrUsedModules = null

updateTitle = () ->
	title = if oParams.id then 'Edit ' else 'Create '
	title += moduleTypeName
	$('#pagetitle').text title

fOnLoad = () ->
	updateTitle()
	main.registerHoverInfo d3.select('#programcode'), 'modules_code.html'
	main.registerHoverInfo d3.select('#webhookinfo'), 'webhooks_events.html'
	
	# Setup the ACE editor
	editor = ace.edit "editor"
	editor.setTheme "ace/theme/crimson_editor"
	# editor.setTheme "ace/theme/monokai"
	editor.getSession().setMode "ace/mode/javascript"
	editor.setFontSize "14px"
	editor.setShowPrintMargin false
	editor.session.setUseSoftTabs false
	# editor.getSession().on 'change', (el) ->
	# 	console.warn 'TODO We should always search for export functions and provide means for ' +
	# 	'the user to enter a comment for each exported function'

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
				$('.icon.del', this).hide()
				$('input[type=checkbox]', this).hide()
			else
				$('.icon.del', this).show()
				$('input[type=checkbox]', this).show()

	fAddInputRow = (tag) ->
		tr = $ '<tr>'
		img = $('<img>').attr('src', '/images/del.png').attr('title', 'Remove?').attr 'class', 'icon del'
		cb = $('<input>').attr('type', 'checkbox').attr 'title', 'Password shielded input?'
		inp = $('<input>').attr('type', 'text').attr 'class', 'textinput'
		tr.append $('<td>').append img
		tr.append $('<td>').append cb
		tr.append $('<td>').append inp
		tag.append tr
		fChangeInputVisibility()
		tr

	updateUsedModules = (arrMods) ->
		if arrMods
			arrUsedModules = arrMods
		if arrUsedModules
			d3.selectAll('#listModules input').property 'checked', (d) ->
				(arrUsedModules.indexOf(d.name)>-1)

	$('#tableParams').on 'click', '.icon.del', () ->
		main.clearInfo()
		par = $(this).closest 'tr' 
		if not par.is ':last-child'
			par.remove()
		fChangeInputVisibility()

	fChangeInputVisibility()

	main.registerHoverInfoHTML d3.select('#moduleinfo'), 'The more modules you require, the more memory will be used by your worker'
	main.post('/service/modules/get')
		.done (arr) ->
			arrAllowed = arr.filter (o) ->
				o.allowed
			newTr = d3.select('#listModules').selectAll('tr').data(arrAllowed).enter().append('tr')
			newTr.append('td').append('input').attr('type', 'checkbox')
			newTr.append('td').text (d) ->
				d.name
			newTr.append('td').attr('class', 'smallfont').each (d) ->
				main.registerHoverInfoHTML d3.select(this), d.description + '<br> -> version ' + d.version
			updateUsedModules()

	main.post('/service/webhooks/get')
		.done (o) ->
			# arr = o.public.concat(o.private);
			arr = o.private;
			if arr.length is 0
				d3.select('#listWebhooks').text('No Webhooks available!')
			else
				d3.select('#listWebhooks').selectAll('li').data(arr).enter()
					.append('li').append('kbd').text (d) -> d.hookname

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


	# Add submit button logic
	$('#but_submit').click () ->
		if $('#input_id').val() is ''
			main.setInfo false, "Please enter an #{moduleTypeName} name!"
		else
			if !oParams.id or confirm 'Are you sure you want to overwrite the existing module?'
				try
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
						code: editor.getValue()
						globals: listParams
						modules: [] 

					d3.selectAll('#listModules tr').each (d) ->
						if d3.select(this).select('input').property 'checked'
							obj.modules.push d.name

					action = if oParams.id then 'update' else 'create'
					main.post('/service/'+moduleType+'/'+action, obj)
						.done (msg) ->
							main.setInfo true, (moduleTypeName+' stored!'), true
							if oParams.id and oParams.m is 'ad' then alert "You need to update the rules that use this module in 
											order for the changes to be applied to them!"
							
							setTimeout () ->
								window.location.href = 'list_'+oParams.m
							, 500
							# Since we stored a new module we got the id back. we add this id to the URL query 
							# like this we are in a clean edit (update) mode after creating a new event trigger
							wl = window.location;
							oParams.id = msg.id;
							newurl = wl.href+'&id='+msg.id;
							window.history.pushState({path:newurl},'',newurl);
							updateTitle()

						.fail (err) ->
							main.setInfo false, err.responseText, true

				catch e
					alert(e)

	
	# EDIT MODULES

	fAddUserParam = (param, shielded) ->
		tr = fAddInputRow $('#tableParams')
		$('input.textinput', tr).val param
		if shielded
			$('input[type=checkbox]', tr).prop 'checked', true

	if oParams.id
		main.post('/service/'+moduleType+'/get/'+oParams.id)
			.done (oMod) ->
				if oMod
					uid = parseInt d3.select('body').attr('data-uid')
					fAddUserParam param, shielded for param, shielded of oMod.globals
					$('#input_id').val(oMod.name)
					if uid is oMod.UserId 
						fAddUserParam '', false
					else
						$('#input_id').addClass('readonly').attr('readonly', true)
						editor.setReadOnly true
						$('#editor').addClass 'readonly'
						$('#editor_mode').hide()
						$('#but_submit').hide()
						$('#tableParams input').addClass('readonly')
							.attr('readonly', true).attr('disabled', true)
						$('#tableParams img').remove()
					$('#editor_mode').val oMod.lang
					if oMod.lang is 'CoffeeScript'
						editor.getSession().setMode "ace/mode/coffee"
					else 
						editor.getSession().setMode "ace/mode/javascript"

					editor.setValue oMod.code
					editor.gotoLine(1, 1)
					updateUsedModules(oMod.modules)

			.fail (err) ->
				fAddUserParam '', false
				main.setInfo false, 'Could not get module '+oParams.id+': '+ err.responseText
				# Removing the ID from the string and updating the tile because we are in CREATE mode now
				wl = window.location;
				newurl = wl.origin+wl.pathname+'?m='+oParams.m;
				window.history.pushState({path:newurl},'',newurl);
				delete oParams.id
				updateTitle()

	else
		# We add the standard template, params and names
		$('#input_id').val 'Hello World'
		if oParams.m is 'ad'
			editor.insert $('#adSource').text()
			fAddUserParam '', false
		else
			editor.insert $('#etSource').text()
			fAddUserParam '', false
		editor.gotoLine(1, 1)

window.addEventListener 'load', fOnLoad, true
