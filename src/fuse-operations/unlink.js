const Fuse = require('fuse-bindings')
const debug = require('debug')('safe-fuse:ops')

module.exports = (safeVfs) => {
  return {
    unlink (itemPath, reply) {
      try {
        debug('unlink(\'%s\')', itemPath)

        safeVfs.getHandler(itemPath).unlink(itemPath).then((result) => {
          debug('unlinked: %s', itemPath)
          reply(0)
        }).catch((e) => { throw e })
      } catch (err) {
        debug('Failed to unlink: ' + itemPath)
        debug(err)
        reply(Fuse.EREMOTEIO)
      }
    }
  }
}
