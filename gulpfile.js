
/*

GULP FILE
=========

Type `gulp` in command line to get option list.
 */
var argv, bunyan, chalk, coffee, cp, debug, del, fHandleError, fSimpleCoffeePipe, fs, gulp, gulphelp, gutil, nodemon, nodeunit, path, paths, plumber, uglify, watch;

fs = require('fs');

path = require('path');

argv = require('yargs').argv;

del = require('del');

gulp = require('gulp');

plumber = require('gulp-plumber');

gutil = require('gulp-util');

chalk = gutil.colors;

gulphelp = require('gulp-help');

debug = require('gulp-debug');

uglify = require('gulp-uglify');

coffee = require('gulp-coffee');

watch = require('gulp-watch');

nodemon = require('gulp-nodemon');

nodeunit = require('nodeunit');

cp = require('child_process');

bunyan = require('bunyan');

if (argv.watch) {
  gutil.log("");
  gutil.log("" + (chalk.bgYellow("--> Press Ctrl/Cmd + C to stop watching!")));
  gutil.log("");
}

fSimpleCoffeePipe = function(task, dirSrc, dirDest) {
  var stream;
  if (argv.watch) {
    gutil.log(chalk.yellow("Adding Coffee watch for compiling from \"" + dirSrc + "\" to \"" + dirDest + "\""));
    stream = watch(dirSrc).pipe(plumber({
      errorHandler: fHandleError
    })).pipe(debug({
      title: 'Change detected in (' + task + '): '
    }));
  } else {
    gutil.log(chalk.green("Compiling Coffee from \"" + dirSrc + "\" to \"" + dirDest + "\""));
    stream = gulp.src(dirSrc).pipe(debug({
      title: 'Compiling (' + task + '): '
    }));
  }
  stream = stream.pipe(coffee({
    bare: true
  }));
  if (argv.productive) {
    stream = stream.pipe(uglify());
  }
  return stream.pipe(gulp.dest(dirDest));
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
  description: 'You are looking at it!',
  aliases: ['h', '?', '-h', '--help'],
  afterPrintCallback: function(tasks) {
    return console.log((chalk.underline('Additionally available argument')) + " (apply wherever it makes sense)\n\ \ " + (chalk.yellow('--productive \t')) + "  Executes the task for the productive environment\n\ \ " + (chalk.yellow('--watch \t')) + "  Continuously executes the task on changes\n");
  }
});

paths = {
  lib: 'lib/',
  src: 'src/',
  srcGulp: 'src/gulp/gulpfile.coffee',
  srcEngineCoffee: 'src/engine-coffee/**/*.coffee',
  srcWebAppCoffee: 'src/webapp/coffee/*.coffee',
  dist: 'dist/',
  distEngine: 'dist/js',
  distWebApp: 'dist/static/js'
};

gulp.task('compile-gulp', 'Compile GULP coffee file', function(cb) {
  fSimpleCoffeePipe('compile-gulpfile', paths.srcGulp, './');
  return cb();
});

gulp.task('clean', 'Cleanup previously deployed distribution', function(cb) {
  return del(paths.dist, cb);
});

gulp.task('compile', 'Compile the system\'s coffee files in the project', function(cb) {
  var compile;
  compile = function() {
    var streamOne, streamTwo;
    streamOne = fSimpleCoffeePipe('compile-engine', paths.srcEngineCoffee, paths.distEngine);
    streamTwo = fSimpleCoffeePipe('compile-webapp', paths.srcWebAppCoffee, paths.distWebApp);
    return cb();
  };
  if (argv.watch) {
    return compile();
  } else {
    gutil.log(chalk.red("Deleting folder \"" + paths.dist + "\""));
    return del(paths.dist, compile);
  }
});

gulp.task('deploy', 'Deploy all system resources into the distribution folder', ['compile'], function(cb) {
  var fetchStream, isComplete, semaphore;
  semaphore = 4;
  isComplete = function() {
    if (--semaphore === 0) {
      return cb();
    }
  };
  fetchStream = function(srcGlob) {
    var stream;
    if (argv.watch) {
      gutil.log(chalk.yellow('Adding watch for "' + srcGlob + '"'));
      stream = watch(srcGlob).pipe(plumber({
        errorHandler: fHandleError
      })).pipe(debug({
        title: 'Redeploying: '
      }));
    } else {
      gutil.log(chalk.green('Deploying "' + srcGlob + '"'));
      stream = gulp.src(srcGlob).pipe(debug({
        title: 'Deploying: '
      }));
    }
    return stream;
  };
  fetchStream(paths.src + 'webapp/static/**/*').pipe(gulp.dest(paths.dist + 'static/')).on('end', isComplete);
  fetchStream(paths.src + 'webapp/views/**/*').pipe(gulp.dest(paths.dist + 'js/views/')).on('end', isComplete);
  fetchStream(paths.lib + '*').pipe(gulp.dest(paths.distEngine)).pipe(gulp.dest(paths.dist + 'static/js/lib')).on('end', isComplete);
  fetchStream(paths.src + 'config/*').pipe(gulp.dest(paths.dist + 'config')).on('end', isComplete);
  if (argv.watch) {
    cb();
  }
  return null;
});

gulp.task('develop', 'Run the system in the dist folder and restart when files change in the folders', ['compile-gulp', 'deploy'], function() {
  gutil.log(chalk.bgGreen('STARTING UP the System for development!!!'));
  if (!argv.watch) {
    gutil.log(chalk.bgYellow('... Maybe you want to execute this task with the "--watch" flag!'));
  }
  return nodemon({
    script: paths.dist + 'js/webapi-eca.js',
    watch: ['dist/js'],
    ext: 'js',
    stdout: false
  }).on('readable', function() {
    return this.stderr.pipe(gutil.buffer(function(err, files) {
      return gutil.log(chalk.bgRed(files.join('\n')));
    }));
  });
});

gulp.task('start', 'Run the system in the dist folder', ['deploy'], function() {
  var arrArgs, bun, eca;
  gutil.log(chalk.bgGreen('STARTING UP the System!!!'));
  if (argv.watch) {
    gutil.log(chalk.bgYellow("The system will not be restarted when files change! \nThe changes will only be deployed"));
  }
  if (argv.productive) {
    arrArgs = ['./dist/js/webapi-eca', "-w", "8080", "-d", "6379", "-m", "productive", "-i", "error", "-f", "warn"];
  } else {
    arrArgs = ['./dist/js/webapi-eca', "-w", "8080", "-d", "6379", "-m", "development", "-i", "info", "-f", "warn"];
  }
  eca = cp.spawn('node', arrArgs);
  bun = cp.spawn('./node_modules/bunyan/bin/bunyan', [], {
    stdio: ['pipe', process.stdout, process.stderr]
  });
  return eca.stdout.pipe(bun.stdin);
});


/*
Unit TESTS!
 */

gulp.task('test', 'Run unit tests', function(cb) {
  var cs, db, fEnd, fl;
  process.chdir(__dirname);
  global.pathToEngine = path.resolve(__dirname, 'dist', 'js');
  db = require(path.join(global.pathToEngine, 'persistence'));
  cs = require('coffee-script');
  fEnd = function() {
    console.log("Shutting down DB from unit_test.sh script. \nThis might take as long as the event poller loop delay is...");
    return db.shutDown();
  };
  if (typeof cs.register === "function") {
    cs.register();
  }
  if (gutil.env.testfile) {
    fl = path.resolve(gutil.env.testfile);
    if (fs.existsSync(fl)) {
      return nodeunit.reporters["default"].run([fl], null, fEnd);
    } else {
      return console.error('File not found!!');
    }
  } else {
    return nodeunit.reporters["default"].run(['src/unittests'], null, fEnd);
  }
});
