'use strict';

window.addEventListener('load', function() {
	document.title = 'Error!';
	$('#pagetitle').text('Hi {{{user.username}}}, there has been an error!');
	$('#info').text('Error: {{{message}}}');
	$('#info').attr('class', 'error');

}, true);
