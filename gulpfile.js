'use strict';

const gulp = require('gulp');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const util = require('gulp-util');
const {
  log,
  colors
} = util;


const del = require('del');
const nodeExec = require('child_process').exec;
const tagVersion = require('gulp-tag-version');
const inquirer = require('inquirer');

gulp.task('build-es5', () => {
  return gulp.src('./src/**/*.js')
    .pipe(sourcemaps.init())
      .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/es5'));
});

gulp.task('clean', () => del(['dist/**']));

task('release:branch-check', () => {
  return git.currentBranch().then(
      branch => {
        if (branch.match(/(develop$|release-.+$)/) == null) {
          throw "You may push versions only from the 'develop' or a release branch";
        }
        return branch;
      });
});

gulp.task('release:detach', ['release:branch-check'], () => {
  return git.detach();
});

gulp.task('release:set-version', ['release:detach'], () => {
  return versioning.newVersion().then(
    ({version, nextVersion}) => {

    }
  ));
});

gulp.task('release:verify', ['test']);

gulp.task('release:tag');


const git = {
  currentBranch: () => exec('git rev-parse --abbrev-ref HEAD'),
  detach: () => exec('git checkout --detach')
};

const version = {
  askVersion: (current) => inquirer.prompt([
    {
      name: "asIs",
      message: "Use current "
    }
  ])
};

function exec(command) {
  return new Promise((resolve, reject) => {
    nodeExec(command, (error, stdout, stderr) => {
      if (error) {
        log(color.bold.red(stderr));
        reject(error);
      } else {
        resolve(stdout && stdout.trim());
      }
    });
  });
}

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