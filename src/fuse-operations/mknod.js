const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops')

module.exports = (ipfs) => {
  return {
    mknod (itemPath, mode, dev, reply) {
      debug('mknod(\'%s\', %s, %s)', itemPath, mode, dev)

      ipfs.files.write(itemPath, Buffer.from(''), { create: true }, (err) => {
        if (err) {
          err = explain(err, 'Failed to create device node')
          debug(err)
          return reply(Fuse.EREMOTEIO)
        }
        reply(0)
      })
    }
  }
}
