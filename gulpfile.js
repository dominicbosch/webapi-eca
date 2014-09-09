
/*

GULP FILE
=========

Type `gulp` in command line to get option list.
 */
var argv, chalk, clean, coffee, dirDist, fCoffeePipe, fHandleError, fSimpleCoffeePipe, gulp, gulphelp, gutil, plumber, uglify, watch;

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
    return gutil.log("\n\n" + (chalk.underline('Additionally available arguments')) + " (apply wherever it makes sense)\n\ \ " + (chalk.yellow('--productive \t')) + "  Executes the task for the productive environment\n\ \ " + (chalk.yellow('--watch \t')) + "  Continuously executes the task on changes\n");
  }
});


/*
Compile the gulp file itself
 */

gulp.task('compile-gulpfile', 'Compile GULP coffee file', function(cb) {
  fSimpleCoffeePipe('src/gulp/gulpfile.coffee', '');
  if (!argv.watch) {
    return cb();
  }
});


/*
Clean everything up
 */

gulp.task('clean', 'Clean all deployed productive resources', function() {
  return gulp.src(dirDist, {
    read: false
  }).pipe(clean());
});


/*
Compile the engine's source code
 */

gulp.task('compile-engine', 'Compile ENGINE coffee files in the project', function(cb) {
  fSimpleCoffeePipe('src/engine-coffee/*.coffee', dirDist + 'js');
  if (!argv.watch) {
    return cb();
  }
});


/*
Compile web app code
 */

gulp.task('compile-webapp', 'Compile WEBAPP coffee files in the project', function(cb) {
  fSimpleCoffeePipe('src/webapp/coffee/*.coffee', dirDist + 'webpages/handlers/js');
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

gulp.task('deploy', 'Deploy the system into the dist folder', ['clean'], function(cb) {
  gulp.start('compile-engine', 'compile-webapp');
  if (!argv.watch) {
    return cb();
  }
});
