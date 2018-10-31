const Fuse = require('fuse-bindings')
const SafeJsApi = require('safenetworkjs')
const debug = require('debug')('safe-fuse:vfs-cache')

/**
 * class implementing a filesystem cache that also supports empty directories
 *
 * Used for:
 * - caching directory content (readdir)
 * - caching attributes (getattr)
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
 *
 * IMPLEMENTATION
 * This is not a simple one level cache, sorry :)
 *
 * The cache doesn't store attributes or directory listings directly,
 * but holds references to a map, and a key to the map, where that
 * information is held within a SafenetworkJs (SafeContainer) cache. This
 * means that the SafeContainer can clear a cache entry due when it becomes
 * invalid due to a file operation (such as create, delete or modify), and
 * the data/cache entry will be updated next time a FUSE operation requests
 * it.
 *
 * vfsCacheMap holds a map which allows it to look up a results object for a
 * given itemPath (e.g. for getattr(itemPath)). The results object is contains
 * references to a SafenetworkJs container's resultsMap, and the key to use
 * when looking up the results in that resultsMap.
 *
 * So a lookup for getattr() is in essence (only):
 *    let resultsRef = this._resultsRefMap[itemPath]
 *    if (resultsRef) resultHolder = resultsRef.resultsMap[resultsRef.resultsKey]
 *    if (resultHolder) result = resultHolder['getattr']
 *
 * Note: vfsCacheMap has a helper for each FUSE operation, so the
 * implementation inside getattr() can be simplified to a single call:
 *    let result = vfsCacheMap.getattr(itemPath)
 *
 * The reason for the middle level of indirection, is so that a
 * SafenetworkJs container can invalidate cache entries. Without that,
 * if the 'result' were held inside vfsCacheMap, another way would need
 * to be implemented to invalidate it, because removing it from the
 * SafenetworkJs container's cache would leave it in the vfsCacheMap.
 *
 * To support the above, SafentetworkJs a container provides "ResultRef"
 * versions of some functions (e.g. itemAttributesResultRef()) so that
 * cached results can be accessed externally, and safely invalidated at any
 * time by a SafenetworkJs container.
 *
 * [ ] TODO: It is up to SafenetworkJs to ensure that when a resultsMap[]
 *     entry becomes invalid in one container object, it is invalidated in
 *     all container objects being used to manage the same SAFE Network
 *     container.
 *
 * @private
 */

class VfsCacheMap {
  constructor (safeVfs) {
    this._safeVfs = safeVfs

    /**
    * Map of itemPath to resultsRef
    *
    * Looked up using an itemPath, the resultsRef for holds:
    *  - resultsMap  // SafenetworkJs' map of results for a given container key
    *  - key         // The key to look up the relevant resultsHolder
    *
    *  The resultsHolder may contain a results object for each FUSE method
    *  with a cached value. Values can be inserted by the vfsCacheMap
    *  FUSE op, alongside any values set by SafenetworkJs container. This
    *  can saves converting from the SafenetworkJs result to the form
    *  required by the FUSE op.
    *
    * @type {Array}
    */
    this._resultsRefMap = []

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
   * The following functions implement virtual directories which are
   * overlaid on top of the SafenetworkJs container based filesystem, which
   * knows nothing about them.
   * @private
   *
   * @return {FuseResult} an object if the action is complete, or undefined
   * if the action should passed on to the non-virtual implementation.
   */

  // Note: deleting (unlink) the last file in a SAFE NFS 'fake' directory
  // will cause the directory to be empty, and so disappear. This implementation
  // of virtual directories assumes that is ok, and does not create a
  // virtual directory to simulate deletion of the last file, which should
  // ideally leave an empty directory.

  // Assumes FUSE will only mkdir() if it doesn't exist yet
  mkdirVirtual (itemPath, mode) {
    this._directoryMap[itemPath] = true
    return new FuseResult(0)
  }

  rmdirVirtual (itemPath) {
    for (var entry in this._directoryMap) {
      if (entry.indexOf(itemPath) === 0 && entry !== itemPath) {
        return new FuseResult(Fuse.ENOTEMPTY) // Has subdirectory
      }
    }

    if (this._directoryMap[itemPath]) {
      delete this._directoryMap[itemPath]
    }

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

  // When a file is created, check for and clear virtual folders on its path
  closeVirtual (itemPath) {
    let nextDir = SafeJsApi.parentPath(itemPath)
    while (this._directoryMap[nextDir]) {
      delete this._directoryMap[nextDir]
      nextDir = SafeJsApi.parentPath(nextDir)
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
  getattrVirtual (itemPath) {
    if (this._directoryMap[itemPath]) {
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
      return this._makeGetattrResult(itemPath, itemAttributesResult)
    }

    return undefined  // No virtual directory, so action is incomplete
  }

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
    let parentDir = SafeJsApi.parentPath(itemPath)
    while (this._directoryMap[parentDir]) {
      this._directoryMap[parentDir] = undefined
      parentDir = SafeJsApi.parentPath(parentDir)
    }

    return undefined  // For open, the action is always incomplete
  }

  /**
   * Wrappers for FUSE ops that implement results caching and virtual directories
   */
  async getattr (itemPath, reply) {
    debug('%s.getattr(%s)', this.constructor.name, itemPath)
    let fuseOp = 'getattr'

    let fuseResult = this._getResultFromCache(itemPath, fuseOp)
    if (!fuseResult) {
      let resultsRef
      try {
        let handler = this._safeVfs.getHandler(itemPath)
        let containerPath = handler.pruneMountPath(itemPath)
        let container = await handler.getContainer(itemPath)

        resultsRef = await container.itemAttributesResultRef(containerPath)
        fuseResult = this._makeGetattrResult(itemPath, resultsRef.result)
        this._saveResultToCache(itemPath, fuseOp, fuseResult, resultsRef)
      } catch (e) {
        debug(e)
        fuseResult = new FuseResult()
      }
    }

    reply(fuseResult.returnCode, fuseResult.returnObject)
  }

  _saveResultToCache (itemPath, fuseOp, fuseResult, resultsRef) {
    debug('%s._saveResultToCache(%s, %o, %o)', this.constructor.name, fuseOp, fuseResult, resultsRef)
    this._resultsRefMap[itemPath] = resultsRef
    let resultHolder = resultsRef.resultsMap[resultsRef.resultsKey]
    resultHolder[fuseOp] = fuseResult // Insert into SafenetworkJs cached result object
  }

  // Returns a fuseResult for fuseOp if successful
  _getResultFromCache (itemPath, fuseOp) {
    debug('%s._getResultFromCache(%s, %o)', this.constructor.name, fuseOp)
    let resultHolder
    let resultsRef = this._resultsRefMap[itemPath]
    if (resultsRef) resultHolder = resultsRef.resultsMap[resultsRef.resultsKey]
    return resultHolder ? resultHolder[fuseOp] : undefined
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

module.exports = VfsCacheMap
