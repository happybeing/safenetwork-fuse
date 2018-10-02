const Fuse = require('fuse-bindings')
const SafeJsApi = require('safenetworkjs')
const debug = require('debug')('safe-fuse:ops')

// Useful refs:
//
// This one omits 'blocks' which is needed (at least for directories):
//  - https://github.com/mafintosh/fuse-bindings#opsgetattrpath-cb
// This shows FUSE code retrieving the returned values:
// TODO review settings from the following ref including: blocks, perm, dev, ino, nlink, rdev, blksize
//  - https://github.com/mafintosh/fuse-bindings/blob/032ed16e234f7379fbf421c12afef592ab2a292d/fuse-bindings.cc#L749-L769
module.exports = (safeVfs) => {
  return {
    getattr (itemPath, reply) {
      try {
        debug('getattr(\'%s\')', itemPath)
        let handler = safeVfs.getHandler(itemPath)
        handler.getattr(itemPath).then((result) => {
          // TODO implement more specific error handling like this on all fuse-ops
          if (result && result.entryType === SafeJsApi.containerTypeCodes.notFound) {
            reply(Fuse.ENOENT)
            return
          }

          reply(0, {
            mtime: result.modified,
            atime: result.accessed,
            ctime: result.created,
            nlink: 1,
            size: result.size,    // bytes
            // blocks: result.size, // TODO
            // perm: ?,             // TODO also: dev, ino, nlink, rdev, blksize
            // https://github.com/TooTallNate/stat-mode/blob/master/index.js
            mode: (result.isFile ? 33188 : 16877),
            uid: process.getuid ? process.getuid() : 0,
            gid: process.getgid ? process.getgid() : 0
          })
        }).catch((e) => {
          debug(e.message + ' - for itemPath:' + itemPath)
          reply(Fuse.EREMOTEIO)
        })
      } catch (err) {
        debug('Failed to getattr: ' + itemPath)
        debug(err)
        reply(Fuse.EREMOTEIO)
      }
    }
  }

      // ipfs.files.stat(itemPath, (err, stat) => {
      //
      //   if (err) {
      //     if (err.message === 'file does not exist') return reply(Fuse.ENOENT)
      //     err = explain(err, 'Failed to stat itemPath')
      //     debug(err)
      //     return reply(Fuse.EREMOTEIO)
      //   }
      //
      //   reply(0, {
      //     mtime: now,
      //     atime: now,
      //     ctime: now,
      //     nlink: 1,
      //     size: stat.size,
      //     // https://github.com/TooTallNate/stat-mode/blob/master/index.js
      //     mode: stat.type === 'directory' ? 16877 : 33188,
      //     uid: process.getuid ? process.getuid() : 0,
      //     gid: process.getgid ? process.getgid() : 0
      //   })
      // })
}
