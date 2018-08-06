const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('fuse-op:unlink')

module.exports = (ipfs) => {
  return {
    unlink (itemPath, reply) {
      debug({ itemPath })

      ipfs.files.rm(itemPath, (err) => {
        if (err) {
          err = explain(err, 'Failed to delete file')
          debug(err)
          return reply(Fuse.EREMOTEIO)
        }
        reply(0)
      })
    }
  }
}
