'use strict';

editor = null
strPublicKey = ''
arrAllActions = null
arrSelectedActions = []

sendRequest = (url, data, cb) ->
	main.clearInfo()
	req = $.post url, data
	req.fail (err) ->
		if err.status is 401
			window.location.href = '/views/login'
		else cb? err

setEditorReadOnly = (isTrue) ->
	editor.setReadOnly isTrue
	$('.ace_content').css 'background', if isTrue then '#BBB' else '#FFF'
	$('#fill_example').toggle !isTrue

# ONLOAD
# ------
#
# When the document has loaded we really start to execute some logic
fOnLoad = () ->
	# Fetch the public key from the engine
	req = sendRequest '/service/session/publickey', null, (err) ->
		main.setInfo false, 'Error when fetching public key. Unable to send user specific parameters securely!'
	req.done (data) ->
		strPublicKey = data

	editor = ace.edit "divConditionsEditor"
	editor.setTheme "ace/theme/crimson_editor"
	editor.setFontSize "14px"
	editor.getSession().setMode "ace/mode/json"
	editor.setShowPrintMargin false

	$('#editor_theme').change (el) ->
		editor.setTheme "ace/theme/" + $(this).val()
		
	$('#editor_font').change (el) ->
		editor.setFontSize $(this).val()
		
	$('#fill_example').click () ->
		editor.setValue """

			[
				{
					"selector": ".nested_property",
					"type": "string",
					"operator": "<=",
					"compare": "has this value"
				}
			]
			"""
		editor.gotoLine(1, 1);
	$('#input_id').focus()


# EVENT
# -----
	req = sendRequest '/service/webhooks/getall'
	req.done (oHooks) ->
		prl = if oHooks.private then Object.keys(oHooks.private).length else 0
		pul = if oHooks.public then Object.keys(oHooks.public).length else 0
		if prl + pul is 0
			d3.select('#selectWebhook').append('h3').classed('empty', true)
				.html('No <b>Webhooks</b> available! <a href="/views/webhooks">Create one first!</a>')
			setEditorReadOnly true
		else
			d3Sel = d3.select('#selectWebhook').append('h3').text('Your Webhooks:')
				.append('select').attr('class','mediummarged smallfont')
			createWebhookRow = (hookid, oHook, owner) ->
				isSel = if oParams.webhook and oParams.webhook is hookid then true else null
				d3Sel.append('option').attr('value', hookid).attr('selected', isSel)
					.text oHook.hookname+' ('+owner+')'
			createWebhookRow(hookid, oHook, 'yours') for hookid, oHook of oHooks.private
			createWebhookRow(hookid, oHook, oHook.username) for hookid, oHook of oHooks.public

	req = sendRequest '/service/actiondispatcher/get'
	req.done (arrAD) ->
		arrAllActions = arrAD
		if(arrAD.length is 0)
			setEditorReadOnly true
		else
			d3.select('#actionEmpty').style('display', 'none');
			d3.select('#actionSection').style('visibility', 'visible')
			.select('table').selectAll('tr').data(arrAD, (d) -> d?.id)
			.enter().append('tr').each (oMod) ->
				d3This = d3.select(this)
				main.registerHoverInfoHTML d3This.append('td').text(oMod.name), oMod.comment
				list = d3This.append('td').append('table')
				for func of oMod.functions
					trNew = list.append('tr')
					# trNew.append('td').classed('bullet', true).text('•')
					trNew.append('td').append('button').text('add')
						.attr('onclick', 'addAction('+oMod.id+', "'+func+'")')
					trNew.append('td').text(func)


			d3sel = d3.select('#actionSection table');
			d3row = d3sel.selectAll('tr').data(arrAD).enter().append('tr')
			d3row.append('td').text((d) -> d.name)
			d3row.append('td')

	$('#actionSection select').on 'change', () ->
		domSectionSelectedActions.show()
		opt = $ 'option:selected', this
		fAddSelectedAction opt.text()
		
	$('#selected_actions').on 'click', 'img', () ->
		act = $(this).closest('td').siblings('.title').text()
		arrName = act.split ' -> '

		nMods = 0
		# Check whether we're the only function left that was selected from this module
		$("#selected_actions td.title").each () ->
			arrNm = $(this).text().split ' -> '
			nMods++ if arrNm[ 0 ] is arrName[ 0 ]

		if nMods is 1
			$('#action_dispatcher_params > div').each () ->
				if $(this).children('div.modName').text() is arrName[ 0 ]
					$(this).remove()

		# Hide if nothing to show
		if $('#selected_actions td.title').length is 0
			domSectionSelectedActions.hide()

		if $('#action_dispatcher_params > div').length is 0
			domSectionActionParameters.hide()

		opt = $('<option>').text act
		$('#actionSection select').append opt
		$(this).closest('tr').remove()


# SUBMIT

	$('#but_submit').click () ->
		window.scrollTo 0, 0

		try
			if $('#input_id').val() is ''
				$('#input_id').focus()
				throw new Error 'Please enter a rule name!'

			if $('#selected_actions tr').length is 0
				throw new Error 'Please select at least one action or create one!'

			# Store all selected action dispatchers
			ap = {}
			$('> div', $('#action_dispatcher_params')).each () ->
				modName = $('.modName', this).text()
				params = {}
				$('tr', this).each () ->
					key = $('.key', this).text()
					val = $('input', this).val()
					shielded = $('input', this).attr('type') is 'password'
					if val is ''
						$('input', this).focus()
						throw new Error "'#{ key }' missing for '#{ modName }'"
					params[ key ] =
						shielded: shielded

					if not shielded or $('input', this).attr('unchanged') isnt 'true'
						encryptedParam = cryptico.encrypt val, strPublicKey
						params[ key ].value = encryptedParam.cipher 
					else
						params[ key ].value = val
				ap[ modName ] = params
			acts = []
			actFuncs = {}
			$('#selected_actions td.title').each () ->
				actionName = $(this).text()
				actFuncs[ actionName ] = []
				acts.push actionName
				par = $(this).parent()
				$('.funcMappings tr', par).each () ->
					# No need to encrypt this, right?
					# tmp =
					# 	argument: $('div.funcarg', this).val()
					# 	value: $('input[type=text]', this).val()
					# 	regexp: $('input[type=checkbox]', this).is(':checked')
					# tmp = cryptico.encrypt JSON.stringify(tmp), strPublicKey
					# actFuncs[ actionName ] = tmp.cipher
					actFuncs[ actionName ].push
						argument: $('div.funcarg', this).text()
						value: $('input[type=text]', this).val()
						# jsselector: $('input[type=checkbox]', this).is(':checked')
			
			try
				conds = JSON.parse editor.getValue()
			catch err
				throw new Error "Parsing of your conditions failed! Needs to be an Array of Strings!"
			
			if conds not instanceof Array
				throw new Error "Conditions Invalid! Needs to be an Array of Strings!"


			fCheckOverwrite = (obj) ->
				(err) ->
					if err.status is 409
						if confirm 'Are you sure you want to overwrite the existing rule?'
							payl = JSON.parse obj.body
							payl.overwrite = true
							obj.body = JSON.stringify payl
							sendRequest
								command: obj.command
								data: obj
								done: (data) ->
									$('#info').text data.message
									$('#info').attr 'class', 'success'
								fail: console.log "#{ obj.id } not stored!"
					else
						console.log("#{ obj.id } not stored!") err

			console.warn 'GONE!'
			# if $('#select_event_type').val() is 'Event Trigger'
			# 	start = fConvertTimeToDate($('#input_start').val()).toISOString()
			# 	mins = fConvertDayHourToMinutes $('#input_interval').val()

			obj = 
				body: JSON.stringify
					id: $('#input_id').val()
					eventtype: eventtype
					eventname: eventname
					eventparams: ep
					eventstart: start
					eventinterval: mins
					eventfunctions: evtFuncs
					conditions: conds
					actions: acts
					actionparams: ap
					actionfunctions: actFuncs
			sendRequest
				command: 'forge_rule'
				data: obj
				done: (data) ->
					$('#info').text data.message
					$('#info').attr 'class', 'success'
				fail: fCheckOverwrite obj
		catch err
			$('#info').text 'Error in upload: ' + err.message
			$('#info').attr 'class', 'error'
			alert err.message

# Preload editting of a Rule
# -----------
	if oParams.id
		sendRequest
			command: 'get_rule'
			data: 
				body: JSON.stringify
					id: oParams.id
			done: (data) ->
				oRule = JSON.parse data.message
				if oRule
					$('#input_id').val oRule.id
					
					# Event
					fPrepareEventType oRule.eventtype, () ->

						switch oRule.eventtype
							when 'Event Trigger'
								$('select', domSelectEventTrigger).val oRule.eventname
								if $('select', domSelectEventTrigger).val() is oRule.eventname
									fFetchEventParams oRule.eventname
									d = new Date oRule.eventstart 
									mins = d.getMinutes()
									if mins.toString().length is 1
											mins = '0' + mins
									$('#input_start', domInputEventTiming).val d.getHours() + ':' + mins
									$('#input_interval', domInputEventTiming).val oRule.eventinterval

								else
									window.scrollTo 0, 0
									$('#info').text 'Error loading Rule: Your Event Trigger does not exist anymore!'
									$('#info').attr 'class', 'error'

							when 'Webhook'
								$('select', domSelectWebhook).val oRule.eventname

								if $('select', domSelectWebhook).val() is oRule.eventname
									window.scrollTo 0, 0
									$('#info').text 'Your Webhook does not exist anymore!'
									$('#info').attr 'class', 'error'

						# Conditions
						editor.setValue JSON.stringify oRule.conditions, undefined, 2

						# Actions
						domSectionSelectedActions.show()
						for action in oRule.actions
							arrName = action.split ' -> '
							# FIXME we can only add this if the action is still existing! Therefore we should not allow to delete
							# Actions and events but keep a version history and deprecate a module if really need be
								# $('#info').text 'Error loading Rule: Your Event Trigger does not exist anymore!'
							fAddSelectedAction action

			fail: (err) ->
				if err.responseText is ''
					msg = 'No Response from Server!'
				else
					try
						msg = JSON.parse(err.responseText).message
				console.log('Error in upload: ' + msg) err

# #
# # ACTION Related Helper Functions
# #

# fFetchActionParams = (modName) ->
# 	sendRequest
# 		command: 'get_action_dispatcher_params'
# 		data: 
# 			body: JSON.stringify
# 				id: modName
# 		done: (data) ->
# 			if data.message
# 				oParams = JSON.parse data.message
# 				if JSON.stringify(oParams) isnt '{}'
# 					domSectionActionParameters.show()
# 					div = $('<div>').appendTo $('#action_dispatcher_params')
# 					subdiv = $('<div> ').appendTo div 
# 					subdiv.append $('<div>')
# 						.attr('class', 'modName underlined').text modName

# 					comment = $('<div>').attr('class', 'comment indent20').appendTo div
# 					sendRequest
# 						command: 'get_action_dispatcher_comment'
# 						data: 
# 							body: JSON.stringify
# 								id: modName
# 						done: (data) ->
# 							comment.html data.message.replace /\n/g, '<br>'
# 						fail: console.log 'Error fetching Event Trigger comment'

# 					table = $ '<table>'
# 					div.append table
# 					for name, shielded of oParams
# 						tr = $('<tr>')
# 						tr.append $('<td>').css 'width', '20px'
# 						tr.append $('<td>').attr('class', 'key').text name
# 						inp = $('<input>')
# 						if shielded
# 							inp.attr('type', 'password')
# 						else
# 							inp.attr('type', 'text')
# 						tr.append $('<td>').text(' : ').append inp
# 						table.append tr

# 		fail: console.log 'Error fetching action dispatcher params'

# fFetchActionFunctionArgs = (tag, arrName) ->
# 	sendRequest
# 		command: 'get_action_dispatcher_function_arguments'
# 		data: 
# 			body: JSON.stringify
# 				id: arrName[ 0 ]
# 		done: (data) ->
# 			if data.message
# 				oParams = JSON.parse data.message
# 				if oParams[ arrName[ 1 ] ]
# 					table = $('<table>').appendTo tag
# 					for functionArgument in oParams[ arrName[ 1 ] ]
# 						tr = $('<tr>').appendTo table
# 						td = $('<td>').appendTo tr
# 						td.append $('<div>').attr('class', 'funcarg').text functionArgument
# 						tr.append td
# 						td = $('<td>').appendTo tr
# 						td.append $('<input>').attr 'type', 'text'
# 						tr.append td
# 		fail: console.log 'Error fetching action dispatcher function params'

# fFillActionFunction = (name) ->
# 	sendRequest
# 		command: 'get_action_dispatcher_user_params'
# 		data: 
# 			body: JSON.stringify
# 				id: name
# 		done: fAddActionUserParams name

# 	sendRequest
# 		command: 'get_action_dispatcher_user_arguments'
# 		data:
# 			body: JSON.stringify
# 				ruleId: $('#input_id').val()
# 				moduleId: name
# 		done: fAddActionUserArgs name

# fAddActionUserParams = (name) ->
# 	(data) ->
# 		oParams = JSON.parse data.message
# 		domMod = $("#action_dispatcher_params div").filter () ->
# 			$('div.modName', this).text() is name
# 		for param, oParam of oParams
# 			par = $("tr", domMod).filter () ->
# 				$('td.key', this).text() is param
# 			$('input', par).val oParam.value
# 			$('input', par).attr 'unchanged', 'true'
# 			$('input', par).change () ->
# 				$(this).attr 'unchanged', 'false'

# fAddActionUserArgs = (name) ->
# 	(data) ->
# 		for key, arrFuncs of data.message
# 			par = $("#selected_actions tr").filter () ->
# 				$('td.title', this).text() is "#{ name } -> #{ key }"
# 			for oFunc in JSON.parse arrFuncs
# 				tr = $("tr", par).filter () ->
# 					$('.funcarg', this).text() is "#{ oFunc.argument }"
# 				$("input[type=text]", tr).val oFunc.value
# 				# $("input[type=checkbox]", tr).prop 'checked', oFunc.jsselector


window.addEventListener 'load', fOnLoad, true

addAction = (id, name) ->
	oSelMod = arrSelectedActions.filter((o) -> o.id is id)[0]
	if not oSelMod
		oAd = arrAllActions.filter((d) -> d.id is id)[0]
		oSelMod = 
			id: oAd.id
			name: oAd.name
			globals: oAd.globals
			functions: oAd.functions
			arr: []
		arrSelectedActions.push(oSelMod)
	oSelMod.arr.push
		name: name
		functions: oSelMod.functions[name]
	updateParameterList()
	# 	.select('table')

	# arrName = name.split ' -> '
	# arrEls = $("#action_dispatcher_params div.modName").map(() ->
	# 	$(this).text()
	# ).get()
	# table = $('#selected_actions')
	# tr = $('<tr>').appendTo table
	# img = $('<img>').attr 'src', 'images/red_cross_small.png'
	# tr.append $('<td>').css('width', '20px').append img
	# tr.append $('<td>').attr('class', 'title').text name 
	# td = $('<td>').attr('class', 'funcMappings').appendTo tr
	# fFetchActionFunctionArgs td, arrName
	# if arrName[ 0 ] not in arrEls
	# 	fFetchActionParams arrName[ 0 ]

	# $("#actionSection select option").each () ->
	# 	if $(this).text() is name
	# 		$(this).remove()
	# fDelayed = () ->
	# 	fFillActionFunction arrName[ 0 ]
	# setTimeout fDelayed, 300


removeAction = (arrActions, id, name) ->
	updateParameterList()

updateParameterList = () ->
	console.log(arrSelectedActions)
	visibility = if arrSelectedActions.length > 0 then 'visible' else 'hidden'
	d3.select('#selectedActions').style('visibility', visibility)
	
	d3Rows = d3.select('#selectedActions')
		.selectAll('.firstlevel').data(arrSelectedActions, (d) -> d.id)

	d3Rows.exit().remove()
	d3New = d3Rows.enter().append('div').attr('class', 'row firstlevel')

	# The main module container
	dModule = d3New.append('div').attr('class', 'col-sm-6')
	dModule.append('h4').text((d) -> d.name)
	dModule.each (d) -> 
		for k, v of d.globals
			nd = d3.select(this).append('div').attr('class', 'row')
			nd.append('div').attr('class', 'col-xs-3').text(k)
			nd.append('div').attr('class', 'col-xs-9')
				.append('input').attr('type', if v is 'true' then 'password' else 'text')

	funcs = d3Rows.selectAll('.actions').data((d) -> d.arr);
	funcs.exit().remove();
	newFuncs = funcs.enter().append('div').attr('class', 'actions col-sm-6')
		.append('div').attr('class', 'row')
	title = newFuncs.append('div').attr('class', 'col-sm-12')
	title.append('div').attr('class', 'img del')
	title.append('span').text((d) -> d.name)
	funcParams = newFuncs.selectAll('.params').data((d) -> d.functions)
		.enter().append('div').attr('class', 'col-sm-12 params')
		.append('div').attr('class', 'row')
	funcParams.append('div').attr('class', 'col-xs-3 params').text((d) -> d)
	funcParams.append('div').attr('class', 'col-xs-9 params').append('input').attr('type', 'text')


