
fOnLoad = () ->
	document.title = 'Edit Modules'
	$( '#pagetitle' ).text "{{{user.username}}}, edit your Modules!"

	$( '#module_type' ).change () ->
		fFetchModules()

	fErrHandler = ( errMsg ) ->
		( err ) ->
			if err.status is 401
				window.location.href = 'forge?page=edit_modules'
			else
				fDelayed = () ->
					if err.responseText is ''
						msg = 'No Response from Server!'
					else
						try
							oErr = JSON.parse err.responseText
							msg = oErr.message
					$( '#info' ).text errMsg + msg
					$( '#info' ).attr 'class', 'error'
				setTimeout fDelayed, 500

	fFetchModules = () ->
		if $( '#module_type' ).val() is 'Event Poller'
			cmd = 'get_event_pollers'
		else
			cmd = 'get_action_invokers'
		$.post( '/usercommand', command: cmd )
			.done fUpdateModuleList
			.fail fErrHandler 'Did not retrieve rules! '

	fUpdateModuleList = ( data ) ->
		$( '#tableModules tr' ).remove()
		oMods = JSON.parse data.message
		for modName of oMods
			tr = $ '<tr>'
			inp = $( '<div>' ).text modName
			img = $( '<img>' ).attr( 'class', 'del' )
				.attr( 'title', 'Delete Module' ).attr 'src', 'red_cross_small.png'
			tr.append( $( '<td>' ).append img )
			img = $( '<img>' ).attr( 'class', 'log' )
				.attr( 'title', 'Edit Module' ).attr 'src', 'edit.png'
			tr.append( $( '<td>' ).append img )
			tr.append( $( '<td>' ).append inp )
			$( '#tableModules' ).append tr

	fFetchModules()

	$( '#tableModules' ).on 'click', 'img.del', () ->
		modName = $( 'div', $( this ).closest( 'tr' )).text()
		if confirm  "Do you really want to delete the Module '#{ modName }'?
				The module might still be active in some of your rules!"
			if $( '#module_type' ).val() is 'Event Poller'
				cmd = 'delete_event_poller'
			else
				cmd = 'delete_action_invoker'
			data =
				command: cmd
				payload: JSON.stringify
					id: modName
			$.post( '/usercommand', data )
				.done fFetchModules
				.fail fErrHandler 'Could not delete module! '

	$( '#tableModules' ).on 'click', 'img.log', () ->
		modName = encodeURIComponent $( 'div', $( this ).closest( 'tr' )).text()
		if $( '#module_type' ).val() is 'Event Poller'
			window.location.href = 'forge?page=forge_module&type=event_poller&id=' + modName
		else
			window.location.href = 'forge?page=forge_module&type=action_invoker&id=' + modName

window.addEventListener 'load', fOnLoad, true
