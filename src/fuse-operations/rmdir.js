const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('fuse-op:rmdir')

module.exports = (ipfs) => {
  return {
    rmdir (itemPath, reply) {
      debug({ itemPath })

      ipfs.files.rm(itemPath, { recursive: true }, (err) => {
        if (err) {
          err = explain(err, 'Failed to delete directory')
          debug(err)
          return reply(Fuse.EREMOTEIO)
        }
        reply(0)
      })
    }
  }
}
