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
          // (https://github.com/mafintosh/fuse-bindings#opsopenpath-flags-cb)
          // IPFS FUSE returned a file descriptor value of 42 which I guess is a joke
          let fd = 1234 // TODO Consider using file descriptors in SafenetworkJs (see TODOs there)
          reply(0, fd)
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
