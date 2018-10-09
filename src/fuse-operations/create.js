const Fuse = require('fuse-bindings')
const debug = require('debug')('safe-fuse:ops')

module.exports = (safeVfs) => {
  return {
    create (itemPath, mode, reply) {
      try {
        debug('create(\'%s\', %s)', itemPath, mode)

        safeVfs.getHandler(itemPath).create(itemPath, mode).then((fd) => {
          debug('created file (%s): %s', fd, itemPath)
          reply(0, fd)
        }).catch((e) => { throw e })
      } catch (e) {
        debug('failed to create file: ', itemPath)
        debug(e)
        reply(Fuse.EREMOTEIO)
      }
    }
  }
}
