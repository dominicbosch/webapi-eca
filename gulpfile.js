var fCompileCoffee,
	gulp = require('gulp'),
	minifyHtml = require("gulp-minify-html"),
	minifyCss = require("gulp-minify-css"),
	uglify = require("gulp-uglify"),
	coffee = require("gulp-coffee"),
	less = require("gulp-less"),
	sass = require("gulp-sass"),
	jshint = require("gulp-jshint"),
	coffeelint = require("gulp-coffeelint"),
	concat = require("gulp-concat"),
	fs = require('fs'),
	concat = require("gulp-concat"),
	header = require("gulp-header")
	watch = require("gulp-watch");

gulp.task('default', function() {
  console.log('hickup');
});

gulp.task( 'compile', function() {
	gulp.watch( 'coffee/*.coffee', fCompileCoffee );

});

fCompileCoffee = function( event ) {
	console.log('compiling coffee');
}

gulp.task('watch-coffeescript', function () {
    watch({glob: './CoffeeScript/*.coffee'}, function (files) { // watch any changes on coffee files
        gulp.start('compile-coffee'); // run the compile task
    });
});

gulp.task('minify-html', function () {
    gulp.src('./Html/*.html') // path to your files
    .pipe(minifyHtml())
    .pipe(gulp.dest('path/to/destination'));
});
 
// task
gulp.task('minify-css', function () {
    gulp.src('./Css/one.css') // path to your file
    .pipe(minifyCss())
    .pipe(gulp.dest('path/to/destination'));
});
 
// task
gulp.task('minify-js', function () {
    gulp.src('./JavaScript/*.js') // path to your files
    .pipe(uglify())
    .pipe(gulp.dest('path/to/destination'));
});
 
// task
gulp.task('compile-coffee', function () {
    gulp.src('./CoffeeScript/one.coffee') // path to your file
    .pipe(coffee())
    .pipe(gulp.dest('path/to/destination'));
});
 
// task
gulp.task('compile-less', function () {
    gulp.src('./Less/one.less') // path to your file
    .pipe(less())
    .pipe(gulp.dest('path/to/destination'));
});
 
// task
gulp.task('compile-sass', function () {
    gulp.src('./Sass/one.sass') // path to your file
    .pipe(sass())
    .pipe(gulp.dest('path/to/destination'));
});
 
// task
gulp.task('jsLint', function () {
    gulp.src('./JavaScript/*.js') // path to your files
    .pipe(jshint())
    .pipe(jshint.reporter()); // Dump results
});
 
// task
gulp.task('coffeeLint', function () {
    gulp.src('./CoffeeScript/*.coffee') // path to your files
    .pipe(coffeelint())
    .pipe(coffeelint.reporter());
});
 
// task
gulp.task('concat', function () {
    gulp.src('./JavaScript/*.js') // path to your files
    .pipe(concat('concat.js'))  // concat and name it "concat.js"
    .pipe(gulp.dest('path/to/destination'));
});
 
// functions
 
// Get copyright using NodeJs file system
var getCopyright = function () {
    return fs.readFileSync('Copyright');
};
 
// task
gulp.task('concat-copyright', function () {
    gulp.src('./JavaScript/*.js') // path to your files
    .pipe(concat('concat-copyright.js')) // concat and name it "concat-copyright.js"
    .pipe(header(getCopyright()))
    .pipe(gulp.dest('path/to/destination'));
});
 
// Get version using NodeJs file system
var getVersion = function () {
    return fs.readFileSync('Version');
};
 
// Get copyright using NodeJs file system
var getCopyright = function () {
    return fs.readFileSync('Copyright');
};
 
// task
gulp.task('concat-copyright-version', function () {
    gulp.src('./JavaScript/*.js')
    .pipe(concat('concat-copyright-version.js')) // concat and name it "concat-copyright-version.js"
    .pipe(header(getCopyrightVersion(), {version: getVersion()}))
    .pipe(gulp.dest('path/to/destination'));
});

// // including plugins
// var gulp = require('gulp')
// , fs = require('fs')
// , coffeelint = require("gulp-coffeelint")
// , coffee = require("gulp-coffee")
// , uglify = require("gulp-uglify")
// , concat = require("gulp-concat")
// , header = require("gulp-header");
 
// // functions
 
// // Get version using NodeJs file system
// var getVersion = function () {
//     return fs.readFileSync('Version');
// };
 
// // Get copyright using NodeJs file system
// var getCopyright = function () {
//     return fs.readFileSync('Copyright');
// };
 
// // task
// gulp.task('bundle-one', function () {
//     gulp.src('./CoffeeScript/*.coffee') // path to your files
//     .pipe(coffeelint()) // lint files
//     .pipe(coffeelint.reporter('fail')) // make sure the task fails if not compliant
//     .pipe(concat('bundleOne.js')) // concat files
//     .pipe(coffee()) // compile coffee
//     .pipe(uglify()) // minify files
//     .pipe(header(getCopyrightVersion(), {version: getVersion()})) // Add the copyright
//     .pipe(gulp.dest('path/to/destination'));
// });