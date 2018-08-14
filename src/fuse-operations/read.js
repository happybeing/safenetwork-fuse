const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops:read')

module.exports = (ipfs) => {
  return {
    read (itemPath, fd, buf, len, pos, reply) {
      debug({ itemPath, fd, len, pos })

      ipfs.files.read(itemPath, { offset: pos, count: len }, (err, part) => {
        if (err) {
          err = explain(err, 'Failed to read itemPath')
          debug(err)
          return reply(Fuse.EREMOTEIO)
        }

        part.copy(buf)
        reply(part.length)
      })
    }
  }
}
