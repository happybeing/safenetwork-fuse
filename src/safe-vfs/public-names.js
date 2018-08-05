const path = require('path')  // Cross platform path handling

/**
 * vfsHandler for the _publicNames container
 *
 */
class PublicNamesHandler {
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

  getHandlerFor (itemPath) {}
}

module.exports = PublicNamesHandler
