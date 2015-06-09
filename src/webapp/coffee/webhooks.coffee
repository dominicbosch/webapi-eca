'use strict';

hostUrl = [ location.protocol, '//', location.host ].join ''

fFailedRequest = ( msg ) ->
	( err ) ->
		if err.status is 401
			window.location.href = '/'
		else
			main.setInfo false, msg

fUpdateWebhookList = ( cb ) ->
	main.clearInfo()
	$.post( '/service/webhooks/getall' )
		.done fProcessWebhookList cb
		.fail fFailedRequest 'Unable to get Webhook list'

fProcessWebhookList = ( cb ) ->
	( oHooks ) ->
		$( '#table_webhooks *' ).remove()
		$( '#table_webhooks' ).append $( '<h3>' ).text 'Your existing Webhooks:'
		for hookid, oHook of oHooks
			tr = $( '<tr>' )
			tdName = $( '<div>' ).text oHook.hookname
			tdUrl = $( '<input>' ).attr( 'class', 'url' ).val "#{ hostUrl }/service/webhooks/event/#{ hookid }"
			img = $( '<img>' ).attr( 'class', 'del' )
				.attr( 'title', 'Delete Webhook' ).attr 'src', '/images/red_cross_small.png'
			tr.append( $( '<td>' ).append img )
			isPub = oHook.isPublic is 'true'
			tr.append( $( '<td>' ).attr( 'style', 'padding-left:10px' ).append tdName )
			# img = $( '<img>' ).attr( 'class', oHook.isPublic === 'true' ? 'public' : 'private' )
			img = $( '<img>' ).attr 'src', '/images/' + (if isPub then 'public' else 'private') + '.png'
			tr.append(
				$( '<td>' ).attr( 'class', 'centered' )
					.attr( 'title', (if isPub then 'Public' else 'Private') ).append img
			);
			tr.append( $( '<td>' ).attr( 'style', 'padding-left:10px' ).append tdUrl )
			$( '#table_webhooks' ).append tr
		cb? oHook.hookid, oHook.hookname

fShowWebhookUsage = ( hookid, hookname ) ->
	$( '#display_hookurl *' ).remove()
	if hookid
		b = $( '<b>' ).text "This is the Webhook Url you can use for your Events '#{ hookname }' : "
		$( '#display_hookurl' ).append b
		$( '#display_hookurl' ).append $('<br>')
		inp = $('<input>').attr( 'class', 'url' ).attr( 'type', 'text' )
			.val "#{ hostUrl }/webhooks/#{ hookid }"
		$( '#display_hookurl' ).append inp
		$( '#display_hookurl' ).append $('<br>')

		div = $( '<div>' )
		div.append $( '<br>' )
		div.append $( '<div>' ).html "1. Try it out and push your location to your new webhook
			via <a target=\"_blank\" href=\"#{ hostUrl }/mobile.html?hookid=#{ hookid }\">this page</a>."
		div.append $( '<br>' )
		div.append $( '<div>' ).html "2. Then you should setup <a target=\"_blank\"
			href=\"forge?page=forge_rule&eventtype=webhook&hookname=#{ hookname }\">a Rule for the '#{ hookname }' Event!</a>"
		$( '#display_hookurl' ).append div

fOnLoad = () ->
	main.registerHoverInfo $( '#pagetitle' ), 'webhookinfo.html'
	fUpdateWebhookList fShowWebhookUsage

	$( '#inp_hookname' ).val oParams.id
	# Register button action
	$( '#but_submit' ).click ->
		main.clearInfo()

		hookname = $( '#inp_hookname' ).val()
		if hookname is ''
			main.setInfo false, 'Please provide an Event Name for your new Webhook!'

		else
			# $( '#display_hookurl *' ).remove()
			data = 
				hookname: hookname
				isPublic: $( '#inp_public' ).is( ':checked' )
			$.post( '/service/webhooks/create', data )
				.done ( data ) ->
					fShowWebhookUsage data.hookid, data.hookname
				.fail ( err ) ->
					if err.status is 409
						fFailedRequest( 'Webhook Event Name already existing!' ) err
					else
						fFailedRequest( 'Unable to create Webhook! ' + err.message ) err
	
	$( '#table_webhooks' ).on 'click', 'img', () ->
		if confirm  "Do you really want to delete this webhook?"
			url = $( 'input', $( this ).closest( 'tr' ) ).val()
			arrUrl = url.split '/'
			$.post( '/service/webhooks/delete/' + arrUrl[ arrUrl.length - 1 ] )
				.done ( data ) ->
					fUpdateWebhookList ( data ) ->
						$( '#info' ).text 'Webhook deleted!'
						$( '#info' ).attr 'class', 'success'
				.fail ( err ) ->
					fFailedRequest( 'Unable to delete Webhook!' ) err

window.addEventListener 'load', fOnLoad, true
