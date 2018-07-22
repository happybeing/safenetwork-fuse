const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('ipfs-fuse:getattr')

// TODO remove this:

const isFolder = function (path) {
  return path.substr(-1) === '/'
}

const fakeReadDir = {
  '/': ['one', 'two', 'three'],
  '/one': ['four', 'five', 'happybeing']
}

const fakeGetattr = {
  '/': 'directory',
  '/one': 'directory',
  '/two': 'file',
  '/three': 'file',
  '/one/four': 'file',
  '/one/five': 'file',
  '/one/happybeing': 'file'
}

module.exports = (ipfs) => {
  const now = Date.now()

  return {
    getattr (path, reply) {
      debug({ path })

      result = fakeGetattr[path]

if (result) {
      // TODO stop FAKING IT:
      reply(0, {
        mtime: now,
        atime: now,
        ctime: now,
        nlink: 1,
        size: 1234,
        // https://github.com/TooTallNate/stat-mode/blob/master/index.js
        mode: result == 'directory' ? 16877 : 33188,
        uid: process.getuid ? process.getuid() : 0,
        gid: process.getgid ? process.getgid() : 0
      })
} else {
  reply(Fuse.ENOENT)
}
if (false){
      ipfs.files.stat(path, (err, stat) => {

        if (err) {
          if (err.message === 'file does not exist') return reply(Fuse.ENOENT)
          err = explain(err, 'Failed to stat path')
          debug(err)
          return reply(Fuse.EREMOTEIO)
        }

        reply(0, {
          mtime: now,
          atime: now,
          ctime: now,
          nlink: 1,
          size: stat.size,
          // https://github.com/TooTallNate/stat-mode/blob/master/index.js
          mode: stat.type === 'directory' ? 16877 : 33188,
          uid: process.getuid ? process.getuid() : 0,
          gid: process.getgid ? process.getgid() : 0
        })
      })
}
    }
  }
}
