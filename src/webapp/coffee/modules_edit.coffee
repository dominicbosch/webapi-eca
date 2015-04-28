
fOnLoad = () ->
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
		if $( '#module_type' ).val() is 'Event Trigger'
			cmd = 'get_event_triggers'
		else
			cmd = 'get_action_dispatchers'
		$.post( '/usercommand/' + cmd )
			.done fUpdateModuleList
			.fail fErrHandler 'Did not retrieve rules! '

	fUpdateModuleList = ( data ) ->
		$( '#tableModules tr' ).remove()
		oMods = JSON.parse data.message
		for modName of oMods
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

	fFetchModules()

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
