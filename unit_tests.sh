#!/usr/bin/env node
process.chdir( __dirname );
var fs = require( 'fs' );
var path = require( 'path' );
var nodeunit = require( 'nodeunit' );
var args = process.argv.slice( 2 );
if( args[ 0 ] !== undefined ) {
  var fl = path.resolve( args[ 0 ] );
  if ( fs.existsSync( fl ) ) {
    nodeunit.reporters.default.run( [ fl, 'testing/end-unittest' ] );
  } else {
    console.error( 'File not found!!' );
  }
} else {
  nodeunit.reporters.default.run( [ 'testing', 'testing/end-unittest' ] );  
}
