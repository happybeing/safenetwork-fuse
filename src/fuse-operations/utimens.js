const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops')

module.exports = (ipfs) => {
  return {
    utimens (itemPath, atime, mtime, reply) {
      debug('TODO: implement fuse operation: utimens'); return reply(Fuse.EREMOTEIO)

      debug('utimens(\'%s\', %s, %s)', itemPath, atime, mtime)

      ipfs.files.stat(itemPath, (err) => {
        if (err && err.message === 'file does not exist') {
          ipfs.files.write(itemPath, Buffer.from(''), { create: true }, (err) => {
            if (err) {
              err = explain(err, 'Failed to create file')
              debug(err)
              return reply(Fuse.EREMOTEIO)
            }
            reply(0)
          })
        }
        reply(0)
      })
    }
  }
}
