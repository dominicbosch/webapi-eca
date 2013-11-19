/*
 * # groc Documentation
 * Create the documentation to be displayed through the webserver.
 */  
require('groc').CLI(
  [
    "README.md",
    "TODO.js",
    "LICENSE.js",
    "js-coffee/*",
    "mod_actions/**/*.js",
    "mod_events/**/*.js",
    "-o./webpages/doc"
  ],
  function(err) {
    if (err) console.error(err);
    else console.log('Done!');
  }
);
