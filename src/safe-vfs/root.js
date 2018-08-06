const path = require('path')  // Cross platform path handling

const debug = require('debug')('safe-vfs:root')
const NfsHandler = require('./nfs')
const PublicNamesHandler = require('./public-names')

/**
 * vfsHandler for the root mount point (i.e. '/' on *nix)
 *
 * The RootHandler is the fallback if a handler has not been created for
 * an item. In that case it will attempt to create a suitable handler object
 * based on the itemPath. This acts like an automount for paths not yet known
 * to the SafeVfs object's pathMap.
 *
 * The RootHandler is special because it creates handlers for the root
 * SAFE containers (_public, _publicNames, _documents etc) if they don't
 * yet exist in the VFS pathMap, and does so based on the itemPath
 * rather than the mountPath which the other handlers use.
 *
 * This is because when, for example the PublicNames handler creates
 * a ServicesHandler the itemPath is not known beforehand, whereas
 * the RootHandler always has 'root' as both mountPath and itemPath.
 *
 * NOTE: mountPath is relative to the filesystem mount point, so
 * mountPath 'root' corresponds to the path of the filesystem mount point.
 */

// Class used to handle each of the standard SAFE containers
// TODO ensure this list keeps in step with the available SAFE containers
const ContainerHandlerClasses = {
  '_public': NfsHandler,
  '_documents': NfsHandler,
  '_music': NfsHandler,
  '_video': NfsHandler,
  '_photos': NfsHandler,
  '_publicNames': PublicNamesHandler
}

class RootHandler {
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
    this._mountPath = mountPath
    this._lazyInitialise = lazyInitialise
  }

  /**
   * get the handler for item contained by this._mountPath (create handler if necessary)
   *
   * See class description for more
   *
   * @param  {string} itemPath mounted path
   * @return {VfsHandler}      handler for itemPath (can be this)
   */
  getHandlerFor (itemPath) {
    try {
      // This is redundant for the RootHandler only, but left here as a template
      let directory = path.dirname(itemPath)
      if (directory === this._mountPath) {
        return this
      }

      // RootHandler::getHanlerFor() is only called if there is no SAFE
      // VFS pathMap entry that matches the start of itemPath. When this
      // happens this attempts to mount the SAFE container which corresponds
      // to the itemPath.

      let itemRoot = path.sep + itemPath.split(path.sep)[0]
      let HandlerClass = ContainerHandlerClasses[itemRoot]
      if (!HandlerClass) {
        throw new Error('no suitable VFS handler class for path: ' + itemPath)
      }

      let handler = new HandlerClass(this._safeVfs, itemRoot, itemRoot, false)
      if (handler) {
        this._safeVfs.pathMapSet(itemRoot, handler)
      } else {
        throw new Error('failed to create VFS handler for path: ' + itemPath)
      }
    } catch (err) {
      console.error('RootHandler error - ' + err.message)
      throw err
    }
  }

  // Fuse operations:
  async readdir (itemPath) {
    let listing = []
    this._safeVfs.pathMap().forEach((value, key, pathMap) => {
      // List items contained by itemPath or the item at itemPath
// TODO      if (key.IndexOf(itemPath)
//      let rootDir = itemPath.split(path.sep)[0]

      // TODO remove this (debug only):
      // Add the pathMap
      // Remove up to first separator (strips leading '/' or on Windows 'C:/')
      key = key.substring(key.split(path.sep)[0].length + 1)
      if (key.length) {
        listing.push(key)
      }
    })
    return listing
  }

  async mkdir (itemPath) { debug('TODO mkdir(' + itemPath + ') not implemented'); return {} }
  async statfs (itemPath) { debug('TODO statfs(' + itemPath + ') not implemented'); return {} }
  async getattr (itemPath) { debug('TODO getattr(' + itemPath + ') not implemented'); return {} }
  async create (itemPath) { debug('TODO create(' + itemPath + ') not implemented'); return {} }
  async open (itemPath) { debug('TODO open(' + itemPath + ') not implemented'); return {} }
  async write (itemPath) { debug('TODO write(' + itemPath + ') not implemented'); return {} }
  async read (itemPath) { debug('TODO read(' + itemPath + ') not implemented'); return {} }
  async unlink (itemPath) { debug('TODO unlink(' + itemPath + ') not implemented'); return {} }
  async rmdir (itemPath) { debug('TODO rmdir(' + itemPath + ') not implemented'); return {} }
  async write (itemPath) { debug('TODO write(' + itemPath + ') not implemented'); return {} }
  async rename (itemPath) { debug('TODO rename(' + itemPath + ') not implemented'); return {} }
  async write (itemPath) { debug('TODO write(' + itemPath + ') not implemented'); return {} }
  async ftruncate (itemPath) { debug('TODO ftruncate(' + itemPath + ') not implemented'); return {} }
  async mknod (itemPath) { debug('TODO mknod(' + itemPath + ') not implemented'); return {} }
  async utimens (itemPath) { debug('TODO utimens(' + itemPath + ') not implemented'); return {} }
}

module.exports = RootHandler
