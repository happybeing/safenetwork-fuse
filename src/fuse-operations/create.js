const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops')

module.exports = (safeVfs) => {
  return {
    create (itemPath, mode, reply) {
      try {
        debug('create(\'%s\', %s)', itemPath, mode)

        safeVfs.getHandler(itemPath).create(itemPath, mode).then((fd) => {
          debug('created file (%s): ', fd, itemPath)
          reply(fd)
        })
      } catch (err) {
        let e = explain(err, 'Failed to create file: ' + itemPath)
        debug(e)
        reply(Fuse.EREMOTEIO)
      }

    // write (itemPath, mode, reply) {
    //   debug('create(\'%s\', %s)', itemPath, mode)
    //   ipfs.files.write(itemPath, Buffer.from(''), { create: true }, (err) => {
    //     if (err) {
    //       err = explain(err, 'Failed to create file')
    //       debug(err)
    //       return reply(Fuse.EREMOTEIO)
    //     }
    //     reply(0)
    //   })
    }
  }
}
