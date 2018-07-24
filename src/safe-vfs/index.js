/* TODO theWebalyst notes:
[ ] Implement SafeVfs class and vfsHandler classes according to 'DESIGN' below
[ ] LATER add support for CLI to configure mounting:
    SafeVfs currently hard codes a default set of path mappings, this should
    be replaced by settings from the CLI parameters, so users can choose what
    to mount and where.
[ ] LATER Async: looks like I could replace with Promises (https://caolan.github.io/async/docs.html#auto)
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
- an entry for '/' with an instance of vfsRootHandler
- a top level container entry for each mount point (e.g. _publicNames, _documents etc.)
- zero or sub-path entries that are also containers
- provides a getHandler() to get the vfsHandler for a given path (see next)

FUSE Operations
---------------
Each supported FUSE operation (such as readdir, statfs etc) is implemented in
its own file in ../fuse-operations.

When called, the FUSE operation calls SafeVfs.getHandler() to get a vfsHandler
object from the map, corresponding to the target (path), or an error if this
fails. It then checks that its corresponding FUSE operation is implemented on
the handler. So if this is FUSE operation readdir() it checks for a readdir()
method on the vfsHandler object and calls it. If the method isn't present,
it returns an error.

SafeVfs.newHandler({key, lazyInitialise, {params} })
----------------------------------------------------
SafeVfs.newHandler() returns a new vfsHandler object (see below)
corresponding to the role of the value at the given key (typically a Mutable
Data object).

The returned handler object will cache any supplied 'params' (such as a key
within the container which they handle).

The 'lazyInitialise' flag determines whether to initialise immediately (to
access a Mutable Data for example), or to return immediately and delay
initialisation until needed.

SafeVfs.getHandler()
--------------------
SafeVfs.getHandler() checks the map for an entry for a given path. If the entry
exists, it returns the entry, a vfsHandler object.

If there is no entry matching the path, it calls itself to obtain the handler
object for the parent path. This recursion continues, and will 'unroll' once
a handler is found (which may ultimately be the root handler object for '/').

Once it obtains a handler object for a parent path, it calls getHandlerFor()
on that object, to obtain a handler for the contained item and returns that.

The above works for containers, but what about leaves (e.g. an NFS file)?

To cope with files, SafeVfs.getHandler() will obtain the handler for the parent
container (NFS directory) and then call getHandlerFor() on that (see below).

vfsHandler Object
-----------------
A vfsHandler object is an instance of a class such as vfsPublicNamesHandler or
vfsNfsHandler. Those classes are each implemented in their own file in
src/safe-vfs, and are required() for use in src/safe-vfs/index.js

A vfsHandler is the only thing that knows what it contains, and so provides
a method getHandlerFor(path) which checks that the path is for an item
which it contains, and if so returns a vfsHandler object for that contained
item. If the item is itself a container, this will typically mean it
creates a suitable vfsHandler object and returns this, having added it to the
PathMap. Where it contained item is a file, or a container of its own type
it can return itself because it knows how to handle FUSE operations on both.

This means that a vfsHandler class implements FUSE operation methods
which work for both itself as container (e.g. readdir, statfs etc) and on
any 'leaf' item (e.g. NFS file) which it contains.

For example vfsPublicNamesHandler.getHandlerFor('_publicNames/happybeing')
will create and return an instance of vfsServicesHandler for the public
name 'happybeing'. While vfsNfsHandler.getHandlerFor('_public/blog/') and
vfsNfsHandler.getHandlerFor('_public/blog/index.html') should return itself.

A handler object implements a FUSE operation method for each FUSE operations it
supports such as readdir(), statfs() etc. (see src/fuse-operations)

Each handler class has a constructor which takes params (eg safePath, mountPath,
lazyInit) and will probably cache API related information to speed access
to the MutableData which stores its content.

When a handler lists a container, it uses the list of items it contains to
update the pathMap (deleting or adding entries to bring it up to date) in case
any of its contents have been changed. Some (all?) handlers might update that
list for some (all?) other operations.

For example inside index.js we will have:

vfsPublicNames=require('vfsPublicNames')

// and later when adding to the PathMap:

let handler = new vfsPublicNames(safeApi, '_publicNames')
if (handler) {
  pathMap.'_publicNames' = handler
}

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
