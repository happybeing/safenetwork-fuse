const Fuse = require('fuse-bindings')
const debug = require('debug')('safe-fuse:ops')

module.exports = (safeVfs) => {
  return {
    rename (itemPath, newPath, reply) {
      try {
        debug('rename(\'%s\', \'%s\')', itemPath, newPath)
        let fuseResult = safeVfs.vfsCache().renameVirtual(itemPath, newPath)
        if (fuseResult) {
          debug('Renamed: %s, to: %s', itemPath, newPath)
          return reply(fuseResult.returnCode, fuseResult.returnObject)
        }

        safeVfs.getHandler(itemPath).rename(itemPath, newPath).then((result) => {
          if (result) {
            debug('Renamed: %s, to: %s', itemPath, newPath)
            return reply(0)
          }
          debug('Rename failed - operation not supported')
          reply(Fuse.EOPNOTSUPP) // Don't allow rename of directories etc
        }).catch((e) => { throw e })
      } catch (err) {
        debug('Failed to rename: %s, to: %s', itemPath, newPath)
        debug(err)
        reply(Fuse.EREMOTEIO)
      }
    }
  }
}
