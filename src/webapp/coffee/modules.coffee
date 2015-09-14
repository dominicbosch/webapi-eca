'use strict';

urlService = '/service/'

if oParams.m is 'ad'
	urlService += 'actiondispatcher/'
	modName = 'Action Dispatcher'
else
	urlService += 'eventtrigger/'
	modName = 'Event Trigger'

fOnLoad = () ->
	$('.moduletype').text modName
	$('#linkMod').attr 'href', '/views/modules_create?m=' + oParams.m

	req = $.post urlService + 'getall'
	req.done ( arrModules ) ->
		if arrModules.length is 0
			$('#tableModules').html '<h3>No '+modName+'s available!'
		else
			for modName of arrModules
				tr = $ '<tr>'
				inp = $( '<div>' ).text modName
				img = $( '<img>' ).attr( 'class', 'del' )
					.attr( 'title', 'Delete Module' ).attr 'src', 'images/red_cross_small.png'
				tr.append( $( '<td>' ).append img )
				img = $( '<img>' ).attr( 'class', 'log' )
					.attr( 'title', 'Edit Module' ).attr 'src', 'images/edit.png'
				tr.append( $( '<td>' ).append img )
				tr.append( $( '<td>' ).append inp )
				$( '#tableModules' ).append tr
	req.fail ( err ) ->
		if err.status is 401
			window.location.href = '/'
		main.setInfo false, 'Error in fetching all Modules: ' + err.responseText

	$( '#tableModules' ).on 'click', 'img.del', () ->
		modName = $( 'div', $( this ).closest( 'tr' )).text()
		if confirm  "Do you really want to delete the Module '#{ modName }'?
				The module might still be active in some of your rules!"
			if $( '#module_type' ).val() is 'Event Trigger'
				cmd = 'delete_event_trigger'
			else
				cmd = 'delete_action_dispatcher'
			data =
				body: JSON.stringify
					id: modName
			$.post( '/usercommand/' + cmd, data )
				.done fFetchModules
				.fail fErrHandler 'Could not delete module! '

	$( '#tableModules' ).on 'click', 'img.log', () ->
		modName = encodeURIComponent $( 'div', $( this ).closest( 'tr' )).text()
		if $( '#module_type' ).val() is 'Event Trigger'
			window.location.href = 'forge?page=forge_module&type=event_trigger&id=' + modName
		else
			window.location.href = 'forge?page=forge_module&type=action_dispatcher&id=' + modName

window.addEventListener 'load', fOnLoad, true



# # Convert a time string ( d h:m ) to a date
# fConvertTimeToDate = ( str ) ->
# 	if not str
# 		dateConv = null
# 	else
# 		dateConv = new Date()
# 		arrInp = str.split ':'
# 		# There's only one string entered: hour
# 		if arrInp.length is 1
# 			txtHr = str
# 			dateConv.setMinutes 0
# 		else
# 			txtHr = arrInp[ 0 ]
# 			intMin = parseInt( arrInp[ 1 ] ) || 0
# 			m = Math.max 0, Math.min intMin, 59
# 			dateConv.setMinutes m
	
# 		intHour = parseInt( txtHr ) || 12
# 		h = Math.max 0, Math.min intHour, 24
# 		dateConv.setHours h

# 		dateConv.setSeconds 0
# 		dateConv.setMilliseconds 0
# 		if dateConv < new Date()
# 			dateConv.setDate dateConv.getDate() + 17
# 	dateConv

# # Convert a day hour string ( h:m ) to minutes
# fConvertDayHourToMinutes = ( strDayHour ) ->
# 	# Parse a time string
# 	fParseTime = ( str, hasDay ) ->
# 		arrTime = str.split ':'
# 		# If there's only one entry, this is the amount of minutes
# 		if hasDay
# 			def = 0
# 		else
# 			def = 10
# 		if arrTime.length is 1
# 			time = parseInt( str ) || def
# 			if hasDay
# 				time * 60
# 			else
# 				time
# 		else
# 			h = parseInt( arrTime[ 0 ] ) || 0
# 			if h > 0
# 				def = 0
# 			h * 60 + ( parseInt( arrTime[ 1 ] ) || def )

# 	if not strDayHour
# 		mins = 10
# 	else
# 		arrInp = strDayHour.split ' '
# 		# There's only one string entered, either day or hour
# 		if arrInp.length is 1
# 			mins = fParseTime strDayHour
# 		else
# 			d = parseInt( arrInp[ 0 ] ) || 0
# 			mins = d * 24 * 60 + fParseTime arrInp[ 1 ], true

# 	# We have to limit this to 24 days because setTimeout only takes integer values
# 	# until we implement a scheduler that deals with larger intervals
# 	mins = Math.min mins, 35700
# 	Math.max 1, mins

# # Fetch the required Event Trigger parameters




# fFetchEventParams = ( name ) ->
# 	$( '#event_trigger_params *' ).remove()
# 	if name
# 		$( '#eventParameters' ).append domEventTriggerParameters
# 		arr = name.split ' -> '
# 		sendRequest
# 			command: 'get_event_trigger_params'
# 			data: 
# 				body: JSON.stringify
# 					id: arr[ 0 ]
# 			done: fDisplayEventParams arr[ 0 ]
# 			fail: console.log 'Error fetching Event Trigger params'
# 		sendRequest
# 			command: 'get_event_trigger_comment'
# 			data: 
# 				body: JSON.stringify
# 					id: arr[ 0 ]
# 			done: ( data ) ->
# 				$( '.comment', domInputEventTiming ).html data.message.replace /\n/g, '<br>' 
# 			fail: console.log 'Error fetching Event Trigger comment'
# 		fFetchEventFunctionArgs arr

# fDisplayEventParams = ( id ) ->
# 	( data ) ->
# 		if data.message
# 			oParams = JSON.parse data.message
# 			table = $ '<table>'
# 			i = 0
# 			for name, shielded of oParams
# 				i++
# 				tr = $( '<tr>' )
# 				tr.append $( '<td>' ).css 'width', '20px'
# 				tr.append $( '<td>' ).attr( 'class', 'key' ).text name
# 				inp = $( '<input>' )
# 				if shielded
# 					inp.attr( 'type', 'password' )
# 				tr.append $( '<td>' ).text( ' : ' ).append inp
# 				table.append tr
# 			if i > 0
# 				$( '#event_trigger_params' ).html '<b>Required User-specific Data:</b>'
# 				$( '#event_trigger_params' ).append table
# 				fFillEventParams id

# fFillEventParams = ( moduleId ) ->
# 	sendRequest
# 		command: 'get_event_trigger_user_params'
# 		data:
# 			body: JSON.stringify
# 				id: moduleId
# 		done: ( data ) ->
# 			oParams = JSON.parse data.message
# 			for param, oParam of oParams
# 				par = $( "#event_trigger_params tr" ).filter () ->
# 					$( 'td.key', this ).text() is param
# 				$( 'input', par ).val oParam.value
# 				$( 'input', par ).attr 'unchanged', 'true'
# 				$( 'input', par ).change () ->
# 					$( this ).attr 'unchanged', 'false'

# # Fetch function arguments required for an event polling function
# fFetchEventFunctionArgs = ( arrName ) ->
# 	sendRequest
# 		command: 'get_event_trigger_function_arguments'
# 		data:
# 			body: JSON.stringify
# 				id: arrName[ 0 ]
# 		done: ( data ) ->
# 			if data.message
# 				oParams = JSON.parse data.message
# 				if oParams[ arrName[ 1 ] ]
# 					if oParams[ arrName[ 1 ] ].length > 0
# 						$( '#event_trigger_params' ).append $( "<b>" ).text 'Required Rule-specific Data:'
# 					table = $( '<table>' ).appendTo $( '#event_trigger_params' )
# 					for functionArgument in oParams[ arrName[ 1 ] ]
# 						tr = $( '<tr>' ).attr( 'class', 'funcMappings' ).appendTo table
# 						tr.append $( '<td>' ).css 'width', '20px'
# 						td = $( '<td>' ).appendTo tr
# 						td.append $( '<div>' ).attr( 'class', 'funcarg' ).text functionArgument
# 						tr.append td
# 						tr.append $( '<td>' ).text ' : '
# 						td = $( '<td>' ).appendTo tr
# 						td.append $( '<input>' ).attr 'type', 'text'
# 						tr.append td
# 					sendRequest
# 						command: 'get_event_trigger_user_arguments'
# 						data:
# 							body: JSON.stringify
# 								ruleId: $( '#input_id' ).val()
# 								moduleId: arrName[ 0 ]
# 						done: fAddEventUserArgs arrName[ 1 ]

# 		fail: console.log 'Error fetching event trigger function arguments'

# fAddEventUserArgs = ( name ) ->
# 	( data ) ->
# 		for key, arrFuncs of data.message
# 			par = $ "#event_trigger_params"
# 			for oFunc in JSON.parse arrFuncs
# 				tr = $( "tr", par ).filter () ->
# 					$( '.funcarg', this ).text() is "#{ oFunc.argument }"
# 				$( "input[type=text]", tr ).val oFunc.value
# 				# $( "input[type=checkbox]", tr ).prop 'checked', oFunc.jsselector
