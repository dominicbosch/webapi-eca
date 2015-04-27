$( document ).ready(function() {
	var url = window.location.href;
	$( 'ul.nav a' ).filter(function() {
		return this.href === url;
	}).append( $( '<span>' ).attr( 'class', 'sr-only' ).text( '(current)' ) ).parent().addClass( 'active' );
});