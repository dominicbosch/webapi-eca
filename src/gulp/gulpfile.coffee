###

GULP FILE
=========

Type `gulp` in command line to get option list.

###


# fs = require 'fs'
# groc = require 'groc'
argv = require( 'yargs' ).argv
gulp = require 'gulp'
clean = require 'gulp-clean'
# gulpif = require 'gulp-if'
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
nodemon = require 'gulp-nodemon'

dirSource = 'src/'
dirLib = 'lib/'
dirDist = 'dist/'

if argv.watch
  gutil.log ""
  gutil.log "#{ chalk.bgYellow "--> Press Ctrl/Cmd + C to stop watching!" }"
  gutil.log ""


fSimpleCoffeePipe = ( srcDir, dest ) ->
  stream = gulp.src srcDir
  fCoffeePipe( stream ).pipe gulp.dest dest
  if argv.watch
    stream = watch( srcDir ).pipe plumber
      errorHandler: fHandleError
    fCoffeePipe( stream ).pipe gulp.dest dest 


fCoffeePipe = ( stream ) ->
  stream = stream.pipe coffee bare: true
  if argv.productive
    stream = stream.pipe uglify()
  stream


# Error Handler in case the compiling fails, to avoid the breaking of the watch pipe
fHandleError = ( err ) ->
  gutil.beep()
  if err.stack
    msg = err.stack
  else
    msg = err.toString()
  gutil.log chalk.red msg


# Register gulp help as default task
gulphelp gulp,
  description: 'Displays this!'
  aliases: [ 'h', '?', '-h', '--help' ]
  afterPrintCallback: ( tasks ) ->
    console.log """
      #{ chalk.underline 'Additionally available arguments' } (apply wherever it makes sense)
      \ \ #{ chalk.yellow '--productive \t' }  Executes the task for the productive environment
      \ \ #{ chalk.yellow '--watch \t' }  Continuously executes the task on changes\n
    """

###
Compile the gulp file itself
###
gulp.task 'compile-gulpfile',
  'Compile GULP coffee file',
  ( cb ) ->
    fSimpleCoffeePipe dirSource + 'gulp/gulpfile.coffee', ''
    if not argv.watch then cb()

###
Clean everything up
###
gulp.task 'clean-engine',
  'Clean deployed engine resources',
  ( cb ) ->
    gulp.src( dirDist + 'js', read: false ).pipe clean()

gulp.task 'clean-webapp',
  'Clean deployed webapp resources',
  ( cb ) ->
    gulp.src( dirDist + 'webapp', read: false ).pipe clean()


###
Compile the engine's source code
###
gulp.task 'compile-engine',
  'Compile ENGINE coffee files in the project',
  [ 'clean-engine' ],
  ( cb ) ->
    fSimpleCoffeePipe dirSource + 'engine-coffee/*.coffee', dirDist + 'js'
    if not argv.watch then cb()


###
Compile web app code
###
gulp.task 'compile-webapp',
  'Compile WEBAPP coffee files in the project',
  [ 'clean-webapp' ],
  ( cb ) ->
    fSimpleCoffeePipe dirSource + 'webapp/coffee/*.coffee', dirDist + 'webpages/handlers/js'
    if not argv.watch then cb()

###
Compile all existing source code files
###
gulp.task 'compile-all',
  'Compile ALL coffee files in the project',
  [ 'compile-gulpfile', 'compile-webapp', 'compile-engine' ],
  ( cb ) ->
    if not argv.watch then cb()

###
Deploy the system into the dist folder
###
gulp.task 'deploy',
  'Deploy the system into the dist folder', 
  [ 'compile-engine', 'compile-webapp' ],
  ( cb ) ->
    # gulp.start 'compile-engine', 'compile-webapp'
    gulp.src( dirSource + 'webapp/static/**/*' )
      .pipe gulp.dest dirDist + 'webpages/public/'
    gulp.src( dirLib + 'cryptico.js' )
      .pipe( gulp.dest( dirDist + 'js' ) )
      .pipe gulp.dest dirDist + 'webpages/public/js'
    gulp.src( dirSource + 'webapp/handlers/**/*' )
      .pipe gulp.dest dirDist + 'webpages/handlers/'
    gulp.src( dirSource + 'config/*' )
      .pipe gulp.dest dirDist + 'config'
    # cb()


###
Run the system in the dist folder
###
gulp.task 'run-system',
  'Deploy the system into the dist folder', 
  [ 'deploy' ],
  ( cb ) ->
    nodemon
      script: dirDist + 'js/webapi-eca.js'

























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
