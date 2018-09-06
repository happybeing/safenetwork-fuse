const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops:open')

module.exports = (safeVfs) => {
  return {
    open (itemPath, flags, reply) {
      try {
        debug('open(\'%s\', %s)', itemPath, flags)

        safeVfs.getHandler(itemPath).open(itemPath, flags).then((file) => {
          debug('open success')
          reply(0, file)  // TODO does file work??? 42 is a file descriptor (https://github.com/mafintosh/fuse-bindings#opsopenpath-flags-cb)
        })
      } catch (err) {
        let e = explain(err, 'Failed to open: ' + itemPath)
        debug(e)
        reply(Fuse.EREMOTEIO)
      }
    }
    // open (itemPath, flags, reply) {
    //   debug({ itemPath, flags })
    //   reply(0, 42)
    // }
  }
}
