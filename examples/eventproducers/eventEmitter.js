var webhook, interval,
	needle = require( 'needle' );

if( process.argv.length < 4 ) {
	console.log( 'USAGE: nodejs eventEmitter.js [interval in seconds] [webhook]' );
	// console.log( 'Please provide an interval in seconds as an argument!' );
	return;
}

interval = parseInt( process.argv[ 2 ] ) || 60;
console.log( 'Interval set to ' + interval + ' seconds' );
webhook = process.argv[ 3 ];
console.log( 'Webhook will be: ' + webhook );

function processServerAnswer( err, resp, body ) {
	if ( err ) console.error( err );
}

function emitEventOverWebhook() {
	var evt = {
		sourceEmitTime: (new Date()).getTime()
	};
	console.log( 'Emitting event: ' + evt.sourceEmitTime );
	needle.post( webhook, evt, processServerAnswer );
}

setInterval( emitEventOverWebhook, interval * 1000 );