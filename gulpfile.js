
/*

GULP FILE
=========

Type `gulp` in command line to get option list.
 */
var argv, chalk, coffee, dirDist, fCoffeePipe, fCompileEngine, fCompileGulpFile, fCompileWebapp, fHandleError, fPrintTaskRunning, gulp, gulphelp, gulpif, gutil, msgCmdC, plumber, uglify, watch;

argv = require('yargs').argv;

gulp = require('gulp');

gulpif = require('gulp-if');

plumber = require('gulp-plumber');

gutil = require('gulp-util');

chalk = gutil.colors;

gulphelp = require('gulp-help');

uglify = require('gulp-uglify');

coffee = require('gulp-coffee');

watch = require('gulp-watch');

dirDist = 'dist/';

if (argv.watch) {
  msgCmdC = "\n\n\n " + (chalk.bgYellow("--> Press Ctrl/Cmd + C to stop watching!")) + "\n\n";
} else {
  msgCmdC = "";
}

fPrintTaskRunning = function(task) {
  return gutil.log(chalk.yellow('Running TASK: ' + gulp.tasks[task.seq[0]].help.message) + msgCmdC);
};

fCoffeePipe = function(srcDir, doWatch) {
  var stream;
  if (doWatch) {
    stream = watch(srcDir).pipe(plumber({
      errorHandler: fHandleError
    }));
  } else {
    stream = gulp.src(srcDir);
  }
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

fCompileGulpFile = function() {
  fCoffeePipe('gulpfile.coffee', false).pipe(gulp.dest(''));
  if (argv.watch) {
    return fCoffeePipe('gulpfile.coffee', true).pipe(gulp.dest(''));
  }
};

gulp.task('gulpfile-compile', 'Compile the (coffee) GULP file', function() {
  fPrintTaskRunning(this);
  return fCompileGulpFile();
});


/*
Compile the engine's source code
 */

fCompileEngine = function() {
  fCoffeePipe('src/engine-coffee/*.coffee', false).pipe(gulp.dest(dirDist + 'js'));
  if (argv.watch) {
    return fCoffeePipe('src/engine-coffee/*.coffee', true).pipe(gulp.dest(dirDist + 'js'));
  }
};

gulp.task('engine-compile', 'Compile ENGINE coffee files in the project', function(cb) {
  fPrintTaskRunning(this);
  return fCompileEngine();
});


/*
Compile web app code
 */

fCompileWebapp = function() {
  console.log(gulp.src('src/webapp/coffee/*.coffee'));
  fCoffeePipe('src/webapp/coffee/*.coffee', false).pipe(gulp.dest(dirDist + 'webpages/handlers/js'));
  if (argv.watch) {
    return fCoffeePipe('src/webapp/coffee/*.coffee', true).pipe(gulp.dest(dirDist + 'webpages/handlers/js'));
  }
};

gulp.task('webapp-compile', 'Compile WEBAPP coffee files in the project', function() {
  fPrintTaskRunning(this);
  return fCompileWebapp();
});


/*
Compile all existing source code files
 */

gulp.task('all-compile', 'Compile ALL coffee files in the project', function() {
  fPrintTaskRunning(this);
  fCompileGulpFile();
  fCompileEngine();
  return fCompileWebapp();
});
