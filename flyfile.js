'use strict';

const R = require('ramda');
const {git, versions} = require("./scripts/versioning");
const chalk = require("chalk");
const bump = require("bump-regex");

const dist = 'dist';
const distEs5 = `${dist}/es5`;

module.exports = {

  *es5(fly) {
    yield fly
      .source(['index.js', 'src/**/*.js'])
      .babel({
        sourceMaps: true
      })
      .target(distEs5);
  },

  *clean(fly) {
    yield fly.clear(dist);
  },

  *release(fly) {
    fly.serial([
      'checkBranch',
      'test',
      'detach',
      'bumpVersion',
      'tagCurrentVersion',
      'mergeCurrentToMaster'
    ],
    { startingBranch: yield git.currentBranch()})
  },

  *checkBranch(fly) {
    const currentBranch = yield git.currentBranch();
    const workCopyClean = yield git.isClean();
    const wrongBranch = R.match(/(develop$|release-.+$)/);

    if (wrongBranch(currentBranch)) throw new Error('You may push versions only from the "develop" or a release branch');
    if (!workCopyClean) throw new Error('Your working copy is not clean');
  },

  *bumpVersion(fly) {
    const {$} = fly;
    const bumpVersion = $.promisify(bump);

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
    const packageFile = JSON.parse(yield fly.$.read("./package.json"))
    const exists = R.contains(packageFile.version, yield versions.all)

    if (exists) throw new Error(`A tag alredy exists for the version ${packageFile.version}`);

    yield git.tag(packageFile.version);
  },

  *mergeCurrentToMaster(fly) {
    const packageFile = JSON.parse(yield fly.$.read("./package.json"))

    yield git.checkout('master')
    yield git.merge(`v${packageFile.version}`, "Pushed release ${packageFile.version}.")

  },

  *mergeMergeToBranch(fly, opts) {
    let {startingBranch} = opts;
    startingBranch = startingBranch || 'develop'
    yield git.checkout(startingBranch)
    yield git.merge('master')
  }


}
