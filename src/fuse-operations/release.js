const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops')

module.exports = (safeVfs) => {
  return {
    release (itemPath, fd, reply) {
      try {
        debug('release(\'%s\', %s)', itemPath, fd)

        safeVfs.getHandler(itemPath).close(itemPath, fd).then(() => {
          debug('released file descriptor %s', fd)
          reply(0)
        }).catch((e) => { throw e })
      } catch (err) {
        let e = explain(err, 'Failed to close file: ' + itemPath)
        debug(e)
        reply(Fuse.EREMOTEIO)
      }
    }
  }
}
