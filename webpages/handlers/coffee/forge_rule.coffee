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
	$( '#event_start' ).html 'Start Time:
		<input id="input_start" type="text" />
		<b>"hh:mm"</b>, default = 12:00'
	$( '#event_interval' ).html 'Interval:
		<input id="input_interval" type="text" />
		<b>"days hours:minutes"</b>, default = 10 minutes'

fDisplayError = ( msg ) ->
	window.scrollTo 0, 0
	$( '#info' ).text "Error: #{ msg }"
	$( '#info' ).attr 'class', 'error'

fFailedRequest = ( msg ) ->
	( err ) ->
		if err.status is 401
			window.location.href = 'forge?page=forge_rule'
		else
			fDisplayError msg

fIssueRequest = ( args ) ->
	$( '#info' ).text ''
	$.post( '/usercommand', args.body )
		.done args.done
		.fail args.fail
	

fOnLoad = () ->
	# Fetch the public key from the engine
	fIssueRequest
		body: command: 'get_public_key'
		done: ( data ) ->
			strPublicKey = data.message
		fail: ( err ) ->
			if err.status is 401
				window.location.href = 'forge?page=forge_rule'
			else
				fDisplayError 'When fetching public key. Unable to send user specific parameters securely!'

	document.title = 'Create Rules!'
	$( '#pagetitle' ).text '{{{user.username}}}, create your ECA Rule!'

	editor = ace.edit "editor_conditions"
	editor.setTheme "ace/theme/monokai"
	editor.getSession().setMode "ace/mode/json"
	editor.setShowPrintMargin false
	# editor.session.setUseSoftTabs false 

	

# EVENT

	# If the user is coming from an event he wants a rule to be setup for him
	switch oParams.eventtype
		when 'custom'
			$( '#select_event_type' ).val 'Custom Event'
			inpEvt = $( '<input>' ).attr( 'type', 'text').attr 'id', 'input_eventname'
			inpEvt.val oParams.eventname
			$( '#event_parameters' ).append inpEvt

		when 'webhook'
			console.log 'webhook'

		when 'poller'
			console.log 'poller'

	# Event type is changed, changes the whole event section
	$( '#select_event_type' ).change () ->
		$( '#event_parameters *' ).remove()
		switch $( this ).val()

			# The user wants to act on a custom event
			when 'Custom Event'
				inpEvt = $( '<input>' ).attr( 'type', 'text').attr 'id', 'input_eventname'
				$( '#event_parameters' ).append inpEvt

			# The user wants a webhook as event producer
			when 'Webhook'
				fIssueRequest
					body: command: 'get_webhooks'
					done: ( data ) ->
						try
							arrHooks = JSON.parse data.message
							if arrHooks.length is 0
								fDisplayError 'No webhooks found! Choose another Event Type or create a Webhook.'
								$( '#select_event_type' ).val ''
							else
								selHook = $( '<select>' ).attr 'id', 'input_eventname'
								for hook in arrHooks
									selHook.append $( '<option>' ).text hook
								$( '#event_parameters' ).append selHook
						catch err
							fDisplayError 'Badly formed webhooks!'
					fail: fFailedRequest 'Unable to get webhooks!'

			when 'Event Poller'
				fIssueRequest
					body: command: 'get_event_pollers'
					done: ( data ) ->
						try
							oEps = JSON.parse data.message
							fAppendEvents = ( id, events ) ->
								fAppendEvent = ( evt ) ->
									$( '#select_event' ).append $( '<option>' ).text id + ' -> ' + evt
								fAppendEvent evt for evt in events
							fAppendEvents id, events for id, events of oEps
							$( '#input_event' ).val $( '#select_event' ).val()
							fFetchEventParams $( '#select_event option:selected' ).text()
						catch err
							console.error 'ERROR: non-object received from server: ' + data.message

					fail: fFailedRequest 'Error fetching event poller'

	$( '#select_event' ).change () ->
		evtFunc = $( this ).val()
		if evtFunc is ''
			$( '#event_start' ).html ''
			$( '#event_interval' ).html ''
		else
			fPlaceAndPaintInterval()
		$( '#input_event' ).val evtFunc
		fFetchEventParams evtFunc

	$( '#input_event' ).change () ->
		$( '#select_event' ).val ''
		$( '#select_event' ).val $( this ).val()
		fFetchEventParams $( '#select_event' ).val()
		if $( '#select_event' ).val() is ''
			$( '#event_start' ).html ''
			$( '#event_interval' ).html ''
		else
			fPlaceAndPaintInterval()

	fFetchEventParams = ( name ) ->
		$( '#event_poller_params *' ).remove()
		if name
			arr = name.split ' -> '
			fIssueRequest
				body: 
					command: 'get_event_poller_params'
					body: JSON.stringify
						id: arr[ 0 ]
				done: fAddEventParams arr[ 0 ]
				fail: fFailedRequest 'Error fetching event poller params'
			fFetchEventFunctionArgs arr

	fFetchEventFunctionArgs = ( arrName ) ->
		# FIXME this data gets not populated sometimes!
		fIssueRequest
			body: 
				command: 'get_event_poller_function_arguments'
				body: JSON.stringify
					id: arrName[ 0 ]
		$.post( '/usercommand', obj )
			.done ( data ) ->
				if data.message
					oParams = JSON.parse data.message
					if oParams[ arrName[ 1 ] ]
						if oParams[ arrName[ 1 ] ].length > 0
							$( '#event_poller_params' ).append $( "<b>" ).text 'Required Function Parameters:'
						table = $( '<table>' ).appendTo $( '#event_poller_params' )
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
			.fail fFailedRequest 'Error fetching action invoker function params'

	fAddEventParams = ( id ) ->
		( data ) ->
			if data.message
				oParams = JSON.parse data.message
				table = $ '<table>'
				i = 0
				fAppendParam = ( name, shielded ) ->
					i++
					tr = $( '<tr>' )
					tr.append $( '<td>' ).css 'width', '20px'
					tr.append $( '<td>' ).attr( 'class', 'key' ).text name
					inp = $( '<input>' )
					if shielded
						inp.attr( 'type', 'password' )
					tr.append $( '<td>' ).text( ' : ' ).append inp
					table.append tr
				fAppendParam name, shielded for name, shielded of oParams
				if i > 0
					$( '#event_poller_params' ).html '<b>Required Global Parameters:</b>'
					$( '#event_poller_params' ).append table

				fDelayed = () ->
					fFillEventParams id
				setTimeout fDelayed, 200

	fFillEventParams = ( moduleId ) ->
		obj =
			command: 'get_event_poller_user_params'
			body: JSON.stringify
				id: moduleId
		$.post( '/usercommand', obj )
			.done ( data ) ->
				oParams = JSON.parse data.message
				for param, oParam of oParams
					par = $( "#event_poller_params tr" ).filter () ->
						$( 'td.key', this ).text() is param
					$( 'input', par ).val oParam.value
					$( 'input', par ).attr 'unchanged', 'true'
					$( 'input', par ).change () ->
						$( this ).attr 'unchanged', 'false'

		obj.command = 'get_event_poller_user_arguments'
		obj.body = JSON.stringify
			ruleId: $( '#input_id' ).val()
			moduleId: moduleId
		$.post( '/usercommand', obj )
			.done fAddEventUserArgs moduleId

	fAddEventUserArgs = ( name ) ->
		( data ) ->
			for key, arrFuncs of data.message
				par = $ "#event_poller_params"
				for oFunc in JSON.parse arrFuncs
					tr = $( "tr", par ).filter () ->
						$( '.funcarg', this ).text() is "#{ oFunc.argument }"
					$( "input[type=text]", tr ).val oFunc.value
					# $( "input[type=checkbox]", tr ).prop 'checked', oFunc.jsselector

# ACTIONS


	# <b>Selected Actions:</b>
	# <table id="selected_actions"></table>
	# <br><br>
	# <b>Required Parameters:</b>
	# <br><br>
	# <div id="action_params"></div>
	# <br><br>

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
					arrEls = $( "#action_params div" ).filter () ->
						$( this ).text() is "#{ module } -> #{ act }"
					# It could have been loaded async before through the rules ito the action params
					if arrEls.length is 0
						$( '#select_actions' ).append $( '<option>' ).text module + ' -> ' + act
			fAppendActions module, actions for module, actions of oAis
		.fail fFailedRequest 'Error fetching event poller'

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
		fFetchActionFunctionArgs td, arrName
		if arrName[ 0 ] not in arrEls
			div = $( '<div>' ).appendTo $( '#action_params' )
			subdiv = $( '<div> ').appendTo div 
			subdiv.append $( '<div>' )
				.attr( 'class', 'modName underlined' ).text arrName[ 0 ]
			fFetchActionParams div, arrName[ 0 ]
		$( "#select_actions option" ).each () ->
			if $( this ).text() is name
				$( this ).remove()
		fDelayed = () ->
			fFillActionFunction arrName[ 0 ]
		setTimeout fDelayed, 300

	fFetchActionParams = ( div, modName ) ->
		obj =
			command: 'get_action_invoker_params'
			body: JSON.stringify
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

	fFetchActionFunctionArgs = ( tag, arrName ) ->
		obj =
			command: 'get_action_invoker_function_arguments'
			body: JSON.stringify
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
							# td = $( '<td>' ).appendTo tr
							# td.append $( '<input>' ).attr( 'type', 'checkbox' )
							# 	.attr 'title', 'js-select expression to be resolved on event?'
			.fail fFailedRequest 'Error fetching action invoker function params'

	fFillActionFunction = ( name ) ->
		obj =
			command: 'get_action_invoker_user_params'
			body: JSON.stringify
				id: name
		$.post( '/usercommand', obj )
			.done fAddActionUserParams name
		
		obj.command = 'get_action_invoker_user_arguments'
		obj.body = JSON.stringify
			ruleId: $( '#input_id' ).val()
			moduleId: name
		$.post( '/usercommand', obj )
			.done fAddActionUserArgs name

	fAddActionUserParams = ( name ) ->
		( data ) ->
			oParams = JSON.parse data.message
			domMod = $( "#action_params div" ).filter () ->
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


# SUBMIT

	$( '#but_submit' ).click () ->
		window.scrollTo 0, 0
		$( '#info' ).text ''

		try
			if $( '#input_id' ).val() is ''
				$( '#input_id' ).focus()
				throw new Error 'Please enter a rule name!'

			eventId = $( '#input_event' ).val()
			if eventId is ''
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
				if not shielded or $( 'input', this ).attr( 'unchanged' ) isnt 'true'
					encryptedParam = cryptico.encrypt val, strPublicKey
					ep[ key ].value = encryptedParam.cipher 
				else
					ep[ key ].value = val

			evtFuncs = {}
			evtFuncs[ eventId ] = []
			$( '#event_poller_params tr.funcMappings' ).each () ->
				evtFuncs[ eventId ].push
					argument: $( 'div.funcarg', this ).text()
					value: $( 'input[type=text]', this ).val()

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


			txtStart = $( '#input_start' ).val()
			start = new Date()
			if not txtStart
				start.setHours 12
				start.setMinutes 0
			else
				arrInp = txtStart.split ':'
				# There's only one string entered: hour
				if arrInp.length is 1
					txtHr = txtStart
					start.setMinutes 0
				else
					txtHr = arrInp[ 0 ]
					intMin = parseInt( arrInp[ 1 ] ) || 0
					m = Math.max 0, Math.min intMin, 59
					start.setMinutes m
			
			intHour = parseInt( txtHr ) || 12
			h = Math.max 0, Math.min intHour, 24
			start.setHours h

			start.setSeconds 0
			start.setMilliseconds 0
			if start < new Date()
				start.setDate start.getDate() + 1

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

			txtInterval = $( '#input_interval' ).val()
			if not txtInterval
				mins = 10
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
			mins = Math.max 1, mins
			fCheckOverwrite = ( obj ) ->
				( err ) ->
					if err.status is 409
						if confirm 'Are you sure you want to overwrite the existing rule?'
							payl = JSON.parse obj.body
							payl.overwrite = true
							obj.body = JSON.stringify payl
							$.post( '/usercommand', obj )
								.done ( data ) ->
									$( '#info' ).text data.message
									$( '#info' ).attr 'class', 'success'
								.fail fFailedRequest "#{ obj.id } not stored!"
					else
						fFailedRequest( "#{ obj.id } not stored!" ) err
			if $( '#select_event' ).val() is ''
				start = null
				mins = null
			else 
				start = start.toISOString()
			obj =
				command: 'forge_rule'
				body: JSON.stringify
					id: $( '#input_id' ).val()
					event: eventId
					event_params: ep
					event_start: start
					event_interval: mins
					event_functions: evtFuncs
					conditions: conds
					actions: acts
					action_params: ap
					action_functions: actFuncs
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
			body: JSON.stringify
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

					$( '#input_event' ).val oRule.event
					d = new Date oRule.event_start 
					mins = d.getMinutes()
					if mins.toString().length is 1
							mins = '0' + mins
					$( '#input_start' ).val d.getHours() + ':' + mins
					$( '#input_interval' ).val oRule.event_interval

					# Conditions
					editor.setValue JSON.stringify oRule.conditions, undefined, 2

					# Actions
					for action in oRule.actions
						arrName = action.split ' -> '
						fAddSelectedAction action

			.fail ( err ) ->
				if err.responseText is ''
					msg = 'No Response from Server!'
				else
					try
						msg = JSON.parse( err.responseText ).message
				fFailedRequest( 'Error in upload: ' + msg ) err

window.addEventListener 'load', fOnLoad, true
