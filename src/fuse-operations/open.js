const Fuse = require('fuse-bindings')
const debug = require('debug')('safe-fuse:ops')

module.exports = (safeVfs) => {
  return {
    open (itemPath, flags, reply) {
      try {
        debug('open(\'%s\', 0x%s)', itemPath, Number(flags).toString(16))

        // (https://github.com/mafintosh/fuse-bindings#opsopenpath-flags-cb)
        safeVfs.getHandler(itemPath).open(itemPath, flags).then((fd) => {
          debug('open returning fd: %s', fd)
          reply(0, fd)
        }).catch((e) => { throw e })
      } catch (err) {
        debug('Failed to open: ' + itemPath)
        debug(err)
        reply(Fuse.EREMOTEIO)
      }
    }
  }
}
