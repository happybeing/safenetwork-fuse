const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse-op:create')

module.exports = (ipfs) => {
  return {
    write (itemPath, mode, reply) {
      debug({ itemPath })
      ipfs.files.write(itemPath, Buffer.from(''), { create: true }, (err) => {
        if (err) {
          err = explain(err, 'Failed to create file')
          debug(err)
          return reply(Fuse.EREMOTEIO)
        }
        reply(0)
      })
    }
  }
}
