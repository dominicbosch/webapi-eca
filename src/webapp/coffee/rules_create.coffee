'use strict';

editor = null
strPublicKey = ''
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
	checkLength = (arr) ->
		if arr.length  is 0
			setEditorReadOnly true
		else
			functions.fillList arr
	addPromise '/service/actiondispatcher/get', checkLength, 'Unable to fetch Action Dispatchers'

	# First we want to load all data, then we want to load a rule if the user edits one
	# finally we want to attach all the listeners on the document so it works properly
	Promise.all(arrPromises)
		.then () ->
			if oParams.id is undefined then return null;
			else return loadRule();
		.then functions.init(false, strPublicKey)
		.then attachListeners
		.then () ->
			$('#input_name').get(0).setSelectionRange(0,0);
			$('#input_name').focus()
		.catch (err) -> main.setInfo false, err.message

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
	main.registerHoverInfo d3.select('#conditionstitle'), 'conditions.html'


# Preload editting of a Rule
# -----------
loadRule = () ->
	return new Promise (resolve, reject) ->
		console.warn('TODO implement edit rules')
		main.post('/service/rules/get/'+oParams.id)
			.done (oRule) ->
				# Rule Name
				$('#input_name').val oRule.name

				# Webhook
				d3.select('#selectWebhook option[value="'+oRule.WebhookId+'"]').attr('selected', true)

				# Conditions
				editor.setValue '\n'+(JSON.stringify oRule.conditions, undefined, 2)+'\n'
				editor.gotoLine(1, 1)

				functions.fillExisting(oRule.actions)
							
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
		console.log(oHooks)
		createWebhookRow = (oHook, owner) ->
			isSel = if oParams.webhook and oParams.webhook is oHook.hookurl then true else null
			d3Sel.append('option').attr('value', oHook.id).attr('selected', isSel)
				.text oHook.hookname+' ('+owner+')'
		createWebhookRow(oHook, 'yours') for i, oHook of oHooks.private
		createWebhookRow(oHook, oHook.User.username) for i, oHook of oHooks.public

# LISTENERS
# ---------
attachListeners = () ->
	# SUBMIT
	$('#but_submit').click () ->
		main.clearInfo true
		try
			if $('#input_name').val() is ''
				$('#input_name').focus()
				throw new Error 'Please enter a Rule name!'
			
			hurl = parseInt($('#selectWebhook select').val())
			if hurl is -1				
				throw new Error 'Please select a valid Webhook!'

			# Store all selected action dispatchers
			arrActions = functions.getSelected()
			if arrActions.length is 0
				throw new Error 'Please select at least one action!'

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
				hookurl: hurl
				conditions: arrConditions
				actions: arrActions


			# User is creating a new rule
			if oParams.id is undefined
				cmd = 'create'
			else
				obj.id = oParams.id
				cmd = 'update'
			main.post('/service/rules/'+cmd, obj)
				.done (msg) ->
					main.setInfo true, 'Rule ' + if oParams.id is undefined then 'stored!' else 'updated!'
					wl = window.location;
					oParams.id = msg.id;
					newurl = wl.protocol + "//" + wl.host + wl.pathname + '?id='+msg.id;
					window.history.pushState({path:newurl},'',newurl);
				.fail (err) -> main.setInfo false, err.responseText

		catch err
			main.setInfo false, 'Error in upload: '+err.message


# Most stuff is happening after the document has loaded:
window.addEventListener 'load', fOnLoad, true
