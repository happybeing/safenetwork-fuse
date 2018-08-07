const path = require('path')  // Cross platform path handling

const debug = require('debug')('safe-fuse-vfs:nfs')

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
 *
 * This handler is created to handle operations on a mountPath for
 * which there is a SAFE NFS MutableData (MD) container. That MD container
 * will appear at the mountPath, with the keys MD used as relative paths
 * from the mountPath.
 *
 * So if the mountPath is /thing and an MD entry exists with key
 * /folder/file.txt, the latter will have a full path relative to
 * the FUSE mount point of /thing/folder/file.txt. If the FUSE mount
 * point was /home/user/SAFE then the complete path on the mounted
 * filesystem would be /home/user/SAFE/thing/folder/file.txt
 *
 * In the above case, the NfsHandler will appear in VFS pathMap at
 * the path /thing and so will be called to handler FUSE operations
 * for any path beginning with /thing (ie the mountPath of this handler).
 *
 * The safePath is what allows the NFS handler to identify the corresponding
 * MutableData (which must be set-up and operated on for SAFE NFS emulation).
 *
 * So a safePath of _public/documents must correspond to a suitable entry
 * in the SAFE _public container, where the value of the /_public/documents
 * entry is the corresponding MD.
 *
 * TODO support safePath of arbitrary MDs, not just those in a SAFE root
 * container. For example an xor address, and or a way of specifying the MD
 * of a services entry based on a safe URI (such as safe://blog.happybeing)
 */
class NfsHandler {
/**
 * Constructor
 * @param {[type]} safeVfs        the VFS object
 * @param {[type]} safePath       mounted path (e.g. _public/something)
 * @param {[type]} mountPath      where safePath appears relative to filesystem mount point
 * @param {[type]} lazyInitialise [description]
 */
  constructor (safeVfs, safePath, mountPath, lazyInitialise) {
    this._safeVfs = safeVfs
    this._safePath = safePath
    this._safePath = safePath
    this._lazyInitialise = lazyInitialise
  }

  getHandlerFor (itemPath) {
    debug('getHandlerFor(%o) - safePath: %o, mountPath: %o', itemPath, this._safePath, this._mountPath)
    let directory = path.dirname(itemPath)
    if (directory === path.dirname(this._mountPath)) {
      return this
    }

    throw new Error('NfsHandler getHandlerFor() failed on itemPath:' + itemPath)
  }

  // Fuse operations:
  async readdir (itemPath) { debug('readdir(' + itemPath + ')'); return fakeReadDir[itemPath] }
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

module.exports = NfsHandler
