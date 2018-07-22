/* TODO theWebalyst notes:
[ ] add support for CLI to configure mounting:
    SafeVfs currently hard codes a default set of path mappings, this should
    be replaced by settings from the CLI parameters, so users can choose what
    to mount and where.
[ ] Async: looks like I could replace with Promises (https://caolan.github.io/async/docs.html#auto)
  -> tried but didn't work so leave for later.

SAFE-VFS - DESIGN (July 2018)
=================
IMPORTANT: these notes may not be maintained, so use to help you understand
the code, but if they become too outdated to help please either update them
or remove them.

SAFE-VFS design follows, please refer to ./docs for additional design
documentation including the master architectural diagram for SAFE FUSE.

SafeVfs
-------
SafeVfs implements the Path Map containing entries which map a path
to a vfsHandler object. The Path Map contains:
- one top level entry for each mount point (e.g. _publicNames, _documents etc.)
- zero or more entries for sub-paths of a top level path entry, that are
  also containers
- provides a getHandler() to get the vfsHandler for a given path (see next)

SafeVfs.getHandler()
--------------------
SafeVfs.getHandler() checks the map for an entry for a given path. If the entry
exists, it returns the entry, a vfsHandler object. If there is no entry
matching the path getHandler() recurses by calling itself on the parent path
and on resolving inserts the returned vfsHandler object into the map.

vfsHandlerObject
----------------
vfsHandlerObject = {
  fuseHandler <vfsFuseHandler>, // Handler for MD role at the leaf of path
                                // (e.g public names, services, NFS service etc

  container <mutableData>,  // The corresponding MD (null if lazy init)
  params <object>           // Params (e.g. as a key in the container if the
                            // mounted path is below the container root)
}

vfsHandler.fuseHandler()
------------------------
This method is called by the FUSE operator implementations. Below is
example SAFE-VFS code for the FUSE readdir operator (implemented in readdir.js):

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

vfsFuseHandler classes
----------------------
A vfsHandlerObject is an instance of a vfsFuseHandler<type> class, where there
is a type corresponds to the MD container role: PublicNames, Services,
ServiceNfs, ServiceEmail

Each class provides a method for each supported FUSE operation (readdir,
mkdir etc).

newVfsFuseHandler({key, lazyInitialise, {params} })
Another method, newVfsFuseHandler(key) returns a new vfsHandlerObject
corresponding to the MD role of the value at the given key. The new
object will contain any supplied 'params' (such as a key within the
container which they handle), and a 'lazyInitialise' flag which determines
whether to initialise the 'container' member using the API, or set it to
null and return immediately. See vfsHandlerObject above.
*/

const Fuse = require('fuse-bindings')
const debug = require('debug')('ipfs-fuse:index')
const mkdirp = require('mkdirp')
const Async = require('async')
const createIpfsFuse = require('../fuse-operations')
const explain = require('explain-error')

let Safenetwork // Set to safenetworkjs SafenetworkApi on successful mount

exports.mount = (safeApi, mountPath, opts, cb) => {
  if (!cb) {
    cb = opts
    opts = {}
  }

  opts = opts || {}
  cb = cb || (() => {})

  Async.auto({
    path (cb) {
      mkdirp(mountPath, (err) => {
        console.log('log:index.js:path()!!!')
        debug('index.js:path()!!!')
        if (err) {
          err = explain(err, 'Failed to create mount point')
          debug(err)
          return cb(err)
        }

        cb()
      })
    },
    ipfs (cb) {
      console.log('log:index.js:ipfs()!!! - REMOVE THIS')
      debug('index.js:ipfs()!!!')
      /* WAS: const ipfs = new IpfsApi(opts.ipfs)

      ipfs.id((err, id) => {
        if (err) {
          err = explain(err, 'Failed to connect to SAFE node')
          debug(err)
          return cb(err)
        }

        debug(id)
        cb(null, ipfs)
      })
      */
    },
    mount: ['path', (res, cb) => {
      Fuse.mount(mountPath, createIpfsFuse(safeApi), opts.fuse, (err) => {
        if (err) {
          err = explain(err, 'Failed to mount SAFE FUSE volume')
          debug(err)
          return cb(err)
        }
        Safenetwork = safeApi
        // TODO await initalisePathMap()

        cb(null, {})
      })
    }]
  }, (err) => {
    if (err) {
      debug(err)
      return cb(err)
    }
    cb(null, {})
  })
}

exports.unmount = (mountPath, cb) => {
  cb = cb || (() => {})

  Fuse.unmount(mountPath, (err) => {
    if (err) {
      err = explain(err, 'Failed to unmount SAFE FUSE volume')
      debug(err)
      return cb(err)
    }
    Safenetwork = null
    cb()
  })
}

// TODO implement handler for each Mutable Data role (public names, services, NFS service)
/**
 * vfsHandler for _publicNames container
 * @param  {[type]} ??? [description]
 * @return {[type]}      [description]
 */
async function publicNamesHandler () {
  try {
    throw new Error('TODO implement publicNamesHandler')
  } catch (err) {
    throw err
  }
}

/**
 * vfsHandler for a services container
 * @param  {[type]} ??? [description]
 * @return {[type]}      [description]
 */
async function servicesHandler () {
  try {
    throw new Error('TODO implement servicesHandler')
  } catch (err) {
    throw err
  }
}

/**
 * vfsHandler for an NFS container
 * @param  {[type]} ??? [description]
 * @return {[type]}      [description]
 */
async function nfsHandler () {
  try {
    throw new Error('TODO implement nfsHandler')
  } catch (err) {
    throw err
  }
}

// TODO Path map ???
const pathMap = {}

/**
 * Mount SAFE container (Mutable Data)
 *
 * @param  {string} safePath      path starting with a root container
 * Examples:
 *   _publicNames                  mount _publicNames container
 *   _publicNames/happybeing      mount services container for 'happybeing'
 *   _publicNames/www.happybeing  mount www container (NFS for service at www.happybeing)
 *   _publicNames/thing.happybeing mount the services container (NFS, mail etc at thing.happybeing
 *
 * @param  {string} mountPath     (optional) subpath of the mount point
 * @param  {string} containerHandler (optional) handler for the container type
 * @return {Promise}              which resolves to a vfsHandlerObject
 */

async function mountContainer (safePath, mountPath, containerHandler) {
  let defaultHandler
  if (safePath === '_publicNames') {
    defaultHandler = publicNamesHandler
  } else {
    defaultHandler = nfsHandler
  }

  mountPath = mountPath || safePath
  containerHandler = containerHandler || defaultHandler
  try {
    throw new Error('TODO implement mountContainer')
  } catch (err) {
    throw err
  }
}

// Called after successful mount
async function initialisePathMap () {
  mountContainer('_publicNames')
  try {
    throw new Error('TODO implement initialisePathMap')
  } catch (err) {
    throw err
  }
}

/**
 * Get handler object for a FUSE mount path
 *
 * @param {string} path - a path with a mounted container at its root
 *
 * @returns a Promise which resolves to a handler object
 */

async function fuseHandler (path) {
  throw new Error('TODO implement SafefuseHandler')
  try {
  } catch (err) {
    throw err
  }
}

module.exports.fuseHandler = fuseHandler
module.exports.mountContainer = mountContainer
