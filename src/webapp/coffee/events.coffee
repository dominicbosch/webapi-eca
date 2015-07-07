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

updateWebhookList = () ->
	$.post '/service/webhooks/getallvisible', ( oHooks ) ->
		$( '#listhooks *' ).remove()
		numHooks = 0
		exists = false
		table = $ '<table>'
		table.append $ "<tr><th>Event Name</th><th>Webhook Owner</th></tr>"
		createRow = (hook, isMine) ->
			numHooks++
			elm = $ "<tr><td><kbd>#{ hook.hookname }</kbd></td><td>#{ if isMine then '(you)' else hook.username}</td></tr>"
			table.append elm
			if hook.hookname is $('#inp_webh').val()
				elm.attr 'class', 'exists'
				exists = true
		createRow hook, true for id, hook of oHooks.private
		createRow hook for id, hook of oHooks.public
				
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
			# $( '#listhooks' ).text 'You do not have any Webhooks! Create one first!'
			$('#sel_webh').hide()
		else
			$('#sel_webh').show()

			# $( '#listhooks' ).text 'Your available Webhooks are:'
			# $( '#listhooks' ).append table

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

fOnLoad = () ->
	main.registerHoverInfo $( '#pagetitle' ), 'eventinfo.html'

	editor = ace.edit 'editor'
	editor.setTheme 'ace/theme/crimson_editor'
	editor.setOptions maxLines: 15
	editor.setFontSize '16px'
	editor.getSession().setMode 'ace/mode/json'
	editor.setShowPrintMargin false

	# $.get '/data/example_event.txt', ( data ) ->
		# If hookname has been passed in the url, the user wants to emit an event for this

	if oParams.hookname
		$('#inp_webh').val oParams.hookname

	txt = '\n' + JSON.stringify(JSON.parse($('#eventSource').text()), null, '\t') + '\n'
	editor.setValue txt, -1

	$( '#editor_theme' ).change ( el ) ->
		editor.setTheme 'ace/theme/' + $( this ).val()
		
	$( '#editor_font' ).change ( el ) ->
		editor.setFontSize $( this ).val()

	$( '#inp_webh' ).on 'input', updateWebhookList

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
		window.location.href = '/views/webhooks?id=' + encodeURIComponent $('#inp_webh').val()
		 
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
