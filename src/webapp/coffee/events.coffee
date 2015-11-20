'use strict';

editor = null

createWebhookList = () ->
	$('#but_rule').hide()
	$('#but_emit').hide()
	if oParams.webhook
		$('#inp_webh').hide()
		$('#but_webh').hide()

	list = $ '#sel_webh'
	$('*', list).remove()
	list.append $ '<option>[ create new webhook with name: ]</option>'
	main.post('/service/webhooks/get').done (oHooks) ->
		createRow = (hook, isMine) ->
			owner = if isMine then 'yours' else hook.User.username+'\'s'
			elm = $ '<option value="'+hook.hookid+'">'+hook.hookname+' ('+owner+')</option>'
			list.append elm
		
		createRow hook, true for id, hook of oHooks.private
		createRow hook for id, hook of oHooks.public

		# If webhook has been passed in the url, the user wants to emit an event for this
		if oParams.webhook
			selEl = $ '#sel_webh [value="'+oParams.webhook+'"]'
			if selEl.length > 0
				selEl.prop 'selected', true
				updateWebhookSelection()
			else

updateWebhookSelection = () ->
	if $(':selected', this).index() is 0
		$('#tlwebh').removeClass('green').addClass('red').attr('src', '/images/tl_red.png')
		$('#inp_webh').show()
		$('#but_webh').show()
		$('#but_rule').hide()
	else
		$('#tlwebh').removeClass('red').addClass('green').attr('src', '/images/tl_green.png')
		$('#inp_webh').hide()
		$('#but_webh').hide()
		checkRuleExists()

checkRuleExists = () ->
	main.post('/service/rules/get').done (oRules) ->
		exists = false
		for prop, rule in oRules
			if rule.eventtype is 'Webhook' and rule.eventname is name
				exists = true
		if exists
			$('#tlrule').removeClass('red').addClass('green').attr('src', '/images/tl_green.png')
			$('#but_rule').hide()
			$('#but_emit').show()
			main.setInfo true, 'Webhook valid and Rule is setup for your events! Go on and push your event!'
		else
			$('#tlrule').removeClass('green').addClass('red').attr('src', '/images/tl_red.png')
			$('#but_rule').show()
			$('#but_emit').hide()

fOnLoad = () ->
	main.registerHoverInfo d3.select('#eventbody'), 'events_info.html'
	main.registerHoverInfo d3.select('#info_webhook'), 'webhooks_info.html'
	main.registerHoverInfo d3.select('#info_rule'), 'rules_info.html'

	editor = ace.edit 'editor'
	editor.setTheme 'ace/theme/crimson_editor'
	editor.setOptions maxLines: 15
	editor.setFontSize '14px'
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
		if $('#inp_webh').val() is ''
			main.setInfo false, 'Please enter a Webhook name'
		else
			window.location.href = '/views/webhooks?id='+$('#inp_webh').val()
		 
	$('#but_rule').on 'click', () ->
		window.location.href = 'rules_create?webhook='+$('#sel_webh').val()
		# window.open ('rules_create?webhook='+$('#sel_webh').val()), '_blank'

	$('#but_emit').click () ->
		window.scrollTo 0, 0
		try
			obj = JSON.parse editor.getValue()
		catch err
			main.setInfo false, 'You have errors in your JSON object! ' + err

		selectedHook = $('#sel_webh').val()
		if obj
			console.log 'posting to ' + '/service/webhooks/event/' + selectedHook
			main.post('/service/webhooks/event/' + selectedHook, obj)
				.done (data) ->
					main.setInfo true, data.message
				.fail (err) ->
					main.setInfo false, 'Error in upload: ' + err.responseText

	createWebhookList()

window.addEventListener 'load', fOnLoad, true