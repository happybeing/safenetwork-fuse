const Fuse = require('fuse-bindings')
const debug = require('debug')('safe-fuse:ops')

module.exports = (safeVfs) => {
  return {
    rmdir (itemPath, reply) {
      try {
        debug('rmdir(\'%s\', %s)', itemPath)
        let fuseResult = safeVfs.vfsCache().rmdirVirtual(itemPath)
        if (fuseResult) {
          return reply(fuseResult.returnCode)
        }
        reply(Fuse.EREMOTEIO)
      } catch (e) {
        debug(e)
        debug('Failed to delete directory: %s', itemPath)
        return reply(Fuse.EREMOTEIO)
      }
    }
  }
}
