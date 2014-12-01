$( document ).ready(function() {
	var dialog = window.dialog = (function() {
		var pubFuncs = {},
			el = $( '.dialog' );

		return {
			show: function( title, text, cb ) {
				el.css( 'visibility', 'visible' );
				$( 'h3', el ).text( title );
				$( 'p', el ).text( text );
				// Remove previous click listener(s):
				$( 'button', el ).unbind( 'click' );
				// Add new click listener:
				$( 'button', el ).click(function() {
					el.css( 'visibility', 'hidden' );
					cb();
				});
			}
		}
	})();
});