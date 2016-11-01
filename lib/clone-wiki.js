'use strict';

var run  =  require('./run')
  , path =  require('path')
  , os   =  require('os')
  , log  =  require('npmlog')

var mkdir = require('fs').mkdir
  , rmrf = require('rimraf');

var exec = require('child_process').exec;

var resolveGitRemote = function (cb) {
  exec('git remote -v', function (err, stdout, stderr) {
      if (err) return cb(err.stack);
      if (stderr) return cb(stderr);
      
      var m = stdout.match(
        /origin\s+(?:appuser@120\.24\.242\.123:|(?:https?|git):\/\/github\.com\/)(\S+)/
      );
      if (!m) return cb('no github remote found');
      cb(null, m[1].replace(/\.git$/, ''));
  });
};


function getWikiRepo(cb) {
  resolveGitRemote(function (err, remote) {
    if (err) return cb(err);
    remote = remote.replace('Front', 'Shufuer');
    var wikiUrl = 'https://github.com/' + remote + '.wiki.git'  
    cb(null, { remote: remote, url: wikiUrl });    
  });
}

function initRootDir (dirname, cb) {
  var dir = path.join(os.tmpdir(), dirname);

  rmrf(dir, function (err) {
    if (err) return cb(err);
    mkdir(dir, function (err) {
      if (err) return cb(err);
      cb(null, dir);
    });
  });
}

function clone(dirname, url, cb) {
  initRootDir(dirname, function (err, dir) {
    if (err) return cb(err);
    run('git', [ 'clone', url , 'wiki' ], dir, function (err) {
      if (err) return cb(err);
      cb(null, { root: dir, repo: { dir: path.join(dir, 'wiki'), url: url } } ); 
    });
  });
}

/**
 * Clones the wiki project of the project in the current directory
 *
 * @name cloneWiki
 * @memberof Internal
 * @function
 * @param {Function} cb called back info about root dir, wiki dir and wiki repo url
 */
var go = module.exports = function cloneWiki(cb) {
  getWikiRepo(function (err, repo) {
    if (err) return cb(err);

    var dirname = repo.remote.replace('/', '-');
    log.info('wicked', 'Cloning wiki from', repo.url);
    clone(dirname, repo.url,  function (err, info) {
      if (err) {
        cb(err);

        if (err.code === 128) {
          log.error('wicked', 'Looks like the wiki does not exist yet.');
          log.error('wicked', 'Please create it on github and run wicked again.');
        }
      }
      cb(null, info);
    });
  });
};
