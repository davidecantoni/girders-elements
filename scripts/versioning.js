'use strict'

const R = require("ramda");
const nodeExec = require("child_process").exec;
const semver = require("semver");
const currentVersion = require("../package.json").version;
const inquirer = require("inquirer");


// version filters

const all = semver.valid;
const preModifiers = R.pipe(semver.valid, semver.prerelease, R.defaultTo([]));
const pre = prefix => R.pipe(preModifiers, R.contains(prefix));
const isRelease = R.pipe(preModifiers, R.isEmpty);
const isPreRelease = R.complement(isRelease);

// git commands

const currentBranch = () => exec('git rev-parse --abbrev-ref HEAD');
const detach = () => exec('git checkout --detach');
const tag_ = () => exec('git tag');
const commit = (file, msg) => exec(`git commit ${file} -m "${msg}"`);
const merge = (branch, msg) => exec(`git merge --no-ff ${branch} -m "${msg}"`);
const mergeFf = (branch) => exec(`git merge --ff ${branch}`);
const checkout = branch => exec(`git checkout ${branch}`);
const status = () => exec(`git status --porcelain`);
const isClean = R.pipeP(status, R.isEmpty);


// tag processing

const tags = R.pipeP(tag_, R.split("\n"));
const tag = version => exec(`git tag v${version}`)

const versions = R.pipeP(tags, R.filter(all), R.map(semver.valid), R.uniq);
const preReleaseVersions = prefix => versions().then(R.pipe(R.filter(pre(prefix)), R.sort(semver.compare)));
const releaseVersions = R.pipeP(versions, R.filter(isRelease), R.sort(semver.compare));

const queryReleaseVersion = R.pipeP(versions, existingVersions => {

  const compose = R.curry((v1, v2, input) => {
    const val = v1(input);
    return val === true ? v2(input) : val;
  });

  const isVersion = input => semver.valid(input) ? true : "Input is not a valid version string";
  const doesNotExist = input => !R.contains(input, existingVersions) ? true : "Version already exists";

  const validators = R.reduce(compose, R.T, [isVersion, doesNotExist]);

  return inquirer.prompt([
    {
      name: "releaseVersion",
      message: "Version to use for the release?",
      type: "input",
      validate: validators
    }
  ]);
});

function exec(command) {
  return new Promise((resolve, reject) => {
    nodeExec(command, (error, stdout, stderr) => {
      if (error) {
        error.errorOutput = stderr;
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
    commit,
    merge,
    mergeFf,
    checkout,
    tags,
    status,
    isClean
  },

  versions: {
    all: versions,
    current: currentVersion,
    preRelease: preReleaseVersions,
    release: releaseVersions,
    isRelease,
    isPreRelease,
    queryReleaseVersion
  },

  exec
};
