'use strict';

const gulp = require('gulp');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const util = require('gulp-util');
const bump = require("bump-regex");
const {
  log,
  colors
} = util;
const R = require("ramda");
const del = require('del');
const {git, versions} = require("./_scripts/versioning");
const {task, flow, applyWithPromise} = require("./_scripts/tasks");


// tasks

task('build-es5', () => {
  return gulp.src('./src/**/*.js')
    .pipe(sourcemaps.init())
      .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/es5'));
});

task('clean', () => del(['dist/**']));

task('release:check', () => {
  let wrongBranch = R.match(/(develop$|release-.+$)/);

  let branchCheck = R.pipeP(
    git.currentBranch,
    flow.rejectWhen(wrongBranch, "You may push versions only from the 'develop' or a release branch"));

  return branchCheck();
});

task('release:bump-version', () => {
  log(colors.bold.green("The current version is "), colors.bold.white(versions.currentVersion));

  return gulp.src("./package.json")
    .pipe(applyWithPromise(bumpToVersion, versions.queryReleaseVersion()))
    .pipe(gulp.dest("dist/tmp"));
});

task('release:detach', ['release:check'], () => {
  return git.detach();
});

task('release:verify', ['test']);

task('release:tag');
