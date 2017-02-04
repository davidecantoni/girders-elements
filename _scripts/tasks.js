'use strict';

const R = require("ramda");
const util = require("gulp-util");
const gulp = require("gulp");

const flow = {
  rejectWhen: (test, message) => R.ifElse(test, () => { throw message }, R.identity),
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

      if (res instanceof Promise) {
        return res.catch(err => Promise.reject(new util.PluginError({
          plugin: name,
          message: err
        })));
      }
    }
  }
  return gulp.task(n, d || f, d && f);
};

module.exports = {
  task,
  flow
};
