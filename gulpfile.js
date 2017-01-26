'use strict';

const gulp = require('gulp');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const del = require('del');

gulp.task('build-es5', () => {
  return gulp.src('./src/**/*.js')
    .pipe(sourcemaps.init())
      .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/es5'));
});

gulp.task('clean', () => del(['dist']));