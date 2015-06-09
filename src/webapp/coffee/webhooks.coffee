'use strict';

hostUrl = [ location.protocol, '//', location.host ].join ''

failedRequest = ( msg ) ->
	( err ) ->
		if err.status is 401
			window.location.href = '/'
		else
			main.setInfo false, msg

updateWebhookList = () ->
	main.clearInfo()
	$.post( '/service/webhooks/getall' )
		.done ( oHooks ) ->
			$( '#table_webhooks *' ).remove()
			if Object.keys( oHooks ).length > 0
				$( '#table_webhooks' ).append $( '<h4>' ).text 'Your Webhooks:'
				table = $( '<table>' ).appendTo $( '#table_webhooks' )
				for hookid, oHook of oHooks
					img = if oHook.isPublic is 'true' then 'public' else 'private'
					tit = if oHook.isPublic is 'true' then 'Public' else 'Private'
					table.append $ """
						<tr>
							<td><img class="del" title="Delete Webhook" src="/images/red_cross_small.png"></td>
							<td style="white-space: nowrap"><kbd>#{ oHook.hookname }</kbd></td>
							<td class="centered" title="#{ tit }">
								<img src="/images/#{ img }.png"></td>
							<td><input value="#{ hostUrl }/service/webhooks/event/#{ hookid }"></td>
						</tr>
					"""
			else
				$( '#table_webhooks' )
					.append $( '<div>' ).attr( 'id', 'listhooks' ).text 'You don\'t have any existing webhooks'
		.fail failedRequest 'Unable to get Webhook list'

fShowWebhookUsage = ( hookid, hookname ) ->
	$( '#display_hookurl *' ).remove()
	if hookid
		$( '#display_hookurl' ).append $ """
			<div>This is the Webhook Url you can use for your Events <kbd>#{ hookname }</kbd> :</div>
			<input class="url" type="text" value="#{ hostUrl }/service/webhooks/event/#{ hookid }"><br>
			<div><b>Now you can <a href="/views/events?hookname=#{ hookname }">emit an Event</a> 
			on this Webhook!</b></div>
		"""

fOnLoad = () ->
	main.registerHoverInfo $( '#pagetitle' ), 'webhookinfo.html'
	updateWebhookList()

	$( '#inp_hookname' ).val oParams.id
	$( '#but_submit' ).click ->
		main.clearInfo()

		hookname = $( '#inp_hookname' ).val()
		if hookname is ''
			main.setInfo false, 'Please provide an Event Name for your new Webhook!'

		else
			data = 
				hookname: hookname
				isPublic: $( '#inp_public' ).is( ':checked' )
			$.post( '/service/webhooks/create', data )
				.done ( data ) ->
					updateWebhookList()
					fShowWebhookUsage data.hookid, data.hookname
				.fail ( err ) ->
					if err.status is 409
						failedRequest( 'Webhook Event Name already existing!' ) err
					else
						failedRequest( 'Unable to create Webhook! ' + err.message ) err
	
	$( '#table_webhooks' ).on 'click', 'img', () ->
		if confirm  "Do you really want to delete this webhook?"
			url = $( 'input', $( this ).closest( 'tr' ) ).val()
			arrUrl = url.split '/'
			$.post( '/service/webhooks/delete/' + arrUrl[ arrUrl.length - 1 ] )
				.done () ->
					$( '#display_hookurl *' ).remove()
					main.setInfo true, 'Webhook deleted!'
					updateWebhookList()
				.fail failedRequest 'Unable to delete Webhook!'

window.addEventListener 'load', fOnLoad, true
