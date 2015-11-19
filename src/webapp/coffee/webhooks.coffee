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
	$.post('/service/webhooks/get')
		.done ( oHooks ) ->
			$('#table_webhooks *').remove()
			prl = if oHooks.private then Object.keys(oHooks.private).length else 0
			pul = if oHooks.public then Object.keys(oHooks.public).length else 0
			if prl + pul > 0
				createWebhookRow = (oHook, isMine) ->
					img = if oHook.isPublic then 'public' else 'private'
					tit = if oHook.isPublic then 'Public' else 'Private'
					table.append $ """
						<tr>
							<td>#{if isMine then '<img class="icon del" src="/images/del.png" title="Delete Webhook" data-id="'+oHook.id+'">' else '' }</td>
							<td style="white-space: nowrap"><kbd>#{oHook.hookname}</kbd></td>
							<td style="white-space: nowrap">#{if isMine then '(you)' else oHook.User.username}</td>
							<td class="centered" title="#{tit}">
								<img src="/images/#{img}.png"></td>
							<td class="hundredwide"><input class="smallfont hundredwide" value="#{hostUrl}/service/webhooks/event/#{oHook.hookid}" readonly></td>
						</tr>
					"""
				$('#table_webhooks').append $('<h2>').text 'Available Webhooks'
				table = $('<table>').attr('class', 'hundredywide').appendTo $ '#table_webhooks'
				table.append '<tr><th></th><th>Event Name</th><th>Owner</th><th></th><th>Hook Url</th></tr>'
				createWebhookRow(oHook, true) for hookid, oHook of oHooks.private
				createWebhookRow(oHook) for hookid, oHook of oHooks.public
			else
				$('#table_webhooks').append $('<div>').attr('id', 'listhooks').text 'There are no webhooks available for you!'
		.fail failedRequest 'Unable to get Webhook list'

fShowWebhookUsage = ( hookid, hookname ) ->
	$('#display_hookurl *').remove()
	if hookid
		main.setInfo true, 'Webhook created!'
		$('#display_hookurl').append $ """
			<div>This is the Webhook Url you can use for your Events <kbd>#{ hookname }</kbd> :</div>
			<input class="seventywide smallfont" type="text" value="#{ hostUrl }/service/webhooks/event/#{ hookid }" readonly><br>
			<div><b>Now you can <a href="/views/events?webhook=#{ hookid }">emit an Event</a> 
			on this Webhook!</b></div>
		"""

fOnLoad = () ->
	main.registerHoverInfo d3.select('#pagetitle'), 'webhooks_info.html'
	updateWebhookList()

	$('#inp_hookname').val oParams.id
	$('#but_submit').click ->
		main.clearInfo()

		hookname = $( '#inp_hookname' ).val()
		if hookname is ''
			main.setInfo false, 'Please provide an Event Name for your new Webhook!'

		else
			data = 
				hookname: hookname
				isPublic: $( '#inp_public' ).is( ':checked' )
			$.post '/service/webhooks/create', data
				.done ( data ) ->
					updateWebhookList()
					fShowWebhookUsage data.hookid, data.hookname
				.fail ( err ) ->
					if err.status is 409
						failedRequest( 'Webhook Event Name already existing!' ) err
					else
						failedRequest( 'Unable to create Webhook! ' + err.message ) err
	
	$( '#table_webhooks' ).on 'click', '.del', () ->
		if confirm  "Do you really want to delete this webhook?"
			$.post( '/service/webhooks/delete/'+$(this).attr('data-id') )
				.done () ->
					$( '#display_hookurl *' ).remove()
					main.setInfo true, 'Webhook deleted!'
					updateWebhookList()
				.fail (err) ->
					failedRequest(err.responseText) err

window.addEventListener 'load', fOnLoad, true
