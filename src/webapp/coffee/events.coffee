'use strict';

editor = null

createWebhookList = () ->
	$('#but_rule').hide()
	$('#but_emit').hide()
	if oParams.webhook
		$('#inp_webh').hide()
		$('#but_webh').hide()

	$.post '/service/webhooks/getallvisible', (oHooks) ->
		list = $ '#sel_webh'
		$('*', list).remove()
		list.append $ '<option>(new with name):</option>'
		createRow = (id, hook, isMine) ->
			owner = if isMine then 'yours' else hook.username
			elm = $ '<option value="'+id+'">'+hook.hookname+' ('+owner+')</option>'
			list.append elm
		
		createRow id, hook, true for id, hook of oHooks.private
		createRow id, hook for id, hook of oHooks.public

		# If webhook has been passed in the url, the user wants to emit an event for this
		if oParams.webhook
			selEl = $ '#sel_webh [value="'+oParams.webhook+'"]'
			if selEl.length > 0
				selEl.prop 'selected', true
				updateWebhookSelection()
			else



updateWebhookSelection = () ->
	if $(':selected', this).index() is 0
		$('#tlwebh').removeClass('green').addClass 'red'
		$('#inp_webh').show()
		$('#but_webh').show()
		$('#but_rule').hide()
	else
		$('#tlwebh').removeClass('red').addClass 'green'
		$('#inp_webh').hide()
		$('#but_webh').hide()
		checkRuleExists()

checkRuleExists = () ->
	$.post '/service/rules/getall', (oRules) ->
		console.log 'checking for existing rules:', oRules
		exists = false
		for prop, rule in oRules
			if rule.eventtype is 'Webhook' and rule.eventname is name
				exists = true
		if exists
			$('#tlrule').removeClass('red').addClass 'green'
			$('#but_rule').hide()
			$('#but_emit').show()
			main.setInfo true, 'Webhook valid and Rule is setup for your events! Go on and push your event!'
		else
			$('#tlrule').removeClass('green').addClass 'red'
			$('#but_rule').show()
			$('#but_emit').hide()

fOnLoad = () ->
	main.registerHoverInfo $('#pagetitle'), 'eventinfo.html'

	editor = ace.edit 'editor'
	editor.setTheme 'ace/theme/crimson_editor'
	editor.setOptions maxLines: 15
	editor.setFontSize '16px'
	editor.getSession().setMode 'ace/mode/json'
	editor.setShowPrintMargin false

	# This is a Jackson way to get the username into the event body ;-P
	txt = '\n' + JSON.stringify(JSON.parse($('#eventSource').text()), null, '\t') + '\n'
	editor.setValue txt, -1

	$('#editor_theme').change () ->
		editor.setTheme 'ace/theme/' + $(this).val()
		
	$('#editor_font').change () ->
		editor.setFontSize $(this).val()

	$('#sel_webh').on 'change', updateWebhookSelection

	$('#but_webh').click () ->
		window.location.href = '/views/webhooks?id=' + encodeURIComponent $('#inp_webh').val()
		 
	$('#but_rule').on 'click', () ->
		window.open ('rules_create?webhook='+$('#sel_webh').val()), '_blank'

	$('#but_emit').click () ->
		window.scrollTo 0, 0
		try
			obj = JSON.parse editor.getValue()
		catch err
			main.setInfo false, 'You have errors in your JSON object! ' + err

		selectedHook = $('#sel_webh').val()
		if obj
			console.log 'posting to ' + '/service/webhooks/' + selectedHook
			$.post('/service/webhooks/' + selectedHook, obj )
				.done ( data ) ->
					main.setInfo true, data.message
				.fail ( err ) ->
					if err.status is 401
						window.location.href = '/'
					main.setInfo false, 'Error in upload: ' + err.responseText

	createWebhookList()

window.addEventListener 'load', fOnLoad, true