const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops:getattr')

// TODO remove this:

const isFolder = function (itemPath) {
  return itemPath.substr(-1) === '/'
}

const fakeReadDir = {
  '/': ['_public', 'two', 'three'],
  '/_public': ['four', 'five', 'happybeing']
}

const fakeGetattr = {
  '/': 'directory',
  '/_public': 'directory',
  '/two': 'file',
  '/three': 'file',
  '/_public/four': 'file',
  '/_public/five': 'file',
  '/_public/happybeing': 'file'
}

module.exports = (ipfs) => {
  const now = Date.now()

  return {
    getattr (itemPath, reply) {
      debug({ itemPath })

      let result = fakeGetattr[itemPath]
      if (!result && itemPath.indexOf('DEBUG') === 0)
        result = 'file'

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
      ipfs.files.stat(itemPath, (err, stat) => {

        if (err) {
          if (err.message === 'file does not exist') return reply(Fuse.ENOENT)
          err = explain(err, 'Failed to stat itemPath')
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
