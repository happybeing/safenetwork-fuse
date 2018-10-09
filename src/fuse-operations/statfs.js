const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safe-fuse:ops')

/* statfs - get filesystem statistics
Refs:
  http://man7.org/linux/man-pages/man2/statfs.2.html
  http://www.tutorialspoint.com/unix_system_calls/statfs.htm
*/

module.exports = (safeVfs) => {
  return {
    statfs (itemPath, reply) {
      try {
        debug('statfs(\'%s\')', itemPath)
        safeVfs.getHandler(itemPath).statfs(itemPath).then((stat) => {
          // TODO: Review this cos "I have no idea what I'm doing" - IPFS coder
          // https://github.com/mafintosh/fuse-bindings#opsstatfsitemPath-cb
          // https://github.com/mafintosh/fuse-bindings/blob/032ed16e234f7379fbf421c12afef592ab2a292d/fuse-bindings.cc#L771-L783
          // http://man7.org/linux/man-pages/man2/statfs.2.html

          // In FUSE these are all Uint32Value
          const data = {
            bsize: 8, // TODO: Because 8 bits in a byte right?
            frsize: 0, // TODO: No idea...
            blocks: stat.repoSize.gt(Number.MAX_SAFE_INTEGER)
              ? Number.MAX_SAFE_INTEGER // TODO: have to reply with int32
              : parseInt(stat.repoSize.toFixed()), // If blocks are bytes?
            bfree: stat.storageMax.minus(stat.repoSize).gt(Number.MAX_SAFE_INTEGER)
              ? Number.MAX_SAFE_INTEGER // TODO: have to reply with int32
              : parseInt(stat.storageMax.minus(stat.repoSize).toFixed()), // TODO: because blocks are bytes?
            bavail: stat.storageMax.minus(stat.repoSize).gt(Number.MAX_SAFE_INTEGER)
              ? Number.MAX_SAFE_INTEGER // TODO: have to reply with int32
              : parseInt(stat.storageMax.minus(stat.repoSize).toFixed()), // TODO: because blocks are bytes?
            files: stat.numObjects.gt(Number.MAX_SAFE_INTEGER)
              ? Number.MAX_SAFE_INTEGER // TODO: have to reply with int32
              : parseInt(stat.numObjects.toFixed()),
            ffree: Number.MAX_SAFE_INTEGER, // TODO: no idea how to work this out
            favail: Number.MAX_SAFE_INTEGER, // TODO: no idea how to work this out
            fsid: 0, // TODO: WHAT IS?
            flag: 0, // TODO: does fuse know this?
            namemax: Number.MAX_SAFE_INTEGER // TODO: get from OS?
          }

          debug(data)
          reply(0, data)
        }).catch((e) => { throw e })
      } catch (err) {
        let e = explain(err, 'Failed to stat: ' + itemPath)
        debug(e)
        reply(Fuse.EREMOTEIO)
      }
    }

    /* TODO delete the IPFS version:
    debug('statfs(\'%s\')', itemPath)
    ipfs.repo.stat((err, stat) => {
      if (err) {
        err = explain(err, 'Failed to stat repo')
        debug(err)
        return reply(Fuse.EREMOTEIO)
      }

      // I have no idea what I'm doing.
      // https://github.com/mafintosh/fuse-bindings#opsstatfsitemPath-cb
      // https://github.com/mafintosh/fuse-bindings/blob/032ed16e234f7379fbf421c12afef592ab2a292d/fuse-bindings.cc#L771-L783
      // http://man7.org/linux/man-pages/man2/statfs.2.html
      const data = {
        bsize: 8, // TODO: Because 8 bits in a byte right?
        frsize: 0, // TODO: No idea...
        blocks: stat.repoSize.gt(Number.MAX_SAFE_INTEGER)
          ? Number.MAX_SAFE_INTEGER // TODO: have to reply with int32
          : parseInt(stat.repoSize.toFixed()), // If blocks are bytes?
        bfree: stat.storageMax.minus(stat.repoSize).gt(Number.MAX_SAFE_INTEGER)
          ? Number.MAX_SAFE_INTEGER // TODO: have to reply with int32
          : parseInt(stat.storageMax.minus(stat.repoSize).toFixed()), // TODO: because blocks are bytes?
        bavail: stat.storageMax.minus(stat.repoSize).gt(Number.MAX_SAFE_INTEGER)
          ? Number.MAX_SAFE_INTEGER // TODO: have to reply with int32
          : parseInt(stat.storageMax.minus(stat.repoSize).toFixed()), // TODO: because blocks are bytes?
        files: stat.numObjects.gt(Number.MAX_SAFE_INTEGER)
          ? Number.MAX_SAFE_INTEGER // TODO: have to reply with int32
          : parseInt(stat.numObjects.toFixed()),
        ffree: Number.MAX_SAFE_INTEGER, // TODO: no idea how to work this out
        favail: Number.MAX_SAFE_INTEGER, // TODO: no idea how to work this out
        fsid: 0, // TODO: WHAT IS?
        flag: 0, // TODO: does fuse know this?
        namemax: Number.MAX_SAFE_INTEGER // TODO: get from OS?
      }

      debug(data)
      reply(0, data)
    }) */
  }
}
