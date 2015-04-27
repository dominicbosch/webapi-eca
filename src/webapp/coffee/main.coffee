$( document ).ready () ->
	url = window.location.href
	els =  $( 'ul.nav a' ).filter () ->
		this.href is url
	elSelected = $( '<span>' ).attr( 'class', 'sr-only' ).text '(current)'
	els.append( elSelected ).parent().addClass 'active'

window.main =
	setInfo: ( isSuccess, msg ) ->
		$( '#info' ).text msg
		$( '#info' ).attr 'class', if isSuccess then 'success' else 'error'
	clearInfo: () ->
		$( '#info' ).text ''
		$( '#info' ).attr 'class', ''