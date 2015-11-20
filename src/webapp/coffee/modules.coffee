'use strict';

urlService = '/service/'

if oParams.m is 'ad'
	urlService += 'actiondispatcher/'
	modName = 'Action Dispatcher'
else
	urlService += 'eventtrigger/'
	modName = 'Event Trigger'

updateModules = () ->
	req = main.post(urlService+'get')
	req.done ( arrModules ) ->
		console.log(arrModules);
		if arrModules.length is 0
			parent = $('#tableModules').parent()
			$('#tableModules').remove()
			parent.append $ "<h3 class=\"empty\">No "+modName+"s available!
				<a href=\"/views/modules_create?m="+oParams.m+"\">Create One first!</a></h3>"
		else
			tr = d3.select('#tableModules').selectAll('tr')
				.data(arrModules, (d) -> d.id);
			tr.exit().remove();
			trNew = tr.enter().append('tr');
			trNew.append('td').classed('smallpadded', true)
				.append('img')
					.attr('class', 'icon del')
					.attr('src', '/images/del.png')
					.attr('title', 'Delete Module')
					.on('click', deleteModule);
			trNew.append('td').classed('smallpadded', true)
				.append('img')
					.attr('class', 'icon edit')
					.attr('src', '/images/edit.png')
					.attr('title', 'Edit Module')
					.on('click', editModule);
			trNew.append('td').classed('smallpadded', true)
				.append('div').text((d) -> d.name)
					.each (d) ->
						if d.comment then main.registerHoverInfoHTML d3.select(this), d.comment

	req.fail ( err ) ->
		if err.status is 401
			window.location.href = '/'
		main.setInfo false, 'Error in fetching all Modules: ' + err.responseText

deleteModule = (d) ->
	if confirm 'Do you really want to delete the Module "'+d.name+'"?'
		main.post(urlService+'delete', { id: d.id })
			.done updateModules
			.fail main.requestError (err) ->
				console.log(err)

editModule = (d) ->
	if oParams.m is 'ad'
		window.location.href = 'modules_create?m=ad&id='+d.id
	else
		window.location.href = 'modules_create?m=et&id='+d.id

fOnLoad = () ->
	$('.moduletype').text modName
	$('#linkMod').attr 'href', '/views/modules_create?m=' + oParams.m

	updateModules()

window.addEventListener 'load', fOnLoad, true





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
