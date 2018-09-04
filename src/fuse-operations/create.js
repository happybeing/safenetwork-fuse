const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops')

module.exports = (ipfs) => {
  return {
    write (itemPath, mode, reply) {
      debug('create(\'%s\', %s)', itemPath, mode)
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
