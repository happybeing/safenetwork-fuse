const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops')

module.exports = (safeVfs) => {
  return {
    write (itemPath, fd, buf, len, pos, reply) {
      try {
        debug('write(\'%s\', %s, buf, %s, %s)', itemPath, fd, len, pos)

        safeVfs.getHandler(itemPath).write(itemPath, fd, buf, len, pos).then((bytes) => {
          debug('wrote %s bytes', bytes)
          debug('data: %s', buf.slice(0, bytes))
          reply(bytes)
        })
      } catch (err) {
        let e = explain(err, 'Failed to write file: ' + itemPath)
        debug(e)
        reply(Fuse.EREMOTEIO)
      }

  //   write (itemPath, fd, buf, len, pos, reply) {
  //     debug('write(\'%s\', %s, buf, %n, %n)', itemPath, fd, len, pos)
  //
  //     ipfs.files.write(itemPath, buf, { offset: pos, count: len }, (err) => {
  //       if (err) {
  //         err = explain(err, 'Failed to write to file')
  //         debug(err)
  //         return reply(Fuse.EREMOTEIO)
  //       }
  //       reply(len)
  //     })
    }
  }
}
