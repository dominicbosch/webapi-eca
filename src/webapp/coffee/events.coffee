'use strict';

editor = null

parseEvent = () ->
	try
		obj = JSON.parse editor.getValue()
	catch err
		main.setInfo false, 'You have errors in your JSON object! ' + err


fFindKeyStringPair = ( obj ) ->
	for key, val of obj
		if typeof val is 'string' or typeof val is 'number'
			return key: key, val: val
		else if typeof val is 'object'
			oRet = fFindKeyStringPair val
			if oRet
				return oRet
	null

checkWebhookExists = () ->
	obj = parseEvent()
	if obj
		$.post '/service/webhooks/getall', ( oHooks ) ->
			$( '#listhooks *' ).remove()
			numHooks = 0
			exist = false
			ul = $ '<ul>'
			for id, hook of oHooks
				numHooks++
				elm = $( '<li>' ).text '"' + hook.hookname + '"'
				ul.append elm
				if hook.hookname is obj.eventname
					elm.attr 'class', 'exists'
					exists = true
					
			if exists
				# main.setInfo true, 'A Webhook exists for this Event!'
				$( '#tlwebh' ).removeClass( 'red' ).addClass 'green'
				$( '#but_webh' ).hide()
				checkRuleExists()
			else
				# main.setInfo false, 'No Webhook exists for this Event Name, please create one!'
				$( '#tlwebh' ).removeClass( 'green' ).addClass 'red'
				$( '#but_webh' ).show()
				$( '#but_rule' ).hide()
				$( '#but_emit' ).hide()

			if numHooks is 0
				$( '#listhooks' ).text 'You do not have any Webhooks! Create one first!'
			else
				$( '#listhooks' ).text 'The Event Names of your available Webhooks are:'
				$( '#listhooks' ).append ul


checkRuleExists = () ->
	$.post '/service/rules/getall', ( oRules ) ->
		exists = false
		for prop, rule in oRules
			if rule.eventtype is 'Webhook' and rule.eventname is name
				exists = true
		if exists
			$( '#tlrule' ).removeClass( 'red' ).addClass 'green'
			$( '#but_rule' ).hide()
			$( '#but_emit' ).show()
			# main.setInfo true, 'The required Webhook exists and a Rule is listening for events with this name! Go on and push your event!'
		else
			$( '#tlrule' ).removeClass( 'green' ).addClass 'red'
			$( '#but_rule' ).show()
			$( '#but_emit' ).hide()
			# main.setInfo false, 'No Rule is listening for this Event Name, please create one!'
				
		console.log oRules 


fOnLoad = () ->
	main.registerHoverInfo $( '#pagetitle' ), 'eventinfo.html'

	editor = ace.edit 'editor'
	editor.setTheme 'ace/theme/crimson_editor'
	editor.setOptions maxLines: 15
	editor.setFontSize '16px'
	editor.getSession().setMode 'ace/mode/json'
	editor.setShowPrintMargin false

	$.get '/data/example_event.txt', ( data ) ->
		editor.setValue data, -1
		checkWebhookExists()

		# Only register change handler after we initially filled the editor
		editor.getSession().on 'change', () ->
			checkWebhookExists()

	$( '#editor_theme' ).change ( el ) ->
		editor.setTheme 'ace/theme/' + $( this ).val()
		
	$( '#editor_font' ).change ( el ) ->
		editor.setFontSize $( this ).val()

	$( '#but_emit' ).click () ->
		window.scrollTo 0, 0
		obj = parseEvent()
		if obj
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
					
	$( '#but_webh' ).click () ->
		obj = parseEvent()
		if obj
			window.location.href = '/views/webhooks?id=' + encodeURIComponent obj.eventname

		 
	$( '#but_rule' ).on 'click', () ->
		obj = parseEvent()
		if obj
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

window.addEventListener 'load', fOnLoad, true
