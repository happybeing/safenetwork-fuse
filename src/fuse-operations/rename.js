const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops')

module.exports = (ipfs) => {
  return {
    rename (src, dest, reply) {
      debug('TODO: implement fuse operation: rename'); return reply(Fuse.EREMOTEIO)

      debug({ src, dest })

      ipfs.files.mv([src, dest], (err) => {
        if (err) {
          err = explain(err, 'Failed to mv itemPath')
          debug(err)
          return reply(Fuse.EREMOTEIO)
        }
        reply(0)
      })
    }
  }
}
