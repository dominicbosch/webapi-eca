var coffee, coffeeStream, dirProductive, dirTesting, fCompileEngine, fHandleError, gulp, gutil, plumber, uglify, watch;

gulp = require('gulp');

plumber = require('gulp-plumber');

gutil = require('gulp-util');

uglify = require('gulp-uglify');

coffee = require('gulp-coffee');

watch = require('gulp-watch');

dirTesting = 'builds/testing/';

dirProductive = 'builds/productive/';

coffeeStream = coffee({
  bare: true
});

fHandleError = function(err) {
  gutil.beep();
  return console.log(err.toString());
};

fCompileEngine = function(doWatch) {
  var stream;
  stream = gulp.src('src/engine-coffee/*.coffee').pipe(plumber({
    errorHandler: fHandleError
  }));
  if (doWatch) {
    stream = stream.pipe(watch());
  }
  return stream.pipe(coffeeStream).pipe(gulp.dest(dirTesting + 'js')).pipe(uglify()).pipe(gulp.dest(dirProductive + 'js'));
};

gulp.task('coffee', function() {
  return fCompileEngine(false);
});

gulp.task('coffee-watch', function(cb) {
  return fCompileEngine(true);
});
