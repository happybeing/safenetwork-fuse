const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops:open')

module.exports = (safeVfs) => {
  return {
    open (itemPath, flags, reply) {
      try {
        debug('open(\'%s\', %s)', itemPath, flags)

        // (https://github.com/mafintosh/fuse-bindings#opsopenpath-flags-cb)
        safeVfs.getHandler(itemPath).open(itemPath, flags).then((fd) => {
          debug('open success')
          reply(0, fd)
        })
      } catch (err) {
        let e = explain(err, 'Failed to open: ' + itemPath)
        debug(e)
        reply(Fuse.EREMOTEIO)
      }
    }
  }
}
