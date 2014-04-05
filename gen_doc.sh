#!/usr/bin/env node
/*
 * # groc Documentation
 * Create the documentation to be displayed through the webserver.
 */
// 
require( 'groc' ).CLI(
  [
    "README.md",
    "LICENSE.md",
    "coffee/*.coffee",
    "-o./webpages/public/doc"
  ],
  function( err ) {
    if ( err ) console.error( err );
    else console.log( 'Done!' );
  }
);
