
fOnLoad = () ->
	document.title = 'Edit Rules'
	$( '#pagetitle' ).text "{{{user.username}}}, edit your Rules!"

	fErrHandler = ( errMsg ) ->
		( err ) ->
			if err.status is 401
				window.location.href = 'forge?page=edit_rules'
			else
				$( '#log_col' ).text ""
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

	fFetchRules = () ->
		$.post( '/usercommand', command: 'get_rules' )
			.done fUpdateRuleList
			.fail fErrHandler 'Did not retrieve rules! '

	fUpdateRuleList = ( data ) ->
		$( '#tableRules tr' ).remove()
		for ruleName in data.message
			tr = $ '<tr>'
			img = $( '<img>' ).attr( 'class', 'del' )
				.attr( 'title', 'Delete Rule' ).attr 'src', 'red_cross_small.png'
			tr.append( $( '<td>' ).append img )
			img = $( '<img>' ).attr( 'class', 'edit' )
				.attr( 'title', 'Edit Rule' ).attr 'src', 'edit.png'
			tr.append( $( '<td>' ).append img )
			img = $( '<img>' ).attr( 'class', 'log' )
				.attr( 'title', 'Show Rule Log' ).attr 'src', 'logicon.png'
			tr.append( $( '<td>' ).append img )
			inp = $( '<div>' ).text ruleName
			tr.append( $( '<td>' ).append inp )
			$( '#tableRules' ).append tr

	fFetchRules()

	$( '#tableRules' ).on 'click', 'img.del', () ->
		ruleName = $( 'div', $( this ).closest( 'tr' )).text()
		if confirm  "Do you really want to delete the rule '#{ ruleName }'?"
			$( '#log_col' ).text ""
			data =
				command: 'delete_rule'
				body: JSON.stringify
					id: ruleName
			$.post( '/usercommand', data )
				.done fFetchRules
				.fail fErrHandler 'Could not delete rule! '

	$( '#tableRules' ).on 'click', 'img.edit', () ->
		ruleName = $( 'div', $( this ).closest( 'tr' )).text()
		window.location.href = 'forge?page=forge_rule&id=' + encodeURIComponent ruleName

	$( '#tableRules' ).on 'click', 'img.log', () ->
		ruleName = $( 'div', $( this ).closest( 'tr' )).text()
		data =
			command: 'get_rule_log'
			body: JSON.stringify
				id: ruleName
		$.post( '/usercommand', data )
			.done ( data ) ->
				ts = ( new Date() ).toISOString()
				log = data.message.replace new RegExp("\n", 'g'), "<br>"
				$( '#log_col' ).html "<h3>#{ ruleName } Log:</h3> <i>( updated UTC|#{ ts } )</i><br/><br/>#{ log }"
			.fail fErrHandler 'Could not get rule log! '

window.addEventListener 'load', fOnLoad, true
