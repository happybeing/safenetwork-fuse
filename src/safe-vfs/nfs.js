const path = require('path')  // Cross platform path handling

const debug = require('debug')('safe-fuse:vfs:nfs')

/**
 * vfsHandler for an NFS container
 *
 * This handler is created to handle operations on a mountPath for
 * which there is a SAFE NFS MutableData (MD) container. That MD container
 * will appear at the mountPath, with the keys in that used as relative paths
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
    if (!lazyInitialise) this.nfs() // Force init now
  }

  // NfsContainer wrapper for file operations on a Mutable Data (using SAFE 'NFS' emulation)
  nfs () {
    if (this._nfs !== undefined) return this._nfs
    let promise = new Promise((resolve, reject) => {
      let nfsContainer
      try { // First try and 'mount' existing share
        nfsContainer = this._safeVfs.safeJs().getNfsContainer(this._safePath, false)
      } catch (err) {
        // If that fails try creating it
        if (!nfsContainer) {
          let isPublic = this._safeVfs.safeJs().isPublicContainer(this.safePath.split('/')[0])
          nfsContainer = this._safeVfs.safeJs().getNfsContainer(this._safePath, true, isPublic)
        }
      }
      if (nfsContainer) {
        resolve(nfsContainer)
      } else {
        reject(new Error('NfsHandler failed to mount container at ' + this._safePath))
      }
    })
    promise.then((nfs) => {
      this._nfs = nfs
      return nfs
    })
  }

  getHandlerFor (itemPath) {
    debug('getHandlerFor(%s) - safePath: %s, mountPath: %s', itemPath, this._safePath, this._mountPath)
    let directory = path.dirname(itemPath)
    if (directory === path.dirname(this._mountPath)) {
      return this
    }

    throw new Error('NfsHandler getHandlerFor() failed on itemPath:' + itemPath)
  }

  // Fuse operations:
  async readdir (itemPath) { debug('PublicContainer readdir(' + itemPath + ')'); return this.nfs().listFolder(itemPath).catch((e) => { debug(e.message) }) }
  async mkdir (itemPath) { debug('TODO PublicContainer mkdir(' + itemPath + ') not implemented'); return {} }
  async statfs (itemPath) { debug('PublicContainer statfs(' + itemPath + ')'); return this.nfs().itemInfo(itemPath).catch((e) => { debug(e.message) }) }
  async getattr (itemPath) { debug('PublicContainer getattr(' + itemPath + ')'); return this.nfs().itemAttributes(itemPath).catch((e) => { debug(e.message) }) }
  async create (itemPath) { debug('TODO PublicContainer create(' + itemPath + ') not implemented'); return {} }
  async open (itemPath) { debug('TODO PublicContainer open(' + itemPath + ') not implemented'); return {} }
  async write (itemPath) { debug('TODO PublicContainer write(' + itemPath + ') not implemented'); return {} }
  async read (itemPath) { debug('TODO PublicContainer read(' + itemPath + ') not implemented'); return {} }
  async unlink (itemPath) { debug('TODO PublicContainer unlink(' + itemPath + ') not implemented'); return {} }
  async rmdir (itemPath) { debug('TODO PublicContainer rmdir(' + itemPath + ') not implemented'); return {} }
  async rename (itemPath) { debug('TODO PublicContainer rename(' + itemPath + ') not implemented'); return {} }
  async ftruncate (itemPath) { debug('TODO PublicContainer ftruncate(' + itemPath + ') not implemented'); return {} }
  async mknod (itemPath) { debug('TODO PublicContainer mknod(' + itemPath + ') not implemented'); return {} }
  async utimens (itemPath) { debug('TODO PublicContainer utimens(' + itemPath + ') not implemented'); return {} }
}

module.exports = NfsHandler
