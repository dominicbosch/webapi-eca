'use strict';

editor = null
strPublicKey = ''
arrAllActions = null
arrSelectedActions = []

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
	main.post('/service/session/publickey')
		.done (data) ->
			strPublicKey = data
		.fail (err) ->
			main.setInfo false, 'Error when fetching public key. Unable to send user specific parameters securely!'

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
	$('#input_name').focus()


# EVENT
# -----
	main.post('/service/webhooks/get').done (oHooks) ->
		prl = if oHooks.private then Object.keys(oHooks.private).length else 0
		pul = if oHooks.public then Object.keys(oHooks.public).length else 0
		if prl + pul is 0
			d3.select('#selectWebhook').append('h3').classed('empty', true)
				.html('No <b>Webhooks</b> available! <a href="/views/webhooks">Create one first!</a>')
			setEditorReadOnly true
		else
			d3Sel = d3.select('#selectWebhook').append('h3').text('Active Webhooks:')
				.append('select').attr('class','mediummarged smallfont')
			createWebhookRow = (oHook, owner) ->
				isSel = if oParams.webhook and oParams.webhook is oHook.id then true else null
				d3Sel.append('option').attr('value', oHook.id).attr('selected', isSel)
					.text oHook.hookname+' ('+owner+')'
			createWebhookRow(oHook, 'yours') for i, oHook of oHooks.private
			createWebhookRow(oHook, oHook.username) for i, oHook of oHooks.public


# ACTIONS
# -------
	main.registerHoverInfo d3.select('#actiontitle'), 'modules_params.html'
	main.post('/service/actiondispatcher/get').done (arrAD) ->
		arrAllActions = arrAD
		if(arrAD.length is 0)
			setEditorReadOnly true
		else
			d3.select('#actionEmpty').style('display', 'none');
			d3.select('#actionSection').style('visibility', 'visible')
				.select('tbody').selectAll('tr').data(arrAD, (d) -> d?.id)
			.enter().append('tr').each (oMod) ->
				d3This = d3.select(this)
				main.registerHoverInfoHTML d3This.append('td').text(oMod.name), oMod.comment
				d3This.append('td').text((d) -> d.User.username)
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
		main.clearInfo true
		try
			if $('#input_name').val() is ''
				$('#input_name').focus()
				throw new Error 'Please enter a rule name!'

			if arrSelectedActions.length is 0
				throw new Error 'Please select at least one action or create one!'

			# Store all selected action dispatchers
			arrActions = []
			d3.selectAll('.firstlevel').each (oModule) ->
				oAction = {
					id: oModule.id,
					globals: {},
					functions: {}
				}
				d3module = d3.select(this);
				d3module.selectAll('.glob').each () ->
					d3t = d3.select(this);
					key = d3t.select('.key').text();
					d3val = d3t.select('.val input');
					val = d3val.node().value;
					if val is ''
						d3val.node().focus()
						throw new Error('Please enter a value in all requested fields!')
					if oModule.globals[key] && d3val.attr('changed') == 'yes'
						val = cryptico.encrypt(val, strPublicKey).cipher
					oAction.globals[key] = val

				d3module.selectAll('.actions').each (dFunc) ->
					oAction.functions[dFunc.name] = {}

					d3arg = d3.select(this).selectAll('.arg').each (d) ->
						d3arg = d3.select(this)
						val = d3arg.select('.val input').node().value
						if val is ''
							d3arg.node().focus()
							throw new Error('Please enter a value in all requested fields!')
						oAction.functions[dFunc.name][d] = val;

				arrActions.push(oAction);
			
			try
				arrConditions = JSON.parse editor.getValue()
			catch err
				throw new Error "Parsing of your conditions failed! Needs to be an Array of Strings!"
			
			if arrConditions not instanceof Array
				throw new Error "Conditions Invalid! Needs to be an Array of Objects!"
			for el in arrConditions
				if el not instanceof Object then throw new Error "Conditions Invalid! Needs to be an Array of Objects!"

			obj = 
				name: $('#input_name').val()
				hookid: $('#selectWebhook select').val()
				conditions: arrConditions
				actions: arrActions

			main.post('/service/rules/store', obj)
				.done (msg) -> main.setInfo true, msg
				.fail (err) ->
					if err.status is 409
						if confirm 'Are you sure you want to overwrite the existing rule?'
							obj.overwrite = true
							main.post('service/rules/store', obj)
								.done (msg) -> main.setInfo true, msg
								.fail (err) -> main.setInfo false, err.responseText
					else
						main.setInfo false, err.responseText

		catch err
			main.setInfo false, 'Error in upload: ' + err.message

# Preload editting of a Rule
# -----------
	console.warn('TODO implement edit rules')
	if oParams.id
		main.post 
			command: 'get_rule'
			data: 
				body: JSON.stringify
					id: oParams.id
			done: (data) ->
				oRule = JSON.parse data.message
				if oRule
					$('#input_name').val oRule.id
					
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
# 	main.post 
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
# 					main.post 
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
# 	main.post 
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
# 	main.post 
# 		command: 'get_action_dispatcher_user_params'
# 		data: 
# 			body: JSON.stringify
# 				id: name
# 		done: fAddActionUserParams name

# 	main.post 
# 		command: 'get_action_dispatcher_user_arguments'
# 		data:
# 			body: JSON.stringify
# 				ruleId: $('#input_name').val()
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
			currid: 0
			name: oAd.name
			globals: oAd.globals
			functions: oAd.functions
			arr: []
		arrSelectedActions.push(oSelMod)
	oSelMod.arr.push
		name: name
		modid: oSelMod.id
		funcid: oSelMod.currid++
		args: oSelMod.functions[name]
	updateParameterList()

removeAction = (d) ->
	d3t = d3.select(this);
	# Find module from which to delete the action
	arrSel = arrSelectedActions.filter((o) -> o.id is d.modid)[0]
	id = arrSel.arr.map((o) -> o.funcid).indexOf(d.funcid);
	arrSel.arr.splice id, 1

	if arrSel.arr.length is 0
		# module empty, find and delete it
		id = arrSelectedActions.map((o) -> o.id).indexOf(d.modid);
		arrSelectedActions.splice id, 1

	updateParameterList()

updateParameterList = () ->
	visibility = if arrSelectedActions.length > 0 then 'visible' else 'hidden'
	d3.select('#selectedActions').style('visibility', visibility)
	
	d3Rows = d3.select('#selectedActions')
		.selectAll('.firstlevel').data(arrSelectedActions, (d) -> d.id)

	d3Rows.exit().transition().style('opacity', 0).remove()
	d3New = d3Rows.enter().append('div').attr('class', 'row firstlevel')

	# The main module container
	dModule = d3New.append('div').attr('class', 'col-sm-6')
	dModule.append('h4').text((d) -> d.name)
	dModule.each (d) -> 
		for key, encrypted of d.globals
			nd = d3.select(this).append('div').attr('class', 'row glob')
			nd.append('div').attr('class', 'col-xs-3 key').text(key)
			nd.append('div').attr('class', 'col-xs-9 val')
				.append('input').attr('type', if encrypted then 'password' else 'text')
				.on 'change', () -> d3.select(this).attr('changed', 'yes')

	funcs = d3Rows.selectAll('.actions').data((d) -> d.arr);
	funcs.exit().transition().style('opacity', 0).remove();
	newFuncs = funcs.enter().append('div').attr('class', 'actions col-sm-6')
		.append('div').attr('class', 'row')
	title = newFuncs.append('div').attr('class', 'col-sm-12')
	title.append('img').attr('src', '/images/del.png').attr('class', 'icon del')
		.on 'click', removeAction
	title.append('span').text((d) -> d.name)
	funcParams = newFuncs.selectAll('.notexisting').data((d) -> d.args)
		.enter().append('div').attr('class', 'col-sm-12 arg')
		.append('div').attr('class', 'row')
	funcParams.append('div').attr('class', 'col-xs-3 key').text((d) -> d)
	funcParams.append('div').attr('class', 'col-xs-9 val').append('input').attr('type', 'text')

