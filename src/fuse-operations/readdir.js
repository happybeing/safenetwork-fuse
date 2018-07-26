const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('ipfs-fuse:readdir')

async function callSafeApi (safeApi, path) { // TODO testing only
  console.log('callSafeApi(' + path + ')')
}

const fakeReadDir = {
  '/': ['one', 'two', 'three'],
  '/one': ['four', 'five', 'happybeing']
}

const fakeGetattr = {
  '/': 'directory',
  '/one': 'directory',
  '/two': 'file',
  '/three': 'file',
  '/one/four': 'file',
  '/one/five': 'file',
  '/one/happybeing': 'file'
}
/*
 * Pseudocode for a SAFE VFS implementation of readdir()
 *
module.exports = (safeVfs) => {
  return {
    readdir (path, cb) {
      debug({ path })
      try {
        cb(0, await safeVfs.fuseHandler(path).readdir(path))
        catch (err) {
          err = explain(err, 'Failed to readdir path: ' + path)
          debug(err)
          cb(Fuse.EREMOTEIO)
        }
      })
    }
  }
}
 */
module.exports = (ipfs) => {
  return {
    readdir (path, reply) {
      debug({ path })
      callSafeApi(ipfs, path).then(() => { // TODO testing only
        console.log('done callSafeApi on path: ' + path)
      })

      let listing = fakeReadDir[path]
      if (listing)
        reply(0, listing)
      else
        reply(Fuse.EREMOTEIO)

      /*
      ipfs.files.ls(path, (err, files) => {
        if (err) {
          err = explain(err, 'Failed to ls path')
          debug(err)
          return reply(Fuse.EREMOTEIO)
        }
        reply(0, files.map(f => f.name || f.hash))
      })*/
    }
  }
}
