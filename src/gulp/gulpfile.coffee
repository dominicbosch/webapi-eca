###

GULP FILE
=========

Type `gulp` in command line to get option list.

###


fs = require 'fs'
path = require 'path'
# groc = require 'groc'
argv = require('yargs').argv
del = require 'del'
gulp = require 'gulp'
plumber = require 'gulp-plumber'
gutil = require 'gulp-util'
chalk = gutil.colors
gulphelp = require 'gulp-help'
debug = require 'gulp-debug'
uglify = require 'gulp-uglify'
coffee = require 'gulp-coffee'
watch = require 'gulp-watch'
nodemon = require 'gulp-nodemon'
nodeunit = require 'nodeunit'
cp = require 'child_process'
bunyan = require 'bunyan'

if argv.watch
	gutil.log ""
	gutil.log "#{ chalk.bgYellow "--> Press Ctrl/Cmd + C to stop watching!" }"
	gutil.log ""


fSimpleCoffeePipe = (task, dirSrc, dirDest) ->
	# If user wants to watch, we add the watch ahndler
	if argv.watch
		gutil.log chalk.yellow "Adding Coffee watch for compilation from \"#{ dirSrc }\" to \"#{ dirDest }\""
		stream = watch(dirSrc).pipe(plumber errorHandler: fHandleError)
			.pipe debug title: 'Change detected in (' + task + '): '
	else
		gutil.log chalk.green "Compiling Coffee from \"#{ dirSrc }\" to \"#{ dirDest }\""
		# start a source files stream without watch
		stream = gulp.src(dirSrc).pipe debug title: 'Compiling (' + task + '): '

	# Pipe the result through CoffeeScript
	stream = stream.pipe coffee bare: true

	# If the user wants a productive result, we uglify the JavaScript
	if argv.productive
		stream = stream.pipe uglify()

	# Finally place the result in the destination directory
	stream.pipe gulp.dest dirDest 

# Error Handler in case the compiling fails, to avoid the breaking of the watch pipe
fHandleError = (err) ->
	gutil.beep()
	if err.stack
		msg = err.stack
	else
		msg = err.toString()
	gutil.log chalk.red msg


# Register gulp help as default task
gulphelp gulp,
	description: 'You are looking at it!'
	aliases: [ 'h', '?', '-h', '--help' ]
	afterPrintCallback: (tasks) ->
		console.log """
			#{ chalk.underline 'Additionally available argument' } (apply wherever it makes sense)
			\ \ #{ chalk.yellow '--productive \t' }  Executes the task for the productive environment
			\ \ #{ chalk.yellow '--watch \t' }  Continuously executes the task on changes\n
		"""

paths =
	lib: 'lib/'
	src: 'src/'
	srcGulp: 'src/gulp/gulpfile.coffee'
	srcEngineCoffee: 'src/engine-coffee/**/*.coffee'
	srcWebAppCoffee: 'src/webapp/coffee/*.coffee'
	dist: 'dist/'
	distEngine: 'dist/js'
	distWebApp: 'dist/webapp'


gulp.task 'compile-gulp', 'Compile GULP coffee file', (cb) ->
	fSimpleCoffeePipe 'compile-gulpfile', paths.srcGulp, './'
	cb()

gulp.task 'clean', 'Cleanup previously deployed distribution', (cb) ->
	del(paths.dist).then cb

gulp.task 'compile', 'Compile the system\'s coffee files in the project', (cb) ->
	compile = () ->
		streamOne = fSimpleCoffeePipe 'compile-engine', paths.srcEngineCoffee, paths.distEngine
		streamTwo = fSimpleCoffeePipe 'compile-webapp', paths.srcWebAppCoffee, paths.distWebApp+'/js'
		cb()

	if argv.watch
		compile()
	else
		gutil.log chalk.red "Deleting folder \"#{ paths.dist }\""
		del(paths.dist).then compile
	null

gulp.task 'deploy', 'Deploy all system resources into the distribution folder', [ 'compile' ], (cb) ->
	semaphore = 5
	isComplete = () ->
		if --semaphore is 0
			cb()
	fetchStream = (srcGlob) ->
		# If user wants to watch, we add the watch handler
		if argv.watch
			gutil.log chalk.yellow 'Adding watch for "' + srcGlob + '"'
			stream = watch(srcGlob).pipe(plumber errorHandler: fHandleError)
				.pipe debug title: 'Redeploying: '
		else
			# start a source files stream without watch
			gutil.log chalk.green 'Deploying "' + srcGlob + '"'
			stream = gulp.src(srcGlob)
				.pipe debug title: 'Deploying: '
		stream

	fetchStream(paths.src + 'engine-js/**/*')
		.pipe(gulp.dest paths.distEngine)
		.on 'end', isComplete
	fetchStream(paths.src + 'webapp/static/**/*')
		.pipe(gulp.dest paths.distWebApp)
		.on 'end', isComplete
	fetchStream(paths.src + 'webapp/views/**/*')
		.pipe(gulp.dest paths.distEngine + '/views/')
		.on 'end', isComplete
	fetchStream(paths.lib + '*')
		.pipe(gulp.dest paths.distEngine)
		.pipe(gulp.dest paths.distWebApp+'/js/lib')
		.on 'end', isComplete
	fetchStream(paths.src + 'config/*')
		.pipe(gulp.dest paths.dist + 'config')
		.on 'end', isComplete
	if argv.watch
		cb()
	null

gulp.task 'develop', 
	'Run the system in the dist folder and restart when files change in the folders', 
	[ 'compile-gulp', 'deploy' ],
	() ->
		gutil.log chalk.bgGreen 'STARTING UP the System for development!!!'
		if not argv.watch
			gutil.log chalk.bgYellow '... Maybe you want to execute this task with the "--watch" flag!'
		nodemon
			script: paths.dist + 'js/webapi-eca.js'
			watch: [ 'dist/js' ]
			ext: 'js'
			stdout: false
		.on 'readable', () ->
			bun = cp.spawn './node_modules/bunyan/bin/bunyan', [], stdio: [ 'pipe', process.stdout, process.stderr ]
			this.stdout.pipe bun.stdin
			# this.stdout.pipe fs.createWriteStream 'devel_output.txt'
			# this.stderr.pipe fs.createWriteStream 'devel_err.txt'
			this.stderr.pipe gutil.buffer (err, files) ->
				gutil.log chalk.bgRed files.join '\n'


gulp.task 'start', 'Run the system in the dist folder', [ 'deploy' ], () ->
	gutil.log chalk.bgGreen 'STARTING UP the System!!!'
	if argv.watch
		gutil.log chalk.bgYellow """The system will not be restarted when files change! 
			The changes will only be deployed"""
	if argv.productive
		arrArgs = [
			'./dist/js/webapi-eca',
			"-w", "8080",
			"-d", "6379",
			"-m", "productive",
			"-i", "error",
			"-f", "warn"
		]
	else
		arrArgs = [
			'./dist/js/webapi-eca',
			"-w", "8080",
			"-d", "6379",
			"-m", "development",
			"-i", "info",
			"-f", "warn",
			"-t", "on"
		]

	eca = cp.spawn 'node', arrArgs
	bun = cp.spawn './node_modules/bunyan/bin/bunyan', [], stdio: [ 'pipe', process.stdout, process.stderr ]
	eca.stdout.pipe bun.stdin


###
Unit TESTS!
###
# gulp.task 'test', 'Run unit tests', (cb) ->
# 	process.chdir __dirname
# 	global.pathToEngine = path.resolve __dirname, 'dist', 'js'
# 	db = require path.join global.pathToEngine, 'persistence'
# 	cs = require 'coffee-script'
# 	fEnd = () ->
# 		console.log """Shutting down DB from unit_test.sh script. 
# 			This might take as long as the event poller loop delay is..."""
# 		db.shutDown()
		 
# 	cs.register?()
	
# 	if gutil.env.testfile
# 		fl = path.resolve gutil.env.testfile
# 		if fs.existsSync fl
# 			nodeunit.reporters.default.run [ fl ], null, fEnd
# 		else
# 			console.error 'File not found!!'
# 	else
# 		nodeunit.reporters.default.run [ 'src/unittests' ], null, fEnd



# /*
#  * groc Documentation
#  * Create the documentation to be displayed through the webserver.
#  */
# gulp.task('doc', function(cb) {
#   console.log('Generating Documentation...');
#   groc.CLI(
#     [
#     "README.md",
#     "LICENSE.md",
#     "coffee/*.coffee",
#     "examples/*/**",
#     "-o./webpages/public/doc"
#     ],
#     function(err) {
#     if (err) console.error(err);
#     else console.log('Done!');
#     cb();
#     }
#  );
# });
