'use strict';

const gulp = require('gulp');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const util = require('gulp-util');
const {
  log,
  colors
} = util;
const R = require("ramda");
const del = require('del');
const tagVersion = require('gulp-tag-version');
const inquirer = require('inquirer');
const {git, versions, eec} = require("./_scripts/versioning")

gulp.task('build-es5', () => {
  return gulp.src('./src/**/*.js')
    .pipe(sourcemaps.init())
      .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/es5'));
});

gulp.task('clean', () => del(['dist/**']));

task('release:check', () => {
  let wrongBranch = R.match(/(develop$|release-.+$)/);

  let branchCheck = R.pipeP(
    git.currentBranch,
    flow.rejectWhen(wrongBranch, "You may push versions only from the 'develop' or a release branch"));

  let tagCheck = R.pipeP(
    versions.all,
    flow.rejectWhen(R.any(R.equals(versions.current)), "A tag for the version in package.json already exist. Set a new version first"));

  return Promise.all([branchCheck(), tagCheck()]);
});

gulp.task('release:detach', ['release:check'], () => {
  return git.detach();
});

gulp.task('release:verify', ['test']);

gulp.task('release:tag');

const flow = {
  rejectWhen: (test, message) => R.ifElse(test, () => { throw message }, R.identity),
  error: (message) => { throw message }
};

function task(name, deps, fn) {
  let [n, d] = [name, deps];
  let ff;

  if (typeof fn === 'function') {
    ff = fn;
  } else if (typeof deps === 'function') {
    ff = deps;
    d = undefined;
  }

  let f;
  if (ff) {
    f = function() {
      const res = ff();
      log("in wrapper, res = ", res);

      if (res instanceof Promise) {
        return res.catch(err => Promise.reject(new util.PluginError({
          plugin: name,
          message: err
        })));
      }
    }
  }
  return gulp.task(n, d || f, d && f);
}
