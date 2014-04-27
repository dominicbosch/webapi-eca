# Fetch the search string and transform it into an object for easy access
arrParams = window.location.search.substring(1).split '&'
oParams = {}
for param in arrParams
	arrKV = param.split '='
	oParams[ arrKV[ 0 ] ] = arrKV[ 1 ]

if oParams.id
	oParams.id = decodeURIComponent oParams.id

hostUrl = [ location.protocol, '//', location.host ].join ''

fClearInfo = () ->
	$( '#info' ).text ''
	$( '#info' ).attr 'class', 'neutral'

fDisplayError = ( msg ) ->
	window.scrollTo 0, 0
	$( '#info' ).text "Error: #{ msg }"
	$( '#info' ).attr 'class', 'error'


fIssueRequest = ( args ) ->
	fClearInfo()
	$.post( '/usercommand', args.body )
		.done args.done
		.fail args.fail


fFailedRequest = ( msg ) ->
	( err ) ->
		if err.status is 401
			window.location.href = 'forge?page=forge_rule'
		else
			fDisplayError msg


fUpdateWebhookList = ( cb ) ->
	fIssueRequest
		body: 
			command: 'get_all_webhooks'
		done: fProcessWebhookList cb
		fail: fFailedRequest 'Unable to get Webhook list'

fProcessWebhookList = ( cb ) ->
	( data ) ->
		$( '#table_webhooks *' ).remove()
		if data.message
			oHooks = JSON.parse data.message
			$( '#table_webhooks' ).append $( '<h3>' ).text 'Your existing Webhooks:'
			for hookid, hookname of oHooks
				tr = $( '<tr>' )
				tdName = $( '<div>' ).text hookname
				tdUrl = $( '<input>' ).attr( 'style', 'width:600px' ).val "#{ hostUrl }/webhooks/#{ hookid }"
				img = $( '<img>' ).attr( 'class', 'del' )
					.attr( 'title', 'Delete Module' ).attr 'src', 'red_cross_small.png'
				tr.append( $( '<td>' ).append img )
				tr.append( $( '<td>' ).attr( 'style', 'padding-left:10px' ).append tdName )
				tr.append( $( '<td>' ).attr( 'style', 'padding-left:10px' ).append tdUrl )
				$( '#table_webhooks' ).append tr
		else
			fShowWebhookUsage null
		cb? hookid, hookname

fShowWebhookUsage = ( hookid, hookname ) ->
	$( '#display_hookurl *' ).remove()
	if hookid
		b = $( '<b>' ).text "This is the Webhook Url you can use for your Events '#{ hookname }' : "
		$( '#display_hookurl' ).append b
		$( '#display_hookurl' ).append $('<br>')
		inp = $('<input>').attr( 'type', 'text' ).attr( 'style', 'width:600px' )
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

	document.title = 'Create Webhooks!'
	# Load existing Webhooks
	fUpdateWebhookList fShowWebhookUsage

	# Register button action
	$( '#but_submit' ).click ->
		fClearInfo()

		hookname = $( '#inp_hookname' ).val()
		if hookname is ''
			fDisplayError 'Please provide an Event Name for your new Webhook!'

		else
			# $( '#display_hookurl *' ).remove()
			fIssueRequest
				body: 
					command: 'create_webhook'
					body: JSON.stringify
						hookname: hookname
				done: ( data ) ->
					oAnsw = JSON.parse data.message
					fShowWebhookUsage oAnsw.hookid, oAnsw.hookname
					fUpdateWebhookList ( data ) ->
						$( '#info' ).text "New Webhook successfully created!"
						$( '#info' ).attr 'class', 'success'
				fail: ( err ) ->
					if err.status is 409
						fFailedRequest( 'Webhook Event Name already existing!' ) err
					else
						fFailedRequest( 'Unable to create Webhook! ' + err.message ) err
	
	$( '#table_webhooks' ).on 'click', 'img', () ->
		if confirm  "Do you really want to delete this webhook?"
			url = $( 'input', $( this ).closest( 'tr' ) ).val()
			arrUrl = url.split '/'
			fIssueRequest
				body: 
					command: 'delete_webhook'
					body: JSON.stringify
						hookid: arrUrl[ arrUrl.length - 1 ]

				done: ( data ) ->
					fUpdateWebhookList ( data ) ->
						$( '#info' ).text 'Webhook deleted!'
						$( '#info' ).attr 'class', 'success'

				fail: ( err ) ->
					fFailedRequest( 'Unable to delete Webhook!' ) err

window.addEventListener 'load', fOnLoad, true
