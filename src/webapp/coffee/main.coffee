'use strict';

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

window.main =
	setInfo: ( isSuccess, msg ) ->
		$( '#skeletonTicker' ).text msg
		$( '#skeletonTicker' ).attr 'class', if isSuccess then 'success' else 'error'
		window.scrollTo 0, 0

	clearInfo: () ->
		$( '#skeletonTicker' ).text ''
		$( '#skeletonTicker' ).attr 'class', ''

	registerHoverInfo: ( el, file ) ->
		hoverOut = () ->
			$( this ).removeClass 'hovered'
			checkHover = () ->
				if not $( '#tooltip' ).hasClass( 'hovered' ) and not el.hasClass 'hovered'
					$( '#tooltip' ).fadeOut()
			setTimeout checkHover, 0
			
		$.get '/help/' + file, ( html ) ->
			info = $( '<img>' )
				.attr( 'src', '/images/info.png' )
				.attr( 'class', 'infoimg' )
				.mouseleave hoverOut
				.mouseenter ( e ) ->
					$( this ).addClass 'hovered'
					$( '#tooltip' ).html( html )
						.css( 'top', e.target.offsetTop + e.target.height - 20 )
						.css( 'left', e.target.offsetLeft + (e.target.width / 2) - 20 )
						.fadeIn()
						.mouseleave hoverOut
						.mouseenter () ->
							$( this ).addClass 'hovered'

			el.append( info );