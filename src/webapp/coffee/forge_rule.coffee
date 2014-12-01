#
# The module that helps creating the rules
#

# FIXME: notify of non existing Action dispatcher in the first place!

strPublicKey = ''

# Fetch the search string and transform it into an object for easy access
arrParams = window.location.search.substring(1).split '&'
oParams = {}
for param in arrParams
	arrKV = param.split '='
	oParams[ arrKV[ 0 ] ] = arrKV[ 1 ]

if oParams.id
	oParams.id = decodeURIComponent oParams.id

# Webpage elements. Registered here for easier access
domInputEventName = $( '<div>' )
el = $( '<input>' ).attr( 'type', 'text' )
	.attr( 'style', 'font-size:1em' )
	.attr( 'id', 'input_eventname' )
domInputEventName.append $( '<h4>' ).text( 'Event Name : ' ).append el

domSelectWebhook = $( '<div>' )
el = $( '<select>' ).attr( 'type', 'text' )
	.attr( 'style', 'font-size:1em' )
	.attr( 'id', 'select_eventhook' )
domSelectWebhook.append $( '<h4>' ).text( 'Webhook Name : ' ).append el

domSelectEventTrigger = $( '<div>' )
el = $( '<select>' ).attr( 'type', 'text' )
	.attr( 'style', 'font-size:1em' )
	.attr( 'id', 'select_eventtrigger' )
el.change () ->	fFetchEventParams $( this ).val()
domSelectEventTrigger.append $( '<h4>' ).text( 'Event Trigger Name : ' ).append el

domInputEventTiming = $( '<div>' ).attr( 'class', 'indent20' )
$( '<div>' ).attr( 'class', 'comment' ).appendTo domInputEventTiming
table = $( '<table>' ).appendTo domInputEventTiming
tr = $( '<tr>' ).appendTo table
tr.append $( '<td>' ).text "Start Time : "
tr.append $( '<td>' ).append $( '<input>' ).attr( 'id', 'input_start' ).attr( 'type', 'text' )
tr.append $( '<td>' ).html " <b>\"hh:mm\"</b>, default = 12:00"

tr = $( '<tr>' ).appendTo table
tr.append $( '<td>' ).text "Interval : "
tr.append $( '<td>' ).append $( '<input>' ).attr( 'id', 'input_interval' ).attr( 'type', 'text' )
tr.append $( '<td>' ).html " <b>\"days hours:minutes\"</b>, default = 10 minutes"

domEventTriggerParameters = $( '<div>' ).attr 'id', 'event_trigger_params'

domSectionSelectedActions = $( '<div>' )
domSectionSelectedActions.append $( '<div>' ).html "<b>Selected Actions:</b>"
domSectionSelectedActions.append $( '<table> ' ).attr( 'id', 'selected_actions' )
domSectionSelectedActions.hide()

domSectionActionParameters = $( '<div>' )
domSectionActionParameters.append $( '<div>' ).html "<br><br><b>Required User-specific Data:</b><br><br>"
domSectionActionParameters.append $( '<div>' ).attr( 'id', 'action_dispatcher_params' )
domSectionActionParameters.append $( '<div>' ).html "<br><br>"
domSectionActionParameters.hide()

fClearInfo = () ->
	$( '#info' ).text ''
	$( '#info' ).attr 'class', 'neutral'

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
	fClearInfo()
	$.post( '/usercommand', args.data )
		.done args.done
		.fail args.fail

# Convert a time string ( d h:m ) to a date
fConvertTimeToDate = ( str ) ->
	dateConv = new Date()
	if not str
		dateConv.setHours 12
		dateConv.setMinutes 0
	else
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

#	Prepare the event section when a different event type is selected
fPrepareEventType = ( eventtype, cb ) ->
	$( '#select_event_type' ).val eventtype
	$( '#event_parameters > div' ).detach()
	switch eventtype

		# The user wants to react to custom event
		when 'Custom Event'
			$( '#event_parameters' ).append domInputEventName
			cb?()

		# The user wants a webhook as event producer
		when 'Webhook'
			fIssueRequest
				data: command: 'get_all_webhooks'
				done: ( data ) ->
					try
						oHooks = JSON.parse data.message
						selHook = $( 'select', domSelectWebhook )
						selHook.children().remove()
						i = 0
						for hookid, hookname of oHooks
							i++
							selHook.append $( '<option>' ).text hookname

						if i > 0
							$( '#event_parameters' ).append domSelectWebhook
							
						else
							fDisplayError 'No webhooks found! Choose another Event Type or create a Webhook.'
							$( '#select_event_type' ).val ''

					catch err
						fDisplayError 'Badly formed webhooks!'
					
					cb?()

				fail: () ->
					fFailedRequest 'Unable to get webhooks!'
					cb?()

		when 'Event Trigger'
			fIssueRequest
				data: command: 'get_event_triggers'
				done: ( data ) ->
					try
						oEps = JSON.parse data.message
						if JSON.stringify( oEps ) is '{}'
							fDisplayError 'No Event Triggers found! Create one first!'
							$( '#select_event_type' ).val ''

						else
							$( '#event_parameters' ).append domSelectEventTrigger
							$( '#event_parameters' ).append domInputEventTiming.show()

							$( '#select_eventtrigger option' ).remove()
							for id, events of oEps
								for evt in events
									$( '#select_eventtrigger' ).append $( '<option>' ).text id + ' -> ' + evt

							fFetchEventParams $( 'option:selected', domSelectEventTrigger ).text()

					catch err
						console.error 'ERROR: non-object received for event trigger from server: ' + data.message
					cb?()

				fail: () ->
					fFailedRequest 'Error fetching Event Trigger'
					cb?()

# Fetch the required Event Trigger parameters
fFetchEventParams = ( name ) ->
	$( '#event_trigger_params *' ).remove()
	if name
		$( '#event_parameters' ).append domEventTriggerParameters
		arr = name.split ' -> '
		fIssueRequest
			data: 
				command: 'get_event_trigger_params'
				body: JSON.stringify
					id: arr[ 0 ]
			done: fDisplayEventParams arr[ 0 ]
			fail: fFailedRequest 'Error fetching Event Trigger params'
		fIssueRequest
			data: 
				command: 'get_event_trigger_comment'
				body: JSON.stringify
					id: arr[ 0 ]
			done: ( data ) ->
				$( '.comment', domInputEventTiming ).html data.message.replace /\n/g, '<br>' 
			fail: fFailedRequest 'Error fetching Event Trigger comment'
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
	fIssueRequest
		data:
			command: 'get_event_trigger_user_params'
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
	fIssueRequest
		data:
			command: 'get_event_trigger_function_arguments'
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
					fIssueRequest
						data:
							command: 'get_event_trigger_user_arguments'
							body: JSON.stringify
								ruleId: $( '#input_id' ).val()
								moduleId: arrName[ 0 ]
						done: fAddEventUserArgs arrName[ 1 ]

		fail: fFailedRequest 'Error fetching event trigger function arguments'

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
	fIssueRequest
		data: 
			command: 'get_action_dispatcher_params'
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
					fIssueRequest
						data: 
							command: 'get_action_dispatcher_comment'
							body: JSON.stringify
								id: modName
						done: ( data ) ->
							comment.html data.message.replace /\n/g, '<br>'
						fail: fFailedRequest 'Error fetching Event Trigger comment'

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

		fail: fFailedRequest 'Error fetching action dispatcher params'

fFetchActionFunctionArgs = ( tag, arrName ) ->
	fIssueRequest
		data: 
			command: 'get_action_dispatcher_function_arguments'
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
		fail: fFailedRequest 'Error fetching action dispatcher function params'

fFillActionFunction = ( name ) ->
	fIssueRequest
		data: 
			command: 'get_action_dispatcher_user_params'
			body: JSON.stringify
				id: name
		done: fAddActionUserParams name

	fIssueRequest
		data:
			command: 'get_action_dispatcher_user_arguments'
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

# ONLOAD
# ------
#
# When the document has loaded we really start to execute some logic

fOnLoad = () ->
	# Fetch the public key from the engine
	fIssueRequest
		data: command: 'get_public_key'
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
	# editor.setTheme "ace/theme/monokai"
	editor.setTheme "ace/theme/crimson_editor"
	editor.setFontSize "18px"
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

	$( '#action_parameters' ).append domSectionSelectedActions
	$( '#action_parameters' ).append domSectionActionParameters
	$( '#input_id' ).focus()


# EVENT
# -----

	# Event type is changed, changes the whole event section
	$( '#select_event_type' ).change () ->
		fPrepareEventType $( this ).val()

	# If the user is coming from an event UI he wants a rule to be setup for him
	switch oParams.eventtype
		when 'custom'
			name = decodeURIComponent oParams.eventname
			$( '#input_id' ).val "My '#{ name }' Rule" 
			fPrepareEventType 'Custom Event', () ->
				$( 'input', domInputEventName ).val name
				$( 'input', domInputEventName ).focus()
				editor.setValue "[\n\n]" # For now we don't prepare conditions

		when 'webhook'
			name = decodeURIComponent oParams.hookname
			$( '#input_id' ).val "My '#{ name }' Rule" 
			fPrepareEventType 'Webhook', () ->
				$( 'select', domSelectWebhook ).val name


# ACTIONS

	fIssueRequest
		data:
			command: 'get_action_dispatchers'
		done: ( data ) ->
			try
				oAis = JSON.parse data.message
			catch err
				console.error 'ERROR: non-object received from server: ' + data.message
				return
			i = 0
			for module, actions of oAis
				for act in actions
					i++
					arrEls = $( "#action_dispatcher_params div" ).filter () ->
						$( this ).text() is "#{ module } -> #{ act }"
					# It could have been loaded async before through the rules into the action params
					if arrEls.length is 0
						$( '#select_actions' ).append $( '<option>' ).text module + ' -> ' + act
		fail: fFailedRequest 'Error fetching Action Dispatchers'


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
		fClearInfo()

		try
			if $( '#input_id' ).val() is ''
				$( '#input_id' ).focus()
				throw new Error 'Please enter a rule name!'

			eventtype = $( '#select_event_type' ).val()
			switch eventtype
				when ''
					$( '#select_event_type' ).focus()
					throw new Error 'Please choose an event type!'

				when 'Custom Event'
					el = $( '#input_eventname' )
					if el.val() is ''
						el.focus()
						throw new Error 'Please assign an Event Name!'
					eventname = el.val()

				when 'Webhook'
					eventname = $( '#select_eventhook' ).val()

				when 'Event Trigger'
					eventname = $( '#select_eventtrigger' ).val()
					ep = {}
					$( "#event_trigger_params tr" ).each () ->
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
					evtFuncs[ eventname ] = []
					$( '#event_trigger_params tr.funcMappings' ).each () ->
						evtFuncs[ eventname ].push
							argument: $( 'div.funcarg', this ).text()
							value: $( 'input[type=text]', this ).val()

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
							fIssueRequest
								data: obj
								done: ( data ) ->
									$( '#info' ).text data.message
									$( '#info' ).attr 'class', 'success'
								fail: fFailedRequest "#{ obj.id } not stored!"
					else
						fFailedRequest( "#{ obj.id } not stored!" ) err

			if $( '#select_event_type' ).val() is 'Event Trigger'
				start = fConvertTimeToDate( $( '#input_start' ).val() ).toISOString()
				mins = fConvertDayHourToMinutes $( '#input_interval' ).val()

			obj = 
				command: 'forge_rule'
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
			fIssueRequest
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
		fIssueRequest
			data: 
				command: 'get_rule'
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

							when 'Custom Event'
								$( 'input', domInputEventName ).val oRule.eventname

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
				fFailedRequest( 'Error in upload: ' + msg ) err

window.addEventListener 'load', fOnLoad, true
