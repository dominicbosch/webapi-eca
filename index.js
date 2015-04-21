var cp = require( 'child_process' );
var arrArgs = [
	"-w", "8080",
	"-d", "6379",
	"-m", "productive",
	"-i", "info",
	"-f", "warn"
];
cp.fork( './dist/js/webapi-eca', arrArgs );
