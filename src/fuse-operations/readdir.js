const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops')

module.exports = (safeVfs) => {
  return {
    readdir (itemPath, reply) {
      try {
        debug('readdir(\'%s\')', itemPath)
        let fuseResult = safeVfs.vfsCache().readdirVirtual(itemPath)
        if (fuseResult) {
          // Add any virtual directories to the itemPath directory's listing
          fuseResult.returnObject = safeVfs.vfsCache().mergeVirtualDirs(itemPath, fuseResult.returnObject)
          return reply(fuseResult.returnCode, fuseResult.returnObject)
        }

        safeVfs.getHandler(itemPath).readdir(itemPath).then((result) => {
          // Add any virtual directories to the itemPath directory's listing
          result = safeVfs.vfsCache().mergeVirtualDirs(itemPath, result)
          reply(0, result)
        }).catch((e) => { throw e })
      } catch (err) {
        let e = explain(err, 'Failed to readdir: ' + itemPath)
        debug(e)
        reply(Fuse.EREMOTEIO)
      }
    }
  }
}
