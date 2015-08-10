'use strict';

#
# The module that helps creating the rules
#

# FIXME: notify of non existing Action dispatcher in the first place!
editor = null
strPublicKey = ''
if oParams.id
	oParams.id = decodeURIComponent oParams.id
# <-- FIXED
sendRequest = (url, data, cb) ->
	console.log 'sending request to ' + url
	main.clearInfo()
	req = $.post url, data
	req.fail ( err ) ->
		if err.status is 401
			window.location.href = '/views/login'
		else cb? err
# FIXED -->

# Convert a time string ( d h:m ) to a date
fConvertTimeToDate = ( str ) ->
	if not str
		dateConv = null
	else
		dateConv = new Date()
		arrInp = str.split ':'
		# There's only one string entered: hour
		if arrInp.length is 1
			txtHr = str
			dateConv.setMinutes 0
		else
			txtHr = arrInp[ 0 ]
			intMin = parseInt( arrInp[ 1 ] ) || 0
			m = Math.max 0, Math.min intMin, 59
			dateConv.setMinutes m
	
		intHour = parseInt( txtHr ) || 12
		h = Math.max 0, Math.min intHour, 24
		dateConv.setHours h

		dateConv.setSeconds 0
		dateConv.setMilliseconds 0
		if dateConv < new Date()
			dateConv.setDate dateConv.getDate() + 17
	dateConv

# Convert a day hour string ( h:m ) to minutes
fConvertDayHourToMinutes = ( strDayHour ) ->
	# Parse a time string
	fParseTime = ( str, hasDay ) ->
		arrTime = str.split ':'
		# If there's only one entry, this is the amount of minutes
		if hasDay
			def = 0
		else
			def = 10
		if arrTime.length is 1
			time = parseInt( str ) || def
			if hasDay
				time * 60
			else
				time
		else
			h = parseInt( arrTime[ 0 ] ) || 0
			if h > 0
				def = 0
			h * 60 + ( parseInt( arrTime[ 1 ] ) || def )

	if not strDayHour
		mins = 10
	else
		arrInp = strDayHour.split ' '
		# There's only one string entered, either day or hour
		if arrInp.length is 1
			mins = fParseTime strDayHour
		else
			d = parseInt( arrInp[ 0 ] ) || 0
			mins = d * 24 * 60 + fParseTime arrInp[ 1 ], true

	# We have to limit this to 24 days because setTimeout only takes integer values
	# until we implement a scheduler that deals with larger intervals
	mins = Math.min mins, 35700
	Math.max 1, mins


#
# EVENT Related Helper Functions
#

fPrepareEventType = ( eventtype, cb ) ->
	console.warn 'GONE!'
	# # $( '#select_event_type' ).val eventtype
	# $( '#eventParameters > div' ).detach()
	# switch eventtype

	# 	# The user wants a webhook as event producer
	# 	when 'Webhook'
	# 		req = sendRequest '/service/webhooks/getallvisible'
	# 		req.done ( data ) ->
	# 			try
	# 				oHooks = JSON.parse data.message
	# 				selHook = $( 'select', domSelectWebhook )
	# 				selHook.children().remove()
	# 				i = 0
	# 				for hookid, hookname of oHooks
	# 					i++
	# 					selHook.append $( '<option>' ).text hookname

	# 				if i > 0
	# 					$( '#eventParameters' ).append domSelectWebhook
						
	# 				else
	# 					fDisplayError 'No webhooks found! Choose another Event Type or create a Webhook.'

	# 			catch err
	# 				fDisplayError 'Badly formed webhooks!'
				
	# 			cb?()

	# 		req.fail () ->
	# 				console.log 'Unable to get webhooks!'
	# 				cb?()

	# 	when 'Event Trigger'

	# 		sendRequest
	# 			command: 'get_event_triggers'
	# 			done: ( data ) ->
	# 				try
	# 					oEps = JSON.parse data.message
	# 					if JSON.stringify( oEps ) is '{}'
	# 						fDisplayError 'No Event Triggers found! Create one first!'

	# 					else
	# 						$( '#eventParameters' ).append domSelectEventTrigger
	# 						$( '#eventParameters' ).append domInputEventTiming.show()

	# 						$( '#select_eventtrigger option' ).remove()
	# 						for id, events of oEps
	# 							for evt in events
	# 								$( '#select_eventtrigger' ).append $( '<option>' ).text id + ' -> ' + evt

	# 						fFetchEventParams $( 'option:selected', domSelectEventTrigger ).text()

	# 				catch err
	# 					console.error 'ERROR: non-object received for event trigger from server: ' + data.message
	# 				cb?()

	# 			fail: () ->
	# 				console.log 'Error fetching Event Trigger'
	# 				cb?()

# Fetch the required Event Trigger parameters
fFetchEventParams = ( name ) ->
	$( '#event_trigger_params *' ).remove()
	if name
		$( '#eventParameters' ).append domEventTriggerParameters
		arr = name.split ' -> '
		sendRequest
			command: 'get_event_trigger_params'
			data: 
				body: JSON.stringify
					id: arr[ 0 ]
			done: fDisplayEventParams arr[ 0 ]
			fail: console.log 'Error fetching Event Trigger params'
		sendRequest
			command: 'get_event_trigger_comment'
			data: 
				body: JSON.stringify
					id: arr[ 0 ]
			done: ( data ) ->
				$( '.comment', domInputEventTiming ).html data.message.replace /\n/g, '<br>' 
			fail: console.log 'Error fetching Event Trigger comment'
		fFetchEventFunctionArgs arr

fDisplayEventParams = ( id ) ->
	( data ) ->
		if data.message
			oParams = JSON.parse data.message
			table = $ '<table>'
			i = 0
			for name, shielded of oParams
				i++
				tr = $( '<tr>' )
				tr.append $( '<td>' ).css 'width', '20px'
				tr.append $( '<td>' ).attr( 'class', 'key' ).text name
				inp = $( '<input>' )
				if shielded
					inp.attr( 'type', 'password' )
				tr.append $( '<td>' ).text( ' : ' ).append inp
				table.append tr
			if i > 0
				$( '#event_trigger_params' ).html '<b>Required User-specific Data:</b>'
				$( '#event_trigger_params' ).append table
				fFillEventParams id

fFillEventParams = ( moduleId ) ->
	sendRequest
		command: 'get_event_trigger_user_params'
		data:
			body: JSON.stringify
				id: moduleId
		done: ( data ) ->
			oParams = JSON.parse data.message
			for param, oParam of oParams
				par = $( "#event_trigger_params tr" ).filter () ->
					$( 'td.key', this ).text() is param
				$( 'input', par ).val oParam.value
				$( 'input', par ).attr 'unchanged', 'true'
				$( 'input', par ).change () ->
					$( this ).attr 'unchanged', 'false'

# Fetch function arguments required for an event polling function
fFetchEventFunctionArgs = ( arrName ) ->
	sendRequest
		command: 'get_event_trigger_function_arguments'
		data:
			body: JSON.stringify
				id: arrName[ 0 ]
		done: ( data ) ->
			if data.message
				oParams = JSON.parse data.message
				if oParams[ arrName[ 1 ] ]
					if oParams[ arrName[ 1 ] ].length > 0
						$( '#event_trigger_params' ).append $( "<b>" ).text 'Required Rule-specific Data:'
					table = $( '<table>' ).appendTo $( '#event_trigger_params' )
					for functionArgument in oParams[ arrName[ 1 ] ]
						tr = $( '<tr>' ).attr( 'class', 'funcMappings' ).appendTo table
						tr.append $( '<td>' ).css 'width', '20px'
						td = $( '<td>' ).appendTo tr
						td.append $( '<div>' ).attr( 'class', 'funcarg' ).text functionArgument
						tr.append td
						tr.append $( '<td>' ).text ' : '
						td = $( '<td>' ).appendTo tr
						td.append $( '<input>' ).attr 'type', 'text'
						tr.append td
					sendRequest
						command: 'get_event_trigger_user_arguments'
						data:
							body: JSON.stringify
								ruleId: $( '#input_id' ).val()
								moduleId: arrName[ 0 ]
						done: fAddEventUserArgs arrName[ 1 ]

		fail: console.log 'Error fetching event trigger function arguments'

fAddEventUserArgs = ( name ) ->
	( data ) ->
		for key, arrFuncs of data.message
			par = $ "#event_trigger_params"
			for oFunc in JSON.parse arrFuncs
				tr = $( "tr", par ).filter () ->
					$( '.funcarg', this ).text() is "#{ oFunc.argument }"
				$( "input[type=text]", tr ).val oFunc.value
				# $( "input[type=checkbox]", tr ).prop 'checked', oFunc.jsselector


#
# ACTION Related Helper Functions
#

fAddSelectedAction = ( name ) ->
	arrName = name.split ' -> '
	arrEls = $( "#action_dispatcher_params div.modName" ).map( () ->
		$( this ).text()
	).get()
	table = $( '#selected_actions' )
	tr = $( '<tr>' ).appendTo table
	img = $( '<img>' ).attr 'src', 'images/red_cross_small.png'
	tr.append $( '<td>' ).css( 'width', '20px' ).append img
	tr.append $( '<td>' ).attr( 'class', 'title').text name 
	td = $( '<td>' ).attr( 'class', 'funcMappings').appendTo tr
	fFetchActionFunctionArgs td, arrName
	if arrName[ 0 ] not in arrEls
		fFetchActionParams arrName[ 0 ]

	$( "#select_actions option" ).each () ->
		if $( this ).text() is name
			$( this ).remove()
	fDelayed = () ->
		fFillActionFunction arrName[ 0 ]
	setTimeout fDelayed, 300

fFetchActionParams = ( modName ) ->
	sendRequest
		command: 'get_action_dispatcher_params'
		data: 
			body: JSON.stringify
				id: modName
		done: ( data ) ->
			if data.message
				oParams = JSON.parse data.message
				if JSON.stringify( oParams ) isnt '{}'
					domSectionActionParameters.show()
					div = $( '<div>' ).appendTo $( '#action_dispatcher_params' )
					subdiv = $( '<div> ').appendTo div 
					subdiv.append $( '<div>' )
						.attr( 'class', 'modName underlined' ).text modName

					comment = $( '<div>' ).attr( 'class', 'comment indent20' ).appendTo div
					sendRequest
						command: 'get_action_dispatcher_comment'
						data: 
							body: JSON.stringify
								id: modName
						done: ( data ) ->
							comment.html data.message.replace /\n/g, '<br>'
						fail: console.log 'Error fetching Event Trigger comment'

					table = $ '<table>'
					div.append table
					for name, shielded of oParams
						tr = $( '<tr>' )
						tr.append $( '<td>' ).css 'width', '20px'
						tr.append $( '<td>' ).attr( 'class', 'key').text name
						inp = $( '<input>' )
						if shielded
							inp.attr( 'type', 'password' )
						else
							inp.attr( 'type', 'text' )
						tr.append $( '<td>' ).text(' : ').append inp
						table.append tr

		fail: console.log 'Error fetching action dispatcher params'

fFetchActionFunctionArgs = ( tag, arrName ) ->
	sendRequest
		command: 'get_action_dispatcher_function_arguments'
		data: 
			body: JSON.stringify
				id: arrName[ 0 ]
		done: ( data ) ->
			if data.message
				oParams = JSON.parse data.message
				if oParams[ arrName[ 1 ] ]
					table = $( '<table>' ).appendTo tag
					for functionArgument in oParams[ arrName[ 1 ] ]
						tr = $( '<tr>' ).appendTo table
						td = $( '<td>' ).appendTo tr
						td.append $( '<div>' ).attr( 'class', 'funcarg' ).text functionArgument
						tr.append td
						td = $( '<td>' ).appendTo tr
						td.append $( '<input>' ).attr 'type', 'text'
						tr.append td
		fail: console.log 'Error fetching action dispatcher function params'

fFillActionFunction = ( name ) ->
	sendRequest
		command: 'get_action_dispatcher_user_params'
		data: 
			body: JSON.stringify
				id: name
		done: fAddActionUserParams name

	sendRequest
		command: 'get_action_dispatcher_user_arguments'
		data:
			body: JSON.stringify
				ruleId: $( '#input_id' ).val()
				moduleId: name
		done: fAddActionUserArgs name

fAddActionUserParams = ( name ) ->
	( data ) ->
		oParams = JSON.parse data.message
		domMod = $( "#action_dispatcher_params div" ).filter () ->
			$( 'div.modName', this ).text() is name
		for param, oParam of oParams
			par = $( "tr", domMod ).filter () ->
				$( 'td.key', this ).text() is param
			$( 'input', par ).val oParam.value
			$( 'input', par ).attr 'unchanged', 'true'
			$( 'input', par ).change () ->
				$( this ).attr 'unchanged', 'false'

fAddActionUserArgs = ( name ) ->
	( data ) ->
		for key, arrFuncs of data.message
			par = $( "#selected_actions tr" ).filter () ->
				$( 'td.title', this ).text() is "#{ name } -> #{ key }"
			for oFunc in JSON.parse arrFuncs
				tr = $( "tr", par ).filter () ->
					$( '.funcarg', this ).text() is "#{ oFunc.argument }"
				$( "input[type=text]", tr ).val oFunc.value
				# $( "input[type=checkbox]", tr ).prop 'checked', oFunc.jsselector
# <-- FIXED

setEditorReadOnly = (isTrue) ->
	editor.setReadOnly isTrue
	$('.ace_content').css 'background', if isTrue then '#BBB' else '#FFF'

# ONLOAD
# ------
#
# When the document has loaded we really start to execute some logic
fOnLoad = () ->
	# Fetch the public key from the engine
	req = sendRequest '/service/session/publickey', null, (err) ->
		main.setInfo false, 'Error when fetching public key. Unable to send user specific parameters securely!'
	req.done ( data ) ->
		strPublicKey = data

	editor = ace.edit "divConditionsEditor"
	# editor.setTheme "ace/theme/monokai"
	editor.setTheme "ace/theme/crimson_editor"
	editor.setFontSize "16px"
	editor.getSession().setMode "ace/mode/json"
	editor.setShowPrintMargin false

	$( '#editor_theme' ).change ( el ) ->
		editor.setTheme "ace/theme/" + $( this ).val()
		
	$( '#editor_font' ).change ( el ) ->
		editor.setFontSize $( this ).val()
		
	$( '#fill_example' ).click () ->
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
	$( '#input_id' ).focus()


# EVENT
# -----

	req = sendRequest '/service/webhooks/getallvisible'
	req.done ( oHooks ) ->
		prl = if oHooks.private then Object.keys(oHooks.private).length else 0
		pul = if oHooks.public then Object.keys(oHooks.public).length else 0
		if prl + pul is 0
			$('#selectWebhook').html('<h4 class="empty">No <b>Webhooks</b> available! <a href="/views/webhooks">Create one first!</a></h4>')
			setEditorReadOnly true
		else
			domSelect = $('<select>').attr('class','mediummarged')
			createWebhookRow = (oHook, isMine) ->
				img = if oHook.isPublic is 'true' then 'public' else 'private'
				tit = if oHook.isPublic is 'true' then 'Public' else 'Private'
				domSelect.append $ """<option value="#{oHook.hookid}">#{oHook.hookname} (#{if isMine then 'yours' else oHook.username})</option>"""
			$('#selectWebhook').append $('<div>').append($('<h4>').text('Your available Webhooks:').append(domSelect))
			createWebhookRow(oHook, true) for hookid, oHook of oHooks.private
			createWebhookRow(oHook) for hookid, oHook of oHooks.public
# FIXED -->

	req = sendRequest '/service/actiondispatcher/getall'
	req.done ( arrAD ) ->
		if(arrAD.length is 0)
			$('#actionSelection').html('<h4 class="empty">No <b>Action Dispatchers</b> available! <a href="/views/modules_create?m=ad">Create one first!</a></h4>')
			setEditorReadOnly true
		else
			console.log('AWESOME', arrAD)

			# <select id="select_actions"><option></option></select>
			# <br><br>
			# <div id="actionParameters">
			# 	<div>
			# 		<b>Selected Actions:</b>
			# 		<table id="selected_actions"></table>
			# 	</div>
			# 	<br>
			# 	<div>
			# 		<b>Required User-specific Data:</b>
			# 		<div id="action_dispatcher_params"></div>
			# 	</div>
			# </div>


# TODO fill action dispatchers
	# sendRequest
	# 	command: 'get_action_dispatchers'
	# 	done: ( data ) ->
	# 		try
	# 			oAis = JSON.parse data.message
	# 		catch err
	# 			console.error 'ERROR: non-object received from server: ' + data.message
	# 			return
	# 		i = 0
	# 		for module, actions of oAis
	# 			for act in actions
	# 				i++
	# 				arrEls = $( "#action_dispatcher_params div" ).filter () ->
	# 					$( this ).text() is "#{ module } -> #{ act }"
	# 				# It could have been loaded async before through the rules into the action params
	# 				if arrEls.length is 0
	# 					$( '#select_actions' ).append $( '<option>' ).text module + ' -> ' + act
	# 	fail: console.log 'Error fetching Action Dispatchers'


	$( '#select_actions' ).on 'change', () ->
		domSectionSelectedActions.show()
		opt = $ 'option:selected', this
		fAddSelectedAction opt.text()
		
	$( '#selected_actions' ).on 'click', 'img', () ->
		act = $( this ).closest( 'td' ).siblings( '.title' ).text()
		arrName = act.split ' -> '

		nMods = 0
		# Check whether we're the only function left that was selected from this module
		$( "#selected_actions td.title" ).each () ->
			arrNm = $( this ).text().split ' -> '
			nMods++ if arrNm[ 0 ] is arrName[ 0 ]

		if nMods is 1
			$('#action_dispatcher_params > div').each () ->
				if $( this ).children( 'div.modName' ).text() is arrName[ 0 ]
					$( this ).remove()

		# Hide if nothing to show
		if $('#selected_actions td.title').length is 0
			domSectionSelectedActions.hide()

		if $('#action_dispatcher_params > div').length is 0
			domSectionActionParameters.hide()

		opt = $( '<option>' ).text act
		$( '#select_actions' ).append opt
		$( this ).closest( 'tr' ).remove()


# SUBMIT

	$( '#but_submit' ).click () ->
		window.scrollTo 0, 0

		try
			if $( '#input_id' ).val() is ''
				$( '#input_id' ).focus()
				throw new Error 'Please enter a rule name!'

			console.warn 'GONE!'
			# eventtype = $( '#select_event_type' ).val()
			# switch eventtype
			# 	when ''
			# 		$( '#select_event_type' ).focus()
			# 		throw new Error 'Please choose an event type!'

			# 	when 'Webhook'
			# 		eventname = $( '#select_eventhook' ).val()

			# 	when 'Event Trigger'
			# 		eventname = $( '#select_eventtrigger' ).val()
			# 		ep = {}
			# 		$( "#event_trigger_params tr" ).each () ->
			# 			key = $( this ).children( '.key' ).text()
			# 			val = $( 'input', this ).val()
			# 			if val is ''
			# 				$( 'input', this ).focus()
			# 				throw new Error "Please enter a value for '#{ key }' in the event module!"
			# 			shielded = $( 'input', this ).attr( 'type' ) is 'password'
			# 			ep[ key ] =
			# 				shielded: shielded
			# 			if not shielded or $( 'input', this ).attr( 'unchanged' ) isnt 'true'
			# 				encryptedParam = cryptico.encrypt val, strPublicKey
			# 				ep[ key ].value = encryptedParam.cipher 
			# 			else
			# 				ep[ key ].value = val

			# 		evtFuncs = {}
			# 		evtFuncs[ eventname ] = []
			# 		$( '#event_trigger_params tr.funcMappings' ).each () ->
			# 			evtFuncs[ eventname ].push
			# 				argument: $( 'div.funcarg', this ).text()
			# 				value: $( 'input[type=text]', this ).val()

			if $( '#selected_actions tr' ).length is 0
				throw new Error 'Please select at least one action or create one!'

			# Store all selected action dispatchers
			ap = {}
			$( '> div', $( '#action_dispatcher_params' ) ).each () ->
				modName = $( '.modName', this ).text()
				params = {}
				$( 'tr', this ).each () ->
					key = $( '.key', this ).text()
					val = $( 'input', this ).val()
					shielded = $( 'input', this ).attr( 'type' ) is 'password'
					if val is ''
						$( 'input', this ).focus()
						throw new Error "'#{ key }' missing for '#{ modName }'"
					params[ key ] =
						shielded: shielded

					if not shielded or $( 'input', this ).attr( 'unchanged' ) isnt 'true'
						encryptedParam = cryptico.encrypt val, strPublicKey
						params[ key ].value = encryptedParam.cipher 
					else
						params[ key ].value = val
				ap[ modName ] = params
			acts = []
			actFuncs = {}
			$( '#selected_actions td.title' ).each () ->
				actionName = $( this ).text()
				actFuncs[ actionName ] = []
				acts.push actionName
				par = $( this ).parent()
				$( '.funcMappings tr', par ).each () ->
					# No need to encrypt this, right?
					# tmp =
					# 	argument: $( 'div.funcarg', this ).val()
					# 	value: $( 'input[type=text]', this ).val()
					# 	regexp: $( 'input[type=checkbox]', this ).is( ':checked' )
					# tmp = cryptico.encrypt JSON.stringify( tmp ), strPublicKey
					# actFuncs[ actionName ] = tmp.cipher
					actFuncs[ actionName ].push
						argument: $( 'div.funcarg', this ).text()
						value: $( 'input[type=text]', this ).val()
						# jsselector: $( 'input[type=checkbox]', this ).is( ':checked' )
			
			try
				conds = JSON.parse editor.getValue()
			catch err
				throw new Error "Parsing of your conditions failed! Needs to be an Array of Strings!"
			
			if conds not instanceof Array
				throw new Error "Conditions Invalid! Needs to be an Array of Strings!"


			fCheckOverwrite = ( obj ) ->
				( err ) ->
					if err.status is 409
						if confirm 'Are you sure you want to overwrite the existing rule?'
							payl = JSON.parse obj.body
							payl.overwrite = true
							obj.body = JSON.stringify payl
							sendRequest
								command: obj.command
								data: obj
								done: ( data ) ->
									$( '#info' ).text data.message
									$( '#info' ).attr 'class', 'success'
								fail: console.log "#{ obj.id } not stored!"
					else
						console.log( "#{ obj.id } not stored!" ) err

			console.warn 'GONE!'
			# if $( '#select_event_type' ).val() is 'Event Trigger'
			# 	start = fConvertTimeToDate( $( '#input_start' ).val() ).toISOString()
			# 	mins = fConvertDayHourToMinutes $( '#input_interval' ).val()

			obj = 
				body: JSON.stringify
					id: $( '#input_id' ).val()
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
				done: ( data ) ->
					$( '#info' ).text data.message
					$( '#info' ).attr 'class', 'success'
				fail: fCheckOverwrite obj
		catch err
			$( '#info' ).text 'Error in upload: ' + err.message
			$( '#info' ).attr 'class', 'error'
			alert err.message

# Preload editting of a Rule
# -----------
	if oParams.id
		sendRequest
			command: 'get_rule'
			data: 
				body: JSON.stringify
					id: oParams.id
			done: ( data ) ->
				oRule = JSON.parse data.message
				if oRule
					$( '#input_id' ).val oRule.id
					
					# Event
					fPrepareEventType oRule.eventtype, () ->

						switch oRule.eventtype
							when 'Event Trigger'
								$( 'select', domSelectEventTrigger ).val oRule.eventname
								if $( 'select', domSelectEventTrigger ).val() is oRule.eventname
									fFetchEventParams oRule.eventname
									d = new Date oRule.eventstart 
									mins = d.getMinutes()
									if mins.toString().length is 1
											mins = '0' + mins
									$( '#input_start', domInputEventTiming ).val d.getHours() + ':' + mins
									$( '#input_interval', domInputEventTiming ).val oRule.eventinterval

								else
									window.scrollTo 0, 0
									$( '#info' ).text 'Error loading Rule: Your Event Trigger does not exist anymore!'
									$( '#info' ).attr 'class', 'error'

							when 'Webhook'
								$( 'select', domSelectWebhook ).val oRule.eventname

								if $( 'select', domSelectWebhook ).val() is oRule.eventname
									window.scrollTo 0, 0
									$( '#info' ).text 'Your Webhook does not exist anymore!'
									$( '#info' ).attr 'class', 'error'

						# Conditions
						editor.setValue JSON.stringify oRule.conditions, undefined, 2

						# Actions
						domSectionSelectedActions.show()
						for action in oRule.actions
							arrName = action.split ' -> '
							# FIXME we can only add this if the action is still existing! Therefore we should not allow to delete
							# Actions and events but keep a version history and deprecate a module if really need be
								# $( '#info' ).text 'Error loading Rule: Your Event Trigger does not exist anymore!'
							fAddSelectedAction action

			fail: ( err ) ->
				if err.responseText is ''
					msg = 'No Response from Server!'
				else
					try
						msg = JSON.parse( err.responseText ).message
				console.log( 'Error in upload: ' + msg ) err

window.addEventListener 'load', fOnLoad, true
