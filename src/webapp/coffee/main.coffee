$( document ).ready () ->
	url = window.location.href
	els =  $( 'ul.nav a' ).filter () ->
		this.href is url
	elSelected = $( '<span>' ).attr( 'class', 'sr-only' ).text '(current)'
	els.append( elSelected ).parent().addClass 'active'

	$( '#skeletonLogout' ).click () ->
		$.post '/service/session/logout', () ->
			main.setInfo true, 'Goodbye!'
			redirect = () ->
				window.location.href = '/'
			setTimeout redirect, 500

hoverIn = ( html ) ->
	( e ) ->
		$( '#tooltip' ).html( html ).fadeIn()
			.css( 'top', e.target.offsetTop + e.target.height )
			.css( 'left', e.target.offsetLeft + e.target.width / 2 )

hoverOut = ( e ) ->
	$( '#tooltip' ).fadeOut()

window.main =
	setInfo: ( isSuccess, msg ) ->
		$( '#skeletonTicker' ).text msg
		$( '#skeletonTicker' ).attr 'class', if isSuccess then 'success' else 'error'
		window.scrollTo 0, 0

	clearInfo: () ->
		$( '#skeletonTicker' ).text ''
		$( '#skeletonTicker' ).attr 'class', ''

	registerHoverInfo: ( el, file ) ->
		$.get '/help/' + file, ( html ) ->
			info = $( '<img>' )
				.attr( 'src', '/images/info.png' )
				.attr( 'class', 'infoimg' )
				.hover hoverIn( html ), hoverOut
			el.append( info );