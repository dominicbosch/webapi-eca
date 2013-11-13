/*
 * # groc Documentation
 * Create the documentation to be displayed through the webserver.
 */
require('groc').CLI([
  "README.md",
  "TODO.js",
  "LICENSE.js",
  "js/*",
  "mod_actions/**/*.js",
  "mod_events/**/*.js"
  // ,
  // "rules/*.json"
  ],
  function(error) {
    if (error) {
      process.exit(1);
    }
  }
);
