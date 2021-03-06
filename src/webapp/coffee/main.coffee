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
		main.post('/service/session/logout').done () ->
			main.setInfo true, 'Goodbye!'
			redirect = () ->
				window.location.href = '/'
			setTimeout redirect, 500

window.main =
	#  Needed to get thoroughly rid of jQuery... But it seems jQuery is convenient for ajax calls
	post: (url, obj) ->
		obj = if obj then JSON.stringify(obj)
		$.ajax
			type: 'POST'
			url: url
			data: obj
			contentType: 'application/json'
			# dataType: 'json'

		# General redirection handler in case user was not logged in
		.fail (err) -> 
			if err.status is 401
				window.location.href = '/views/login'

		# d3.xhr(url)
		# 	.header('Content-Type', 'application/json')
		# 	.mimeType('application/json')
		# 	.post(JSON.stringify(obj))
		# 	.on 'load', (msg) -> cb(null, msg.responseText)
		# 	.on 'error', (err) -> cb(err.responseText)

	setInfo: ( isSuccess, msg, goTop ) ->
		d3.select('#skeletonTicker')
			.classed 'success', isSuccess
			.classed 'error', not isSuccess
			.text msg
		if goTop then window.scrollTo 0, 0

	clearInfo: (goTop) ->
		d3.select('#skeletonTicker')
			.classed 'success', false
			.classed 'error', false
			.text ''
		if goTop then window.scrollTo 0, 0


	registerHoverInfoHTML: (d3El, html) ->
		checkLeave = () ->
			if not d3Div.classed('hovered') and not d3Img.classed('hovered')
				d3Div.transition().style('opacity', 0).each 'end', () ->
					d3Div.style('visibility', 'hidden')

		d3Img = d3El.append('img')
			.classed('info icon', true)
			.attr('src', '/images/info.png')
			.on 'mouseenter', () ->
				pos = $(this).offset().left;
				width = $(d3Div.node()).width()+20;
				if(pos+width > window.innerWidth)
					if(pos-width < 0)
						d3Div.style('left', 'auto').style('right', 'auto').style('top', '17px')
					else
						d3Div.style('left', 'auto').style('right', '10px')
				else d3Div.style('left', '-7px').style('right', 'auto')
				d3Img.classed('hovered', true)
				d3Div.style('visibility', 'visible')
					.transition().style('opacity', 1)
			.on 'mouseleave', () ->
				d3Img.classed 'hovered', false
				setTimeout checkLeave, 0

		d3Div = d3El.append('span').classed('mytooltip', true).append('div')
			.on 'mouseenter', () ->
				d3Div.classed 'hovered', true
			.on 'mouseleave', () -> 
				d3Div.classed 'hovered', false
				setTimeout checkLeave, 0
			.html(html);

	registerHoverInfo: ( el, file ) ->
		$.get '/help/' + file, (html) ->
			main.registerHoverInfoHTML(el, html)


