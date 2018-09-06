const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops:read')

module.exports = (safeVfs) => {
  return {
    read (itemPath, fd, buf, len, pos, reply) {
      try {
        debug('read(\'%s\', %s, buf, %s, %s)', itemPath, fd, len, pos)

        safeVfs.getHandler(itemPath).read(itemPath, fd, buf, len, pos).then((bytes) => {
          debug('read %s bytes', bytes)
          debug('data: %s', buf)
          reply(bytes)
        })
      } catch (err) {
        let e = explain(err, 'Failed to read: ' + itemPath)
        debug(e)
        reply(Fuse.EREMOTEIO)
      }

      //   ipfs.files.read(itemPath, { offset: pos, count: len }, (err, part) => {
      //   if (err) {
      //     err = explain(err, 'Failed to read itemPath')
      //     debug(err)
      //     return reply(Fuse.EREMOTEIO)
      //   }
      //
      //   part.copy(buf)
      //   reply(part.length)
      // })
    }
  }
}
