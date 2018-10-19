const Fuse = require('fuse-bindings')
// const explain = require('explain-error')
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
        return reply(Fuse.EREMOTEIO)
      } catch (e) {
        debug(e)
        debug('Failed to create directory: %s', itemPath)
        return reply(Fuse.EREMOTEIO)
      }
    }
  }
}

// module.exports = (ipfs) => {
//   return {
//     rmdir (itemPath, reply) {
//       debug('TODO: implement fuse operation: rmdir'); return reply(Fuse.EREMOTEIO)
//
//       debug('rmdir(\'%s\')', itemPath)
//
//       ipfs.files.rm(itemPath, { recursive: true }, (err) => {
//         if (err) {
//           err = explain(err, 'Failed to delete directory')
//           debug(err)
//           return reply(Fuse.EREMOTEIO)
//         }
//         reply(0)
//       })
//     }
//   }
// }
