const path = require('path')  // Cross platform path handling

const fakeReadDir = {
  '/': ['_public', 'two', 'three'],
  '/_public': ['four', 'five', 'happybeing']
}

const fakeGetattr = {
  '/': 'directory',
  '/_public': 'directory',
  '/two': 'file',
  '/three': 'file',
  '/_public/four': 'file',
  '/_public/five': 'file',
  '/_public/happybeing': 'file'
}

/**
 * vfsHandler for an NFS container
 */
class NfsHandler {
/**
/**
 * Constructor
 * @param {[type]} safeVfs        the VFS object
 * @param {[type]} safePath       mounted path (always '/') (e.g. _publicNames, _public)
 * @param {[type]} mountPath      where safePath appears relative to filesystem mount point
 * @param {[type]} lazyInitialise [description]
 */
  constructor (safeVfs, safePath, mountPath, lazyInitialise) {
    this._safeVfs = safeVfs
    this._safePath = safePath
    this._safePath = safePath
    this._lazyInitialise = lazyInitialise
  }

  // Return???
  getHandlerFor (itemPath) {
    let directory = path.dirname(itemPath)
    if (directory === this._mountPath) {
      return this
    }

    throw new Error('NfsHandler getHandlerFor() failed on itemPath:' + itemPath)
  }

  // Fuse operations:
  async readdir (itemPath) { return fakeReadDir[itemPath] }
}

module.exports = NfsHandler
