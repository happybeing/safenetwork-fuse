const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops:getattr')

module.exports = (safeVfs) => {
  return {
    getattr (itemPath, reply) {
      try {
        debug({ itemPath })
        let handler = safeVfs.getHandler(itemPath)
        handler.getattr(itemPath).then((result) => {
          reply(0, {
            mtime: result.modified,
            atime: result.accessed,
            ctime: result.created,
            nlink: 1,
            size: result.size,
            // https://github.com/TooTallNate/stat-mode/blob/master/index.js
            mode: (result.isFile ? 33188 : 16877),
            uid: process.getuid ? process.getuid() : 0,
            gid: process.getgid ? process.getgid() : 0
          })
        }).catch((e) => {
          debug(e.message)
          if (e.message === 'file does not exist') return reply(Fuse.ENOENT)
          reply(Fuse.EREMOTEIO)
        })
      } catch (err) {
        let e = explain(err, 'Failed to getattr: ' + itemPath)
        debug(e)
        reply(Fuse.EREMOTEIO)
      }
    }
  }

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
