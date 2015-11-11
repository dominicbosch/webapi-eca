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
	#  Needed to get thoroughly rid of jQuery... But it seems jQuery is convenient for ajax calls
	# post: (url, obj, cb) ->
	# 	d3.xhr(url)
	# 		.header('Content-Type', 'application/json')
	# 		.mimeType('application/json')
	# 		.post(JSON.stringify(obj))
	# 		.on 'load', (msg) -> cb(null, msg.responseText)
	# 		.on 'error', (err) -> cb(err.responseText)


	requestError: (cb) ->
		(err) ->
			if err.status is 401
				window.location.href = "/"
			else
				cb(err)

	setInfo: ( isSuccess, msg ) ->
		d3.select('#skeletonTicker')
			.classed 'success', isSuccess
			.classed 'error', not isSuccess
			.text msg
		window.scrollTo 0, 0

	clearInfo: () ->
		d3.select('#skeletonTicker')
			.classed 'success', false
			.classed 'error', false
			.text ''

	registerHoverInfoHTML: ( d3El, html ) ->
		hoverOut = () ->
			d3.select(this).classed('hovered', false);
			checkHover = () ->
				if not d3.select('#tooltip').classed('hovered') and not d3El.classed('hovered')
					d3.select('#tooltip').transition().style('opacity', 0)
			setTimeout checkHover, 0
		
		d3El.append('img')
			.classed('infoimg', true)
			.on('mouseleave', hoverOut)
			.on 'mouseenter', () ->
				et = d3.event.target.getBoundingClientRect();
				d3.select(this).classed('hovered', true);
				d3.select('#tooltip').html(html)
					.style({
						top: (et.top+et.height-20)+'px',
						left: (et.left+(et.width/2)-20)+'px',
						opacity: 1
					})
					.on('mouseleave', hoverOut)
					.on 'mouseenter', () ->
						d3.select('#tooltip').classed 'hovered', true
					.transition().style('opacity', 1)

	registerHoverInfo: ( el, file ) ->
		$.get '/help/' + file, (html) ->
			main.registerHoverInfoHTML(el, html)


