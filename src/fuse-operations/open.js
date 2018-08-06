// const Fuse = require('fuse-bindings')
const debug = require('debug')('fuse-op:open')

module.exports = (ipfs, fds) => {
  return {
    open (itemPath, flags, reply) {
      debug({ itemPath, flags })
      reply(0, 42)
    }
  }
}
