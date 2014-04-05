#!/usr/bin/env node
process.chdir( __dirname );
var fs = require( 'fs' ),
  path = require( 'path' ),
  nodeunit = require( 'nodeunit' ),
  db = require( './js-coffee/persistence' ),
  args = process.argv.slice( 2 ),
  fEnd = function() {
    console.log( 'Shutting down DB from unit_test.sh script...' );
    db.shutDown();
  };
   
if( args[ 0 ] !== undefined ) {
  var fl = path.resolve( args[ 0 ] );
  if ( fs.existsSync( fl ) ) {
    nodeunit.reporters.default.run( [ fl ], null, fEnd );
  } else {
    console.error( 'File not found!!' );
  }
} else {
  nodeunit.reporters.default.run( [ 'testing' ], null, fEnd );
}
