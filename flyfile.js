'use strict';

const R = require('ramda');
const {git, versions} = require("./scripts/versioning");
const chalk = require("chalk");
const bump = require("bump-regex");

const dist = 'dist';
const distEs5 = `${dist}/es5`;

require("babel-register");

module.exports = {

  *es5(fly) {
    /* @desc Transpiles the project into ES5, for browser use */

    yield fly
      .source(['index.js', 'src/**/*.js'])
      .babel({
        sourceMaps: true
      })
      .target(distEs5);
  },

  *clean(fly) {
    /* @desc cleans */
    yield fly.clear(dist);
  },

  *test(fly) {
    /* @desc runs the tests */

    const oldEnv = process.env.BABEL_ENV;
    process.env.BABEL_ENV = "test";

    yield fly.source("./test/**/*.spec.js")
      .mocha()

    process.env.BABEL_ENV = oldEnv;
  },

  *release(fly) {
    /* @desc performs a new release */

    yield fly.serial([
      'checkBranch',
      'es5',
      'test',
      'detach',
      'bumpVersion',
      'mergeCurrentToMaster',
      'tagCurrentVersion',
      'mergeMasterToBranch',
      'allDone'
    ],
    { startingBranch: yield git.currentBranch()})
  },

  *checkBranch(fly) {
    const currentBranch = yield git.currentBranch();
    const workCopyClean = yield git.isClean();
    const wrongBranch = R.pipe(R.match(/^(develop|release-.+)$/), R.isEmpty);

    fly.$.log('Current branch: ', currentBranch);

    if (wrongBranch(currentBranch)) throw new Error('You may push versions only from the "develop" or a release branch');
    if (!workCopyClean) throw new Error('Your working copy is not clean');
  },

  *bumpVersion(fly) {
    const {$} = fly;
    const bumpVersion = $.promisify(bump);

    yield wait(1);

    $.log("Curent Version: ", chalk.bold(versions.current));
    const {releaseVersion} = yield versions.queryReleaseVersion();

    yield fly.source("./package.json")
      .run({every: false}, function *([packageFile]) {

        const bumped = yield bumpVersion({
          str: String(packageFile.data),
          version: releaseVersion
        });
        packageFile.data = bumped.str;

      })
      .target(".")

    yield git.commit("package.json", `Bumped version to ${releaseVersion}`)
  },

  *detach() {
    yield git.detach();
  },

  *tagCurrentVersion(fly) {
    const packageString = yield fly.$.read("./package.json")
    const packageFile = JSON.parse(packageString)
    const taggedVersions = yield versions.all()
    const exists = R.contains(packageFile.version, taggedVersions)

    if (exists) throw new Error(`A tag alredy exists for the version ${packageFile.version}`);

    yield git.tag(packageFile.version);
  },

  *mergeCurrentToMaster(fly) {
    const packageFile = JSON.parse(yield fly.$.read("./package.json"))

    yield git.checkout('master')
    yield git.merge(`v${packageFile.version}`, `Pushed release ${packageFile.version}.`)

  },

  *mergeMasterToBranch(fly, opts) {
    let {startingBranch} = opts;
    startingBranch = startingBranch || 'develop'
    yield git.checkout(startingBranch)
    yield git.mergeFf('master')
  },

  *allDone(fly) {
    yield fly.$.alert("Versioning is done! Check your git tree and push when ready.")
  }
}

function wait(secs) {
  return new Promise(resolve => setTimeout(resolve, secs * 1000));
}
