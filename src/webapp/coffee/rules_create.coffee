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

	# First we need to fetch a lot of stuff. If all promises fulfill eventually the rule gets loaded
	# TODO Yes we could move this above onLoad and also take the loading as a promise and then do all 
	# the other stuff in order to optimize document loading time. Let's do this another day ;)
	arrPromises = []
	addPromise = (url, thenFunc, failMsg) ->
		p = new Promise (resolve, reject) ->
			main.post(url)
				.done (dat) -> resolve dat
				.fail (err) -> reject new Error failMsg
		arrPromises.push p.then thenFunc

	# Load public key for encryption
	afterwards = (key) ->  strPublicKey = key
	addPromise '/service/session/publickey', afterwards,
		'Error when fetching public key. Unable to send user specific parameters securely!'

	# Load Webhooks
	addPromise '/service/webhooks/get', fillWebhooks, 'Unable to fetch Webhooks'

	# Load Actions
	addPromise '/service/actiondispatcher/get', fillActions, 'Unable to fetch Action Dispatchers'

	# First we want to load all data, then we want to load a rule if the user edits one
	# finally we want to attach all the listeners on the document so it works properly
	Promise.all(arrPromises)
		.then () ->
			if oParams.id is undefined then return null;
			else return loadRule();
		.then attachListeners
		.then () -> $('#input_name').focus()
		.catch (err) -> main.setInfo false, err.toString()

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

	main.registerHoverInfo d3.select('#actiontitle'), 'modules_params.html'



window.addEventListener 'load', fOnLoad, true


loadRule = () ->
# Preload editting of a Rule
# -----------

	return new Promise (resolve, reject) ->
		console.warn('TODO implement edit rules')
		main.post('/service/rules/get/'+oParams.id)
			.done (oRule) ->
				$('#input_name').val oRule.name
				console.log oRule
				editor.setValue JSON.stringify oRule.conditions, undefined, 2

				for oAct in oRule.actions
					for func of oAct.functions
						addAction(oAct.id, func)

				resolve 'Rule loaded'
			.fail reject


# EVENT
# -----
fillWebhooks = (oHooks) ->
	prl = if oHooks.private then Object.keys(oHooks.private).length else 0
	pul = if oHooks.public then Object.keys(oHooks.public).length else 0
	if prl + pul is 0
		d3.select('#selectWebhook').append('h3').classed('empty', true)
			.html('No <b>Webhooks</b> available! <a href="/views/webhooks">Create one first!</a>')
		setEditorReadOnly true
	else
		d3Sel = d3.select('#selectWebhook').append('h3').text('Active Webhooks:')
			.append('select').attr('class','mediummarged smallfont')
		d3Sel.append('option').attr('value', -1).text('No Webhook selected')
		createWebhookRow = (oHook, owner) ->
			isSel = if oParams.webhook and oParams.webhook is oHook.hookid then true else null
			d3Sel.append('option').attr('value', oHook.id).attr('selected', isSel)
				.text oHook.hookname+' ('+owner+')'
		createWebhookRow(oHook, 'yours') for i, oHook of oHooks.private
		createWebhookRow(oHook, oHook.username) for i, oHook of oHooks.public

# ACTIONS
# -------
fillActions = (arrAD) ->
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

addAction = (id, funcName) ->
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
		name: funcName
		modid: oSelMod.id
		funcid: oSelMod.currid++
		args: oSelMod.functions[funcName]
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

# LISTENERS
# ---------
attachListeners = () ->
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
			
			wid = parseInt($('#selectWebhook select').val())
			if wid is -1				
				throw new Error 'Please select a valid Webhook!'

			if arrSelectedActions.length is 0
				throw new Error 'Please select at least one action!'

			# Store all selected action dispatchers
			arrActions = []
			d3.selectAll('.firstlevel').each (oModule) ->
				oAction = {
					id: oModule.id,
					globals: {},
					functions: []
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
					if oModule.globals[key] && d3val.attr('changed') is 'yes'
						val = cryptico.encrypt(val, strPublicKey).cipher
					oAction.globals[key] = val

				d3module.selectAll('.actions').each (dFunc) ->
					func = {
						name: dFunc.name
						args: []
					}
					d3arg = d3.select(this).selectAll('.arg').each (d) ->
						d3arg = d3.select(this)
						val = d3arg.select('.val input').node().value
						if val is ''
							d3arg.node().focus()
							throw new Error('Please enter a value in all requested fields!')
						func.args[d] = val;

					oAction.functions.push func
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
				hookid: wid
				conditions: arrConditions
				actions: arrActions


			# User is creating a new rule
			if oParams.id is undefined
				cmd = 'create'
			else
				cmd = 'update'
			main.post('/service/rules/'+cmd, obj)
				.done (msg) -> main.setInfo true, msg
				.fail (err) -> main.setInfo false, err.responseText

		catch err
			main.setInfo false, 'Error in upload: '+err.message
