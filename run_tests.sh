#!/usr/bin/env node
process.chdir(__dirname);
var fs = require('fs');
var path = require('path');
var args = process.argv.slice(2);
if( args[0] !== undefined ) {
	var fl = path.join('testing', args[0]);
	if (fs.existsSync(fl)) {
		require('nodeunit').reporters.default.run([fl]);
	} else {
		console.error('File not found!!');
	}
} else {
	require('nodeunit').reporters.default.run(['testing']);	
}
