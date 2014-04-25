# Fetch the search string and transform it into an object for easy access
arrParams = window.location.search.substring(1).split '&'
oParams = {}
for param in arrParams
	arrKV = param.split '='
	oParams[ arrKV[ 0 ] ] = arrKV[ 1 ]

if oParams.id
	oParams.id = decodeURIComponent oParams.id

fDisplayError = ( msg ) ->
	window.scrollTo 0, 0
	$( '#info' ).text "Error: #{ msg }"
	$( '#info' ).attr 'class', 'error'

fIssueRequest = ( args ) ->
	$( '#info' ).text ''
	$.post( '/usercommand', args.body )
		.done args.done
		.fail args.fail

fFailedRequest = ( msg ) ->
	( err ) ->
		if err.status is 401
			window.location.href = 'forge?page=forge_rule'
		else
			fDisplayError msg

fUpdateWebhookList = ( data ) ->
	$( '#table_webhooks tr' ).remove()
	oHooks = JSON.parse data.message
	console.log oHooks
	for modName of oHooks
		tr = $ '<tr>'
		inp = $( '<div>' ).text modName
		img = $( '<img>' ).attr( 'class', 'del' )
			.attr( 'title', 'Delete Module' ).attr 'src', 'red_cross_small.png'
		tr.append( $( '<td>' ).append img )
		tr.append( $( '<td>' ).append inp )
		$( '#table_webhooks' ).append tr

fOnLoad = () ->

	document.title = 'Create Webhooks!'
	# Load existing rules

	fIssueRequest
		body: 
			command: 'get_all_webhooks'
		done: fUpdateWebhookList
		fail: fFailedRequest 'Unable to post get_all_webhooks request'

	# Register button action
	$( '#but_submit' ).click ->
		$( '#info' ).text ''

		hookname = $( '#inp_hookname' ).val()
		if hookname is ''
			fDisplayError 'Please provide a hookname!'

		else
			$( '#display_hookurl *' ).remove()
			fIssueRequest
				body: 
					command: 'create_webhook'
					body: JSON.stringify
						hookname: hookname
				done: ( data ) ->
					oAnsw = JSON.parse data.message
					url = [ location.protocol, '//', location.host ].join ''
					
					h3 = $( '<h3>' ).text "This is the Webhook Url you should use:"
					inp = $('<input>').attr( 'type', 'text' ).attr( 'style', 'font-size:1em' )
						.val "#{ url }/webhooks/#{ oAnsw.hookid }"
					h3.append inp
					$( '#display_hookurl' ).append h3
	
					div = $('<div>').html "Push your location via <a href=\"#{ url }/mobile/index.html?hookid=#{ oAnsw.hookid }\">this page</a>"
					$( '#display_hookurl' ).append div

				fail: ( err ) ->
					if err.status is 409
						fFailedRequest( 'Webhook Event Name already existing!' ) err
					else
						fFailedRequest( 'Unable to create Webhook! ' + err.message ) err
			
# <h3>This is the Webhook Url you should use:</h3>
# push your location via this page: mobile?hookid=
window.addEventListener 'load', fOnLoad, true
