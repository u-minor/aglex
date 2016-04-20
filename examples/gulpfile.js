'use strict';

// See gulp help for overview of commands.
// Requires added the following modules to your dependencies:
//    del, aglex, yargs, gulp-help, run-sequence, config, gulp-rename, gulp-zip, gulp-live-server

var fs = require('fs');
var del = require('del');
var aglex = require('aglex');
var argv = require('yargs')
      .default('env','development')
      .argv;

var gulp = require('gulp-help')(require('gulp'));
var runSequence = require('run-sequence');

process.env.NODE_ENV = argv.env;

// Load config from config/
var config = require('config');

var sourceFiles = ['app.js', 'config/*', 'public/**', 'routes/**'];

gulp.task('serve', 'Start a local development server', () => {
  var gls = require('gulp-live-server');
  var server = gls.new('bin/www', {env: {NODE_ENV: 'staging'}});
  server.start();

  gulp.watch(sourceFiles, () => {
    console.log("restart server");
    server.start.bind(server)();
  });
});

gulp.task('build', 'clean and updateLambda', () => runSequence('clean','updateLambda'))

gulp.task('clean', 'remove the build directory', (done) => del('build', done));

gulp.task('copyPackages', 'copy dependences from node_modules into build directory', () => {
  var pkg = require('./package.json');
  var depsRe = Object.keys(pkg.dependencies).join('|');

  gulp.src("node_modules/@("+depsRe+")/**")
    .pipe(gulp.dest('build/node_modules'));
});

gulp.task('copyConfig', 'copy active config into build directory', () => {
  var rename = require('gulp-rename');

  gulp.src("config/production.yml")
    .pipe(rename('default.yml'))
    .pipe(gulp.dest('build/config'));
});

gulp.task('zip', 'create zipfile to upload', ['copyConfig','copyPackages'], () => {
  var zip = require('gulp-zip');

  gulp.src('build/**')
    .pipe(zip('lambda.zip'))
    .pipe(gulp.dest('dist'));
});

gulp.task('updateLambda', 'create zip file and update Lambda', ['zip'], (done) => {
  aglex.updateLambda('dist/lambda.zip').then(done);
});

gulp.task('updateLambdaPermission', 'update Lambda permissions', (done) => {
  aglex.addLambdaPermission().then(done);
});

// Requires --stage, --desc and --stagedesc are optional
gulp.task('deployApi', 'deploy the API. requires --stage. --desc and --stagedesc optional.', (done) => {
  if (!argv.stage) {
    console.log("Please use --stage STAGENAME");
    return;
  }

  aglex.deployApi(argv.desc, argv.stage, argv.stagedesc).then(done);
});
