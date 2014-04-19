# Fetch the search string and transform it into an object for easy access
arrParams = window.location.search.substring(1).split '&'
oParams = {}
for param in arrParams
	arrKV = param.split '='
	oParams[ arrKV[ 0 ] ] = arrKV[ 1 ]

if oParams.id
	oParams.id = decodeURIComponent oParams.id

strPublicKey = ''
fPlaceAndPaintInterval = () ->
	$( '#input_interval' ).html 'Interval:
		<input id="event_interval" type="text" />
		<b>"days hours:minutes"</b>, default = 10 minutes'

fFailedRequest = ( msg ) ->
	( err ) ->
		if err.status is 401
			window.location.href = 'forge?page=forge_rule'
		else
			$( '#info' ).text msg
			$( '#info' ).attr 'class', 'error'

$.post( '/usercommand', command: 'get_public_key' )
	.done ( data ) ->
		strPublicKey = data.message
	.fail ( err ) ->
		if err.status is 401
			window.location.href = 'forge?page=forge_rule'
		else
			$( '#info' ).text 'Error fetching public key, unable to send user specific parameters securely'
			$( '#info' ).attr 'class', 'error'

fOnLoad = () ->
	document.title = 'Rule Forge!'
	$( '#pagetitle' ).text '{{{user.username}}}, forge your ECA Rule!'

	editor = ace.edit "editor_conditions"
	editor.setTheme "ace/theme/monokai"
	editor.getSession().setMode "ace/mode/json"
	editor.setShowPrintMargin false
	# editor.session.setUseSoftTabs false 

	# Fetch Event Poller user-specific parameters
	fFetchEventParams = ( name ) ->
		$( '#event_poller_params *' ).remove()
		if name
			arr = name.split ' -> '
			obj =
				command: 'get_event_poller_params'
				payload: JSON.stringify
					id: arr[ 0 ]
			$.post( '/usercommand', obj )
				.done ( data ) ->
					if data.message
						oParams = JSON.parse data.message
						$( '#event_poller_params' ).html '<br><b>Required Parameters:</b>'
						table = $ '<table>'
						$( '#event_poller_params' ).append table
						fAppendParam = ( name, shielded ) ->
							tr = $( '<tr>' )
							tr.append $( '<td>' ).css 'width', '20px'
							tr.append $( '<td>' ).attr( 'class', 'key' ).text name
							inp = $( '<input>' )
							if shielded
								inp.attr( 'type', 'password' )
							tr.append $( '<td>' ).text( ' : ' ).append inp
							table.append tr
						fAppendParam name, shielded for name, shielded of oParams
				.fail fFailedRequest 'Error fetching event poller params'

	# Init Event Pollers
	$.post( '/usercommand', command: 'get_event_pollers' )
		.done ( data ) ->
			try
				oEps = JSON.parse data.message
			catch err
				console.error 'ERROR: non-object received from server: ' + data.message
				return
			
			fAppendEvents = ( id, events ) ->
				fAppendEvent = ( evt ) ->
					$( '#select_event' ).append $( '<option>' ).text id + ' -> ' + evt
				fAppendEvent evt for evt in events
			fAppendEvents id, events for id, events of oEps
			$( '#input_event' ).val $( '#select_event' ).val()
			fFetchEventParams $( '#select_event option:selected' ).text()
		.fail fFailedRequest 'Error fetching event poller'

	$( '#select_event' ).change () ->
		if $( this ).val() is ''
			$( '#input_interval' ).html ''
		else
			fPlaceAndPaintInterval()
		$( '#input_event' ).val $( this ).val()
		fFetchEventParams $( this ).val()

	$( '#input_event' ).change () ->
		$( '#select_event' ).val ''
		$( '#select_event' ).val $( this ).val()
		fFetchEventParams $( '#select_event' ).val()
		if $( '#select_event' ).val() is ''
			$( '#input_interval' ).html ''
		else
			fPlaceAndPaintInterval()


	# Init Action Invoker
	obj =
		command: 'get_action_invokers'
	$.post( '/usercommand', obj )

		.done ( data ) ->
			try
				oAis = JSON.parse data.message
			catch err
				console.error 'ERROR: non-object received from server: ' + data.message
				return
			fAppendActions = ( module, actions ) ->
				for act in actions
					if $( "#action_params div:contains(#{ module } -> #{ act })" ).length is 0
						$( '#select_actions' ).append $( '<option>' ).text module + ' -> ' + act
			fAppendActions module, actions for module, actions of oAis
		.fail fFailedRequest 'Error fetching event poller'

	fFetchActionParams = ( div, modName ) ->
		obj =
			command: 'get_action_invoker_params'
			payload: JSON.stringify
				id: modName
		$.post( '/usercommand', obj )
			.done ( data ) ->
				if data.message
					oParams = JSON.parse data.message
					table = $ '<table>'
					div.append table
					fAppendActionParam = ( name, shielded ) ->
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
					fAppendActionParam name, sh for name, sh of oParams
			.fail fFailedRequest 'Error fetching action invoker params'

	fFetchActionFunctionParams = ( tag, arrName ) ->
		obj =
			command: 'get_action_invoker_function_arguments'
			payload: JSON.stringify
				id: arrName[ 0 ]
		$.post( '/usercommand', obj )
			.done ( data ) ->
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
							tr.append td
							td = $( '<td>' ).appendTo tr
							td.append $( '<input>' ).attr( 'type', 'checkbox' )
								.attr 'title', 'js-select expression to be resolved on event?'
			.fail fFailedRequest 'Error fetching action invoker function params'

	fAddSelectedAction = ( name ) ->
		arrName = name.split ' -> '
		arrEls = $( "#action_params div.modName" ).map( () ->
			$( this ).text()
		).get()
		table = $( '#selected_actions' )
		tr = $( '<tr>' ).appendTo table
		img = $( '<img>' ).attr 'src', 'red_cross_small.png'
		tr.append $( '<td>' ).css( 'width', '20px' ).append img
		tr.append $( '<td>' ).attr( 'class', 'title').text name 
		td = $( '<td>' ).attr( 'class', 'funcMappings').appendTo tr
		fFetchActionFunctionParams td, arrName
		if arrName[ 0 ] not in arrEls
			div = $( '<div>' ).appendTo $( '#action_params' )
			subdiv = $( '<div> ').appendTo div 
			subdiv.append $( '<div>' )
				.attr( 'class', 'modName underlined' ).text arrName[ 0 ]
			fFetchActionParams div, arrName[ 0 ]
		$( "#select_actions option:contains(#{ name })" ).remove()

	$( '#select_actions' ).on 'change', () ->
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
			$('#action_params > div').each () ->
				if $( this ).children( 'div.modName' ).text() is arrName[ 0 ]
					$( this ).remove()

		opt = $( '<option>' ).text act
		$( '#select_actions' ).append opt
		$( this ).closest( 'tr' ).remove()


	$( '#but_submit' ).click () ->
		window.scrollTo 0, 0
		$( '#info' ).text ''

		try
			if $( '#input_id' ).val() is ''
				$( '#input_id' ).focus()
				throw new Error 'Please enter a rule name!'

			if $( '#input_event' ).val() is ''
				$( '#input_event' ).focus()
				throw new Error 'Please assign an event!'

			ep = {}
			$( "#event_poller_params tr" ).each () ->
				key = $( this ).children( '.key' ).text()
				val = $( 'input', this ).val()
				if val is ''
					$( 'input', this ).focus()
					throw new Error "Please enter a value for '#{ key }' in the event module!"
				shielded = $( 'input', this ).attr( 'type' ) is 'password'
				ep[ key ] =
					shielded: shielded
				if $( 'input', this ).attr( 'unchanged' ) is 'true'
					ep[ key ].value = val
				else
					encryptedParam = cryptico.encrypt val, strPublicKey
					ep[ key ].value = encryptedParam.cipher
			if $( '#selected_actions tr' ).length is 0
				throw new Error 'Please select at least one action or create one!'

			# Store all selected action invokers
			ap = {}
			$( '> div', $( '#action_params' ) ).each () ->
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
					if $( 'input', this ).attr( 'unchanged' ) is 'true'
						params[ key ].value = val
					else
						encryptedParam = cryptico.encrypt val, strPublicKey
						params[ key ].value = encryptedParam.cipher
				ap[ modName ] = params
			acts = []
			actParams = {}
			$( '#selected_actions td.title' ).each () ->
				actionName = $( this ).text()
				actParams[ actionName ] = []
				acts.push actionName
				par = $( this ).parent()
				$( '.funcMappings tr', par ).each () ->
					# No need to encrypt this, right?
					# tmp =
					# 	argument: $( 'div.funcarg', this ).val()
					# 	value: $( 'input[type=text]', this ).val()
					# 	regexp: $( 'input[type=checkbox]', this ).is( ':checked' )
					# tmp = cryptico.encrypt JSON.stringify( tmp ), strPublicKey
					# actParams[ actionName ] = tmp.cipher
					actParams[ actionName ].push
						argument: $( 'div.funcarg', this ).text()
						value: $( 'input[type=text]', this ).val()
						regexp: $( 'input[type=checkbox]', this ).is( ':checked' )
			
			try
				conds = JSON.parse editor.getValue()
			catch err
				throw new Error "Parsing of your conditions failed! Needs to be an Array of Strings!"
			
			if conds not instanceof Array
				throw new Error "Conditions Invalid! Needs to be an Array of Strings!"

			# Parse a time string
			fParseTime = ( str, hasDay ) ->
				arrTime = str.split ':'
				# If there's only one entry, this is the amount of minutes
				if arrTime.length is 1
					time = parseInt( str ) || 10
					if hasDay
						time * 60
					else
						time
				else
					h = parseInt( arrTime[ 0 ] ) || 0
					h * 60 + ( parseInt( arrTime[ 1 ] ) || 10 )


			txtInterval = $( '#event_interval' ).val()
			if not txtInterval
				mins = 1
			else
				arrInp = txtInterval.split ' '
				# There's only one string entered, either day or hour
				if arrInp.length is 1
					mins = fParseTime txtInterval
				else
					d = parseInt( arrInp[ 0 ] ) || 0
					mins = d * 24 * 60 + fParseTime arrInp[ 1 ], true

			# We have to limit this to 24 days because setTimeout only takes integer values
			# until we implement a scheduler that deals with larger intervals
			mins = Math.min mins, 35700
			fCheckOverwrite = ( obj ) ->
				( err ) ->
					if err.status is 409
						if confirm 'Are you sure you want to overwrite the existing rule?'
							payl = JSON.parse obj.payload
							payl.overwrite = true
							obj.payload = JSON.stringify payl
							$.post( '/usercommand', obj )
								.done ( data ) ->
									$( '#info' ).text data.message
									$( '#info' ).attr 'class', 'success'
								.fail fFailedRequest "#{ obj.id } not stored!"
					else
						fFailedRequest( "#{ obj.id } not stored!" ) err
			obj =
				command: 'forge_rule'
				payload: JSON.stringify
					id: $( '#input_id' ).val()
					event: $( '#input_event' ).val()
					event_params: ep
					event_interval: mins
					conditions: conds
					actions: acts
					action_params: ap
					action_functions: actParams
			$.post( '/usercommand', obj )
				.done ( data ) ->
					$( '#info' ).text data.message
					$( '#info' ).attr 'class', 'success'
				.fail fCheckOverwrite obj
		catch err
			console.log err
			$( '#info' ).text 'Error in upload: ' + err.message
			$( '#info' ).attr 'class', 'error'
			alert err.message
			throw err

	if oParams.id
		obj =
			command: 'get_rule'
			payload: JSON.stringify
				id: oParams.id
		$.post( '/usercommand', obj )
			.done ( data ) ->
				oRule = JSON.parse data.message
				if oRule
					$( '#input_id' ).val oRule.id
					
					# Event
					$( '#select_event' ).val oRule.event
					if $( '#select_event' ).val() isnt ''
						fFetchEventParams oRule.event
						fPlaceAndPaintInterval()
						obj =
							command: 'get_event_poller_user_params'
							payload: JSON.stringify
								id: oRule.event.split( ' -> ' )[ 0 ]
						$.post( '/usercommand', obj )
							.done ( data ) ->
								oParams = JSON.parse data.message
								for param, oParam of oParams
									par = $( "#event_poller_params tr:contains(#{ param })" ).parent()
									$( 'input', par ).val oParam.value
									$( 'input', par ).attr 'unchanged', 'true'
								$( 'input', par ).change () ->
									$( this ).attr 'unchanged', 'false'
					$( '#input_event' ).val oRule.event
					$( '#event_interval' ).val oRule.event_interval

					# Conditions
					editor.setValue JSON.stringify oRule.conditions

					# Actions
					oActions = {}
					for action in oRule.actions
						fAddSelectedAction action
						arrName = action.split ' -> '
						if not oActions[ arrName[ 0 ] ]
							oActions[ arrName[ 0 ] ] = []
						oActions[ arrName[ 0 ] ].push arrName[ 1 ]
					fAddActionModuleParams = ( name ) ->
						( data ) ->
							oParams = JSON.parse data.message
							domMod = $( "#action_params div.modName:contains(#{ name })" ).parent()
							for param, oParam of oParams
								par = $( "td.key:contains(#{ param })", domMod ).parent()
								$( 'input', par ).val oParam.value
								$( 'input', par ).attr 'unchanged', 'true'
							$( 'input', par ).change () ->
								$( this ).attr 'unchanged', 'false'

					fAddActionModuleArgs = ( name ) ->
						( data ) ->
							for key, arrFuncs of data.message
								par = $( "#selected_actions td.title:contains(#{ name } -> #{ key })" ).parent()
								for oFunc in JSON.parse arrFuncs
									tr = $( ".funcarg:contains(#{ oFunc.argument })", par ).parent().parent()
									$( "input[type=text]", tr ).val oFunc.value
									$( "input[type=checkbox]", tr ).prop 'checked', oFunc.regexp

					for mod, arrMod of oActions
						obj =
							command: 'get_action_invoker_user_params'
							payload: JSON.stringify
								id: mod
						$.post( '/usercommand', obj )
							.done fAddActionModuleParams mod
						
						obj.command = 'get_action_invoker_user_arguments'
						obj.payload = JSON.stringify
							ruleId: oRule.id
							moduleId: mod
						$.post( '/usercommand', obj )
							.done fAddActionModuleArgs mod

			.fail ( err ) ->
				if err.responseText is ''
					msg = 'No Response from Server!'
				else
					try
						msg = JSON.parse( err.responseText ).message
				fFailedRequest( 'Error in upload: ' + msg ) err

window.addEventListener 'load', fOnLoad, true
