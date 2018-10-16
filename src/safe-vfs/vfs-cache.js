const Fuse = require('fuse-bindings')
const SafeJsApi = require('safenetworkjs')
const debug = require('debug')('safe-fuse:vfs-cache')

/**
 * class implementing a filesystem cache that also supports empty directories
 *
 * Used for:
 * - directory existence (mkdir/rmdir)
 * - directory content (readdir)
 * - attributes (getattr)
 * - empty directories for the life of a session
 *
 * This serves two purposes:
 * - speeds up access to filesystem access, particularly the frequent
 *   calls FUSE makes to getattr() which are slow as implemented by
 *   SafenetorkJs
 * - enables empty directories to be created and removed (mkdir/rmdir)
 *   which is not supported by SAFE NFS (or SafenetworkJs)
 *
 * The cache has methods to update and invalidate its content:
 * - adding or removing a file or directory
 * - modifiying a file
 *
 * IMPLEMENTATION
 * This is not a simple one level cache, sorry :)
 *
 * It holds a map which allows it to look up a results object for a given
 * itemPath (e.g. for getattr(itemPath)). The results object is contains
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
 * To support the above, SafentetworkJs a container provides "WithResultMap"
 * versions of some functions (e.g. itemAttributesWithResultMap()) so that
 * the results can be cached in this way, and invalidated from within
 * the SafenetworkJs container.
 *
 * [ ] TODO: It is up to SafenetworkJs to ensure that when a resultsMap[]
 *     entry becomes invalid in one container object, it is invalidated in
 *     all container objects being used to manage the same SAFE Network
 *     container.
 *
 * @private
 */

class vfsCacheMap {
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
   */

  // _virtualMkdir (path) {
  //   this._directoryMap[itemPath] = true
  // }
  //
  // _virtualRmDir (itemPath) {
  //   this._directoryMap[itemPath] = undefined
  // }
  //
  // _virtualReaddir ??? (itemPath) {
  //
  // }
  //
  // _virtualGetattr ??? (itemPath) {
  //
  // }

  /**
   * Wrappers for FUSE ops that implement results caching and virtual directories
   */
  async getattr (itemPath, reply) {
    debug('%s.getattr(%s)', this.constructor.name, itemPath)
    let resultHolder
    let fuseResult
    let fuseOp = 'getattr'

    let resultsRef = this._resultsRefMap[itemPath]
    if (resultsRef) resultHolder = resultsRef.resultsMap[resultsRef.resultsKey]
    if (resultHolder) fuseResult = resultHolder[fuseOp]

    if (!fuseResult) {
      let resultsRef
      try {
        let handler = this._safeVfs.getHandler(itemPath)
        let containerPath = this.handler.pruneMountPath(itemPath)
        let container = await handler.getContainerFor(itemPath)
        resultsRef = await container.itemAttributesResultsRef(containerPath)
        this._resultsRefMap[itemPath] = resultsRef

        fuseResult = this._makeGetattrResult(itemPath, resultsRef)
        resultHolder = resultsRef.resultsMap[resultsRef.resultsKey]
      } catch (e) {
        debug(e)
        fuseResult = { returnCode: Fuse.ENOENT, returnObject: undefined }
      }
    }

    if (resultHolder) resultHolder[fuseOp] = fuseResult // Insert into SafenetworkJs cached result object
    reply(fuseResult.returnCode, fuseResult.returnObject)
  }

  /**
   * Make fuseResult for getattr() out of resultsRef from SafeContainer itemAttributes()
   * @private
   * @param  {String}  itemPath
   * @param  {Object}  resultsRef  a resultsRef from SafeContainer itemAttributes()
   * @return {Promise}                     [description]
   */
  async _makeGetattrResult (itemPath, resultsRef) {
    let fuseResult = { returnCode: Fuse.ENOENT, returnObject: undefined }

    try {
      let result = resultsRef.result
      if (result.entryType === SafeJsApi.containerTypeCodes.file ||
          result.entryType === SafeJsApi.containerTypeCodes.fakeContainer ||
          result.entryType === SafeJsApi.containerTypeCodes.nfsContainer ||
          result.entryType === SafeJsApi.containerTypeCodes.servicesContainer ||
          result.entryType === SafeJsApi.containerTypeCodes.defaultContainer) {
        debug('getattr(\'%s\') result type: %s', itemPath, result.entryType)
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
      if (result.entryType === SafeJsApi.containerTypeCodes.notFound) {
        debug('getattr(\'%s\') result type: %s reply(Fuse.ENOENT)', itemPath, result.entryType)
        return fuseResult
      }
      throw new Error('Unhandled result.entryType: ' + result.entryType)
    } catch (e) {
      debug(e)
    }
  }
}

module.exports = vfsCacheMap
