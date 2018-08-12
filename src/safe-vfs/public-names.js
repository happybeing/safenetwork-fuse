// TODO I don't think this class is needed because the
// RootHandler can be used with a PublicNamesContainer class
// to handle public name specifics

const path = require('path')  // Cross platform path handling

const debug = require('debug')('safe-fuse-vfs:dns')

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
    throw new Error('PublicNamesHandler not needed see TODO at line one')
  }

  getHandlerFor (itemPath) {}

  // Fuse operations:
  async readdir (itemPath) { debug('TODO readdir(' + itemPath + ') not implemented'); return {} }
  async mkdir (itemPath) { debug('TODO mkdir(' + itemPath + ') not implemented'); return {} }
  async statfs (itemPath) { debug('TODO statfs(' + itemPath + ') not implemented'); return {} }
  async getattr (itemPath) { debug('TODO getattr(' + itemPath + ') not implemented'); return {} }
  async create (itemPath) { debug('TODO create(' + itemPath + ') not implemented'); return {} }
  async open (itemPath) { debug('TODO open(' + itemPath + ') not implemented'); return {} }
  async write (itemPath) { debug('TODO write(' + itemPath + ') not implemented'); return {} }
  async read (itemPath) { debug('TODO read(' + itemPath + ') not implemented'); return {} }
  async unlink (itemPath) { debug('TODO unlink(' + itemPath + ') not implemented'); return {} }
  async rmdir (itemPath) { debug('TODO rmdir(' + itemPath + ') not implemented'); return {} }
  async rename (itemPath) { debug('TODO rename(' + itemPath + ') not implemented'); return {} }
  async ftruncate (itemPath) { debug('TODO ftruncate(' + itemPath + ') not implemented'); return {} }
  async mknod (itemPath) { debug('TODO mknod(' + itemPath + ') not implemented'); return {} }
  async utimens (itemPath) { debug('TODO utimens(' + itemPath + ') not implemented'); return {} }
}

module.exports = PublicNamesHandler
