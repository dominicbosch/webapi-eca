
/*
 * # docco Documentation
 * Create the documentation to be displayed through the webserver.
 */
// var glob = require("glob"),
    // docco = require('docco'),
    // opt = ["", "", "--output", "webpages/doc"],
    // files = [
      // "README.md",
      // "LICENSE.md",
      // "create_doc.js",
      // "coffee/*.coffee",
      // "mod_actions/**/*.js",
      // "mod_events/**/*.js"
    // ];
// 
// var semaphore = files.length;
// for(var i = 0; i < files.length; i++) {
  // glob(files[i], null, function (er, files) {
    // if(!er) {
      // opt = opt.concat(files);
    // } else {
      // console.error(er);
    // }
    // if(--semaphore === 0) {
      // docco.run(opt);
    // }
  // });
// }

/*
 * # groc Documentation
 * Create the documentation to be displayed through the webserver.
 */
// 
require('groc').CLI(
  [
    "README.md",
    "LICENSE.md",
    "coffee/*.coffee",
    "mod_actions/**/*.js",
    "mod_events/**/*.js",
    "-o./webpages/doc"
  ],
  function(err) {
    if (err) console.error(err);
    else console.log('Done!');
  }
);
