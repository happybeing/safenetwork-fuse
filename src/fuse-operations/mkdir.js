const Fuse = require('fuse-bindings')
// const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops')

module.exports = (safeVfs) => {
  return {
    mkdir (itemPath, mode, reply) {
      try {
        debug('mkdir(\'%s\', %s)', itemPath, mode)
        let fuseResult = safeVfs.vfsCache().mkdirVirtual(itemPath, mode)
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
//     mkdir (itemPath, mode, reply) {
//       debug('TODO: implement fuse operation: mkdir'); return reply(Fuse.EREMOTEIO)
//
//       debug({ itemPath, mode })
//
//       ipfs.files.mkdir(itemPath, (err) => {
//         if (err) {
//           err = explain(err, 'Failed to create directory')
//           debug(err)
//           return reply(Fuse.EREMOTEIO)
//         }
//         reply(0)
//       })
//     }
//   }
// }
