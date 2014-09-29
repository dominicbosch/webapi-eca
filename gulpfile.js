
/*

GULP FILE
=========

Type `gulp` in command line to get option list.
 */
var argv, chalk, clean, coffee, dirDist, dirLib, dirSource, fCoffeePipe, fHandleError, fSimpleCoffeePipe, gulp, gulphelp, gutil, nodemon, plumber, uglify, watch;

argv = require('yargs').argv;

gulp = require('gulp');

clean = require('gulp-clean');

plumber = require('gulp-plumber');

gutil = require('gulp-util');

chalk = gutil.colors;

gulphelp = require('gulp-help');

uglify = require('gulp-uglify');

coffee = require('gulp-coffee');

watch = require('gulp-watch');

nodemon = require('gulp-nodemon');

dirSource = 'src/';

dirLib = 'lib/';

dirDist = 'dist/';

if (argv.watch) {
  gutil.log("");
  gutil.log("" + (chalk.bgYellow("--> Press Ctrl/Cmd + C to stop watching!")));
  gutil.log("");
}

fSimpleCoffeePipe = function(srcDir, dest) {
  var stream;
  stream = gulp.src(srcDir);
  fCoffeePipe(stream).pipe(gulp.dest(dest));
  if (argv.watch) {
    stream = watch(srcDir).pipe(plumber({
      errorHandler: fHandleError
    }));
    return fCoffeePipe(stream).pipe(gulp.dest(dest));
  }
};

fCoffeePipe = function(stream) {
  stream = stream.pipe(coffee({
    bare: true
  }));
  if (argv.productive) {
    stream = stream.pipe(uglify());
  }
  return stream;
};

fHandleError = function(err) {
  var msg;
  gutil.beep();
  if (err.stack) {
    msg = err.stack;
  } else {
    msg = err.toString();
  }
  return gutil.log(chalk.red(msg));
};

gulphelp(gulp, {
  description: 'Displays this!',
  aliases: ['h', '?', '-h', '--help'],
  afterPrintCallback: function(tasks) {
    return console.log("" + (chalk.underline('Additionally available arguments')) + " (apply wherever it makes sense)\n\ \ " + (chalk.yellow('--productive \t')) + "  Executes the task for the productive environment\n\ \ " + (chalk.yellow('--watch \t')) + "  Continuously executes the task on changes\n");
  }
});


/*
Compile the gulp file itself
 */

gulp.task('compile-gulpfile', 'Compile GULP coffee file', function(cb) {
  fSimpleCoffeePipe(dirSource + 'gulp/gulpfile.coffee', '');
  if (!argv.watch) {
    return cb();
  }
});


/*
Clean everything up
 */

gulp.task('clean-engine', 'Clean deployed engine resources', function(cb) {
  return gulp.src(dirDist + 'js', {
    read: false
  }).pipe(clean());
});

gulp.task('clean-webapp', 'Clean deployed webapp resources', function(cb) {
  return gulp.src(dirDist + 'webapp', {
    read: false
  }).pipe(clean());
});


/*
Compile the engine's source code
 */

gulp.task('compile-engine', 'Compile ENGINE coffee files in the project', ['clean-engine'], function(cb) {
  fSimpleCoffeePipe(dirSource + 'engine-coffee/*.coffee', dirDist + 'js');
  if (!argv.watch) {
    return cb();
  }
});


/*
Compile web app code
 */

gulp.task('compile-webapp', 'Compile WEBAPP coffee files in the project', ['clean-webapp'], function(cb) {
  fSimpleCoffeePipe(dirSource + 'webapp/coffee/*.coffee', dirDist + 'webpages/handlers/js');
  if (!argv.watch) {
    return cb();
  }
});


/*
Compile all existing source code files
 */

gulp.task('compile-all', 'Compile ALL coffee files in the project', ['compile-gulpfile', 'compile-webapp', 'compile-engine'], function(cb) {
  if (!argv.watch) {
    return cb();
  }
});


/*
Deploy the system into the dist folder
 */

gulp.task('deploy', 'Deploy the system into the dist folder', ['compile-engine', 'compile-webapp'], function(cb) {
  gulp.src(dirSource + 'webapp/static/**/*').pipe(gulp.dest(dirDist + 'webpages/public/'));
  gulp.src(dirLib + 'cryptico.js').pipe(gulp.dest(dirDist + 'js')).pipe(gulp.dest(dirDist + 'webpages/public/js'));
  gulp.src(dirSource + 'webapp/handlers/**/*').pipe(gulp.dest(dirDist + 'webpages/handlers/'));
  return gulp.src(dirSource + 'config/*').pipe(gulp.dest(dirDist + 'config'));
});


/*
Run the system in the dist folder
 */

gulp.task('run-system', 'Deploy the system into the dist folder', ['deploy'], function(cb) {
  return nodemon({
    script: dirDist + 'js/webapi-eca.js'
  });
});
