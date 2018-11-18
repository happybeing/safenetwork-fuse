const Fuse = require('fuse-bindings')
const SafeJsApi = require('safenetworkjs')
const debug = require('debug')('safe-fuse:vfs-cache')

/**
 * class implementing a filesystem cache that also supports empty directories
 *
 * Used for:
 * - accessing cached directory content (readdir)
 * - accessing cached attributes (getattr)
 * - directory existence (mkdir/rmdir)
 * - empty directories for the life of a session
 *
 * This serves two purposes:
 * - speeds up access to filesystem, particularly the frequent
 *   calls FUSE makes to getattr() which are slow as implemented by
 *   SafenetorkJs
 * - enables empty directories to be created and removed (mkdir/rmdir)
 *   which is not supported by SAFE NFS (or SafenetworkJs)
 *
 * CACHE IMPLEMENTATION
 * The caching of filesystem operations relies on the cache feature of
 * SafenetworkJs SafeContainer. VfsCaching checks the container's cache
 * before asking the contaicloseVner to get the result.
 *
 * In addition to this, it may 'piggy-back' the FUSE result on top of
 * the cached container result.
 *
 * VfsCaching has a helper for each FUSE operation, so the
 * implementation inside getattr() can be simplified to a single call:
 *    let result = vfsCacheMap.getattr(itemPath)
 *
 * @private
 */

class VfsCaching {
  constructor (safeVfs) {
    this._safeVfs = safeVfs

    /**
     * Virtual directory map:
     * - each _directoryMap entry corresponds to a directory path
     * - the entry is undefined unless the path exists
     * - if the entry is 'true', it exists but has unknown content
     * - otherwise it holds an object which is a map of the directory
     *   where each key is the name of a directory entry, which has a
     *   value of:
     *   - true it if exists, but no attribute information is cached
     *   - the last obtained attribute information for the object
     * @private
     * @type {Array}
     */
    this._directoryMap = []
  }

  /**
   * Virtual Directory API For FUSE Operations
   *
   * The following functions implement virtual directories which are
   * overlaid on top of the SafenetworkJs container based filesystem, which
   * knows nothing about them. This is necessary to allow the creation of
   * empty directories, because empty directories are not supported in the
   * SAFE NFS API, or in SafenetworkJs.
   *
   * @private
   *
   * Each virtual directory operation:
   * @return {FuseResult} an object if the action is complete, or undefined
   * if the action should passed on to the non-virtual implementation.
   *
   * Implementation
   *
   * _directoryMap[] contains a minimised map of virtual paths, not
   * one entry per directory.
   *
   * Example virtual directory tree:
   *  a---b
   *   \--c
   *       \--d
   * Will be represented by two _directoryMap entries, not four, as follows:
   *  /a/b
   *  /a/c/d
   * So '/a' only existed while it had no content.
   *
   * Minimisation applies for directories that contain files too, so that
   * as soon as a virtual path contains a file, it becomes real and the
   * path is removed from _directoryMap.
   */

  // Note: deleting (unlink) the last file in a SAFE NFS 'fake' directory
  // will cause the directory to be empty, and so disappear. This implementation
  // of virtual directories assumes that is ok, and does not create a
  // virtual directory to simulate deletion of the last file, which should
  // ideally leave an empty directory.

  // Assumes FUSE will only mkdir() if it doesn't exist yet
  mkdirVirtual (itemPath) {
    debug('rmdirVirtual(%s)...', itemPath)
    if (itemPath.substr(itemPath.length) === '/') {
      itemPath = itemPath.substr(1, itemPath.length - 1)
    }

    if (itemPath === '') return new FuseResult(Fuse.EEXIST)

    this._directoryMap[itemPath] = true
    this._minimiseSubpathsOf(itemPath)
    this._debugListVirtualDirectories('mkdirVirtual(%s)...', itemPath)

    return new FuseResult(0)
  }

  _minimiseSubpathsOf (directoryPath) {
    let nextDir = SafeJsApi.parentPathNoDot(directoryPath)
    while (this._directoryMap[nextDir]) {
      delete this._directoryMap[nextDir]
      nextDir = SafeJsApi.parentPathNoDot(nextDir)
    }
  }

  /**
   * remove a virtual directory
   *
   * @param  {[type]}  itemPath
   * @param  {[type]}  dontCreateParent [optiona] if true, suppress creation of parent virtual directory
   * @return {Promise}  FuseResult
   */
  async rmdirVirtual (itemPath, dontCreateParent) {
    debug('rmdirVirtual(%s, %s)...', itemPath, dontCreateParent)
    try {
      for (var entry in this._directoryMap) {
        if (entry.indexOf(itemPath) === 0 && entry !== itemPath) {
          return new FuseResult(Fuse.ENOTEMPTY) // Has subdirectory
        }
      }

      // Ok, can delete the directory
      if (this._directoryMap[itemPath]) {
        delete this._directoryMap[itemPath]   // Remove the virtual directory
      }

      let parentDir = SafeJsApi.parentPathNoDot(itemPath)
      if (!dontCreateParent) {
        // If no parent exists in container, create a virtual directory
        let result = await this.getattr(parentDir)
        if (result.returnCode === Fuse.ENOENT) this.mkdirVirtual(parentDir)
      }
    } catch (e) {
      debug(e)
    }
    this._debugListVirtualDirectories()

    // Return success even if we already purged from the cache.
    //
    // It's not a problem if something tries removing a directory that
    // was removed as a side effect of deleting the last file in the
    // directory.
    //
    // It is a minor issue that this means trying to remove a non-existent
    // directory will appear to succeed, so we might want to improve
    // handling of that by keeping a small cache of recently discarded
    // directories. But for now, best not to trip up things that
    // try to remove a file tree, and fail each time they try to
    // remove a directory.
    return new FuseResult(0)
  }

  _debugListVirtualDirectories () {
    debug('Virtual Directories...')
    let keys = Object.keys(this._directoryMap)
    for (let i = 0, len = keys.length; i < len; i++) {
      debug('vdir: %s', keys[i])
    }
  }

  // When a file is created, check for and clear virtual folders on its path
  async closeVirtual (itemPath) {
    let nextDir = SafeJsApi.parentPathNoDot(itemPath)
    while (this._directoryMap[nextDir]) {
      await this.rmdirVirtual(nextDir, true)
      nextDir = SafeJsApi.parentPathNoDot(nextDir)
    }

    return new FuseResult(0)
  }

  readdirVirtual (itemPath) {
    if (this._directoryMap[itemPath]) {
      return new FuseResult(0, [])
    }

    return undefined  // No virtual directory, so action is incomplete
  }

  // Add any virtual directories to the itemPath directory's listing
  mergeVirtualDirs (itemPath, folders) {
    for (var entry in this._directoryMap) {
      if (entry.indexOf(itemPath) === 0 && entry !== itemPath) {
        let subTree = entry.substring(itemPath.length)
        let subFolder = subTree.split('/')[1]
        if (folders.indexOf(subFolder) === -1) folders.push(subFolder)
      }
    }
    return folders
  }

  // TODO remove code that returns as if empty directory, for getattr/readdir
  //      on a non-existent directory - ACTUALLY I DON'T THINK THAT CODE EXISTS?
  getattrVirtual (directoryPath) {
    // Check if this directory is, or lies on a virtual path
    for (var entry in this._directoryMap) {
      if (entry === directoryPath ||
          entry.indexOf(directoryPath + '/') === 0) {
        const now = Date.now()
        let itemAttributesResult = {
          modified: now,
          accessed: now,
          created: now,
          size: 0,
          version: -1,
          'isFile': false,
          entryType: 'virtualDirectory'
        }
        return this._makeGetattrResult(directoryPath, itemAttributesResult)
      }
    }

    // ??? TODO delete this
    // // If this lies on a virtual path, it can't exist
    // for (var entry in this._directoryMap) {
    //   if ((directoryPath + '/').indexOf(entry) === 0) {
    //     return new FuseResult(Fuse.ENOENT)
    //   }
    // }

    return undefined  // No virtual directory, so action is incomplete
  }

  // TODO Fix this - can it be done?
  renameVirtual (itemPath, newPath) {
    if (this._directoryMap[itemPath]) {
      this._directoryMap[newPath] = true
      this._directoryMap[itemPath] = undefined
      return new FuseResult(0)
    }

    return undefined  // No virtual directory, so action is incomplete
  }

  /**
   * handle opening of a file in a virtual (empty) directory
   *
   * Assumes FUSE won't getattr()/readdir() on a directory while creating a
   * file (ie before close).
   *
   * Above assumption may be brittle. Before implementing virtual directories
   * any getattr() or readdir() for a non existant directory, returned as if
   * the directory exists but was empty. So that is a possible refinement. In
   * other words, this method could keep the virtual folder 'alive' until the
   * file has actually been created (e.g. on close). I haven't done this yet
   * because I think that may have its own difficulties.
   *
   * @private
   */

  openVirtual (itemPath, flags) {
    let parentDir = SafeJsApi.parentPathNoDot(itemPath)
    while (this._directoryMap[parentDir]) {
      this._directoryMap[parentDir] = undefined
      parentDir = SafeJsApi.parentPathNoDot(parentDir)
    }

    return undefined  // For open, the action is always incomplete
  }

  /**
   * Wrappers for FUSE ops that implement results caching and virtual directories
   */
  async getattr (itemPath) {
    debug('%s.getattr(%s)', this.constructor.name, itemPath)
    let containerOp = 'itemAttributes'

    let fuseResult
    try {
      let handler = this._safeVfs.getHandler(itemPath)
      let containerPath = handler.pruneMountPath(itemPath)
      let container = await handler.getContainer(itemPath)

      // Lookup result in container's cache
      let result
      let resultHolder = container._getResultHolderForPath(containerPath)
      if (resultHolder) result = resultHolder[containerOp]

      if (!result) {
        let resultsRef = await container.itemAttributesResultsRef(containerPath)
        result = resultsRef.result
        delete result.fuseResult //  No longer valid
      }

      if (result && result.fuseResult) {
        fuseResult = result.fuseResult
      }

      if (!fuseResult) {
        fuseResult = this._makeGetattrResult(itemPath, result)
        result.fuseResult = fuseResult
      }
    } catch (e) {
      debug(e)
      fuseResult = new FuseResult()
    }

    return fuseResult
  }

  /**
   * Make fuseResult for getattr() out of resultsRef from SafeContainer itemAttributes()
   * @private
   * @param  {String}  itemPath
   * @param  {Object}  resultsRef  a resultsRef from SafeContainer itemAttributes()
   * @return {Promise}                     [description]
   */
  _makeGetattrResult (itemPath, result) {
    let fuseResult = new FuseResult()

    try {
      if (result.entryType === SafeJsApi.containerTypeCodes.file ||
          result.entryType === SafeJsApi.containerTypeCodes.newFile ||
          result.entryType === SafeJsApi.containerTypeCodes.fakeContainer ||
          result.entryType === SafeJsApi.containerTypeCodes.nfsContainer ||
          result.entryType === SafeJsApi.containerTypeCodes.servicesContainer ||
          result.entryType === SafeJsApi.containerTypeCodes.service ||
          result.entryType === SafeJsApi.containerTypeCodes.defaultContainer ||
          result.entryType === 'virtualDirectory') {
        debug('%s._makeGetattrResult(\'%s\') result type: %s', this.constructor.name, itemPath, result.entryType)
        fuseResult.returnCode = 0
        fuseResult.returnObject = {
          mtime: result.modified,
          atime: result.accessed,
          ctime: result.created,
          nlink: 1,
          size: result.size,    // bytes
          // blocks: result.size, // TODO
          // perm: ?,             // TODO also: dev, ino, nlink, rdev, blksize
          // https://github.com/TooTallNate/stat-mode/blob/master/index.js
          mode: (result.isFile ? 33188 : 16877),
          uid: process.getuid ? process.getuid() : 0,
          gid: process.getgid ? process.getgid() : 0
        }
        return fuseResult
      }
      // TODO implement more specific error handling like this on other fuse-ops
      if (result.entryType === SafeJsApi.containerTypeCodes.notFound ||
          result.entryType === SafeJsApi.containerTypeCodes.deletedEntry) {
        debug('%s._makeGetattrResult(\'%s\') result type: %s reply(Fuse.ENOENT)', this.constructor.name, itemPath, result.entryType)
        return fuseResult
      }
      throw new Error('Unhandled result.entryType: ' + result.entryType)
    } catch (e) {
      debug(e)
    }
    return fuseResult
  }
}

/**
 * Encapsulation of fuse operation result, returned via a callback (reply)
 * @private
 */
class FuseResult {
  constructor (code, object) {
    if (code === undefined) code = Fuse.ENOENT
    this.returnCode = code
    this.returnObject = object
  }
}

module.exports = VfsCaching
