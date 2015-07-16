'use strict';

# Fetch the search string and transform it into a global object for easy access
arrParams = window.location.search.substring(1).split '&'
oParams = {}
for param in arrParams
	arrKV = param.split '='
	oParams[ arrKV[ 0 ] ] = arrKV[ 1 ]

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
		# col = if isSuccess then 'rgba(20,80,0,1)' else 'rgba(150,50,50,1)'
		# d3.select('#skeletonTicker').text(msg).transition().duration(300).style 'background-color', col
		$( '#skeletonTicker' ).text msg
		$( '#skeletonTicker' ).attr 'class', if isSuccess then 'success' else 'error'
		window.scrollTo 0, 0

	clearInfo: () ->
		$( '#skeletonTicker' ).text ''
		$( '#skeletonTicker' ).attr 'class', ''
		# d3.select('#skeletonTicker').text('').transition().duration(300).style 'background-color', 'rgba(0,0,0,0)'

	registerHoverInfo: ( el, file ) ->
		hoverOut = () ->
			$( this ).removeClass 'hovered'
			checkHover = () ->
				if not $( '#tooltip' ).hasClass( 'hovered' ) and not el.hasClass 'hovered'
					$( '#tooltip' ).fadeOut()
			setTimeout checkHover, 0
			
		$.get '/help/' + file, (html) ->
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