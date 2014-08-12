###

GULP FILE
=========

Type `gulp` in command line to get option list.

###


# fs = require 'fs'
# groc = require 'groc'
gulp = require 'gulp'
plumber = require 'gulp-plumber'
gutil = require 'gulp-util'
chalk = gutil.colors
gulphelp = require 'gulp-help'
# minifyHtml = require 'gulp-minify-html'
# minifyCss = require 'gulp-minify-css'
uglify = require 'gulp-uglify'
coffee = require 'gulp-coffee'
# less = require 'gulp-less'
# sass = require 'gulp-sass'
# jshint = require 'gulp-jshint'
# coffeelint = require 'gulp-coffeelint'
# concat = require 'gulp-concat'
# header = require 'gulp-header'
watch = require 'gulp-watch'
dirTesting = 'builds/testing/'
dirProductive = 'builds/productive/'
msgCmdC = '\n\n\n --> Press Ctrl/Cmd + C to stop watching!\n\n'

# Register gulp help as default task
gulphelp gulp,
  description: 'Displays this!'
  aliases: [ 'h', '?', '-h', '--help' ]

gulp.task 'default', [ 'help' ], () ->
  # gutil.log chalk.yellow 'do you require a default task?'

coffeeStream = coffee bare: true
fHandleError = ( err ) ->
  gutil.beep()
  if err.stack
    msg = err.stack
  else
    msg = err.toString()
  gutil.log chalk.red msg

###
Compile the gulp file itself
###
fCompileGulpFile = ( doWatch ) ->
  stream = gulp.src( 'gulpfile.coffee' )
    .pipe( plumber errorHandler: fHandleError )
  if doWatch then stream = stream.pipe( watch() )
  stream.pipe( coffeeStream )
    .pipe( uglify() )
    .pipe( gulp.dest '' )

# For debugging purposes we do not directly use coffee files to run either gulp or any part of the actual product
gulp.task 'gulpfile-compile', 'Compile Gulp File', () ->
  gutil.log chalk.yellow gulp.tasks[ 'gulpfile-compile' ].help.message
  fCompileGulpFile false

gulp.task 'gulpfile-compile-watch', 'Continously compile Gulp File when it changes', () ->
  gutil.log chalk.yellow gulp.tasks[ 'gulpfile-compile-watch' ].help.message + msgCmdC
  fCompileGulpFile true

###
Compile the engine's source code
###
fCompileEngine = ( doWatch ) ->
  stream = gulp.src( 'src/engine-coffee/*.coffee' )
    .pipe( plumber errorHandler: fHandleError )
  if doWatch then stream = stream.pipe( watch() )
  stream.pipe( coffeeStream )
    .pipe( gulp.dest dirTesting + 'js' )
    .pipe( uglify() )
    .pipe( gulp.dest dirProductive + 'js' )

gulp.task 'engine-compile', 'One-time compiling of ENGINE coffee files', () ->
  gutil.log chalk.yellow gulp.tasks[ 'engine-compile' ].help.message
  fCompileEngine false

gulp.task 'engine-compile-watch', 'Start watching for ENGINE coffee file changes and compile them', ( cb ) ->
  gutil.log chalk.yellow gulp.tasks[ 'engine-compile-watch' ].help.message + msgCmdC
  fCompileEngine true


###
Compile web app code
###
fCompileWebapp = ( doWatch ) ->
  stream = gulp.src( 'src/engine-coffee/*.coffee' )
    .pipe( plumber errorHandler: fHandleError )
  if doWatch then stream = stream.pipe( watch() )
  stream.pipe( coffeeStream )
    .pipe( gulp.dest dirTesting + 'js' )
    .pipe( uglify() )
    .pipe( gulp.dest dirProductive + 'js' )

gulp.task 'webapp-compile', 'One-time compiling of WEBAPP coffee files', () ->
  gutil.log chalk.yellow gulp.tasks[ 'all-compile' ].help.message
  fCompileWebapp false

gulp.task 'webapp-compile-watch', 'Start watching for WEBAPP coffee file changes and compile them', ( cb ) ->
  gutil.log chalk.yellow gulp.tasks[ 'all-compile-watch' ].help.message + msgCmdC
  fCompileWebapp true

###
Compile all existing source code files
###
gulp.task 'all-compile', 'One-time compiling of ALL coffee files', () ->
  gutil.log chalk.yellow gulp.tasks[ 'all-compile' ].help.message
  fCompileGulpFile false
  fCompileEngine false
  fCompileWebapp false

gulp.task 'all-compile-watch', 'Start watching for ALL coffee file changes and compile them', ( cb ) ->
  gutil.log chalk.yellow gulp.tasks[ 'all-compile-watch' ].help.message + msgCmdC
  fCompileGulpFile true
  fCompileEngine true
  fCompileWebapp true


















# # Compile pagescripts
# DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# echo "Started listening on file changes to compile them!..."
# coffee -wc -o $DIR/webpages/handlers/js $DIR/webpages/handlers/coffee

# gulp.task( 'watch-coffeescript', function () {
#   watch({glob: './CoffeeScript/*.coffee'}, function (files) { // watch any changes on coffee files
#     gulp.start( 'compile-coffee' ); // run the compile task
#   });
# });

# gulp.task( 'minify-html', function () {
#   gulp.src( './Html/*.html' ) // path to your files
#   .pipe(minifyHtml())
#   .pipe(gulp.dest( 'path/to/destination' ));
# });
 
# // task
# gulp.task( 'minify-css', function () {
#   gulp.src( './Css/one.css' ) // path to your file
#   .pipe(minifyCss())
#   .pipe(gulp.dest( 'path/to/destination' ));
# });
 
# // task
# gulp.task( 'minify-js', function () {
#   gulp.src( './JavaScript/*.js' ) // path to your files
#   .pipe(uglify())
#   .pipe(gulp.dest( 'path/to/destination' ));
# });
 
# // task
# gulp.task( 'compile-coffee', function () {
#   gulp.src( './CoffeeScript/one.coffee' ) // path to your file
#   .pipe(coffee())
#   .pipe(gulp.dest( 'path/to/destination' ));
# });
 
# // task
# gulp.task( 'compile-less', function () {
#   gulp.src( './Less/one.less' ) // path to your file
#   .pipe(less())
#   .pipe(gulp.dest( 'path/to/destination' ));
# });
 
# // task
# gulp.task( 'compile-sass', function () {
#   gulp.src( './Sass/one.sass' ) // path to your file
#   .pipe(sass())
#   .pipe(gulp.dest( 'path/to/destination' ));
# });
 
# // task
# gulp.task( 'jsLint', function () {
#   gulp.src( './JavaScript/*.js' ) // path to your files
#   .pipe(jshint())
#   .pipe(jshint.reporter()); // Dump results
# });
 
# // task
# gulp.task( 'coffeeLint', function () {
#   gulp.src( './CoffeeScript/*.coffee' ) // path to your files
#   .pipe(coffeelint())
#   .pipe(coffeelint.reporter());
# });
 
# // task
# gulp.task( 'concat', function () {
#   gulp.src( './JavaScript/*.js' ) // path to your files
#   .pipe(concat( 'concat.js' ))  // concat and name it 'concat.js'
#   .pipe(gulp.dest( 'path/to/destination' ));
# });
 
# // functions
 
# // Get copyright using NodeJs file system
# var getCopyright = function () {
#   return fs.readFileSync( 'Copyright' );
# };
 
# // task
# gulp.task( 'concat-copyright', function () {
#   gulp.src( './JavaScript/*.js' ) // path to your files
#   .pipe(concat( 'concat-copyright.js' )) // concat and name it 'concat-copyright.js'
#   .pipe(header(getCopyright()))
#   .pipe(gulp.dest( 'path/to/destination' ));
# });
 
# // Get version using NodeJs file system
# var getVersion = function () {
#   return fs.readFileSync( 'Version' );
# };
 
# // Get copyright using NodeJs file system
# var getCopyright = function () {
#   return fs.readFileSync( 'Copyright' );
# };
 
# // task
# gulp.task( 'concat-copyright-version', function () {
#   gulp.src( './JavaScript/*.js' )
#   .pipe(concat( 'concat-copyright-version.js' )) // concat and name it 'concat-copyright-version.js'
#   .pipe(header(getCopyrightVersion(), {version: getVersion()}))
#   .pipe(gulp.dest( 'path/to/destination' ));
# });

# // // including plugins
# // var gulp = require( 'gulp' )
# // , fs = require( 'fs' )
# // , coffeelint = require( 'gulp-coffeelint' )
# // , coffee = require( 'gulp-coffee' )
# // , uglify = require( 'gulp-uglify' )
# // , concat = require( 'gulp-concat' )
# // , header = require( 'gulp-header' );
 
# // // functions
 
# // // Get version using NodeJs file system
# // var getVersion = function () {
# //   return fs.readFileSync( 'Version' );
# // };
 
# // // Get copyright using NodeJs file system
# // var getCopyright = function () {
# //   return fs.readFileSync( 'Copyright' );
# // };
 
# // // task
# // gulp.task( 'bundle-one', function () {
# //   gulp.src( './CoffeeScript/*.coffee' ) // path to your files
# //   .pipe(coffeelint()) // lint files
# //   .pipe(coffeelint.reporter( 'fail' )) // make sure the task fails if not compliant
# //   .pipe(concat( 'bundleOne.js' )) // concat files
# //   .pipe(coffee()) // compile coffee
# //   .pipe(uglify()) // minify files
# //   .pipe(header(getCopyrightVersion(), {version: getVersion()})) // Add the copyright
# //   .pipe(gulp.dest( 'path/to/destination' ));
# // });


# Run server
# #!/bin/bash
# DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# nodejs $DIR/js/webapi-eca | $DIR/node_modules/bunyan/bin/bunyan


# /*
#  * groc Documentation
#  * Create the documentation to be displayed through the webserver.
#  */
# gulp.task( 'doc', function( cb ) {
#   console.log( 'Generating Documentation...' );
#   groc.CLI(
#     [
#     "README.md",
#     "LICENSE.md",
#     "coffee/*.coffee",
#     "examples/*/**",
#     "-o./webpages/public/doc"
#     ],
#     function( err ) {
#     if ( err ) console.error( err );
#     else console.log( 'Done!' );
#     cb();
#     }
#   );
# });


# Unit TESTS!
# #!/usr/bin/env nodejs
# process.chdir( __dirname );
# var fs = require( 'fs' ),
#   path = require( 'path' ),
#   nodeunit = require( 'nodeunit' ),
#   db = require( './js/persistence' ),
#   cs = require('coffee-script'),
#   args = process.argv.slice( 2 ),
#   fEnd = function() {
#     console.log( 'Shutting down DB from unit_test.sh script. '
#       +'This might take as long as the event poller loop delay is...' );
#     db.shutDown();
#   };
   
# if (cs.register) {
#   cs.register();
# }
# if( args[ 0 ] !== undefined ) {
#   var fl = path.resolve( args[ 0 ] );
#   if ( fs.existsSync( fl ) ) {
#     nodeunit.reporters.default.run( [ fl ], null, fEnd );
#   } else {
#     console.error( 'File not found!!' );
#   }
# } else {
#   nodeunit.reporters.default.run( [ 'testing' ], null, fEnd );
# }
