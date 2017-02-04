'use strict'

const R = require("ramda");
const nodeExec = require("child_process").exec;
const semver = require("semver");
const currentVersion = require("../package.json").version;

const util = require('gulp-util');
const {
  log,
  colors
} = util;

// version filters

const all = semver.valid;
const preModifiers = R.pipe(semver.valid, semver.prerelease, R.defaultTo([]));
const pre = prefix => R.pipe(preModifiers, R.contains(prefix));
const isRelease = R.pipe(preModifiers, R.isEmpty);
const isPreRelease = R.complement(isRelease)

// git commands

const currentBranch = () => exec('git rev-parse --abbrev-ref HEAD');
const detach = () => exec('git checkout --detach');
const tag = () => exec('git tag');
const tags = R.pipeP(tag, R.split("\n"));

const versions = R.pipeP(tags, R.filter(all), R.map(semver.valid), R.uniq);
const preReleaseVersions = prefix => versions().then(R.filter(pre(prefix)));
const releaseVersions = R.pipeP(versions, R.filter(isRelease));

function exec(command) {
  return new Promise((resolve, reject) => {
    nodeExec(command, (error, stdout, stderr) => {
      if (error) {
        log(colors.bold.red(stderr));
        reject(error);
      } else {
        resolve(stdout && stdout.trim());
      }
    });
  });
}

module.exports = {
  git: {
    currentBranch,
    detach,
    tag,
    tags
  },

  versions: {
    all: versions,
    current: currentVersion,
    preRelease: preReleaseVersions,
    release: releaseVersions,
    isRelease,
    isPreRelease
  },

  exec
};
