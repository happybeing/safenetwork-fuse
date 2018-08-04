/* TODO theWebalyst notes:
[ ] Implement SafeVfs and vfsHandler classes according to 'DESIGN' below
  [/] refactor mount/unmount from callbacks to async/Promises so SafeVfs and handlers can use Promises
  [/] find a way to call my async functions from fuse-operatations (if not have to find a way to
      call SAFE API which I think is all async now)
    [/] SafenetworkApi:
      [/] bootstrap should set app handle on auth
      [/] need access to app handler e.g. method: safeApp()
      [/] in safenetwork-fuse change safeApi to safeJsApi
    [/] test from callSafeApi() in fuse-operations/readdir.js
  [/] refactor mount/unmount as methods on SafeVfs class and export instance of that
  [/] use SafeVfs to hold pathMap and SAFE Api (instance of SafenetworkApi)
  [/] pass safeVfs to each vfsHandler constructor
  [ ] provide FUSE methods on SafeVfs for each of these and call from corresponding fuse-operations impn.
    [ ] mkdir
    [ ] statfs
    [ ] getattr
    [ ] create
    [ ] open
    [ ] write
    [ ] read
    [ ] unlink
    [ ] rmdir
    [ ] write
    [ ] rename
    [ ] write
    [ ] ??? ftruncate
    [ ] ??? mknod
    [ ] ??? utimens
  [ ] Implement NfsHandler for /_public and implement
    [ ] mkdir
    [ ] statfs
    [ ] getattr
    [ ] create
    [ ] open
    [ ] write
    [ ] read
    [ ] unlink
    [ ] rmdir
    [ ] write
    [ ] rename
    [ ] write
    [ ] ??? ftruncate
    [ ] ??? mknod
    [ ] ??? utimens
    [ ] write test shell script to create a simple tree
    [ ] write test shell script to create a hello world website
  [ ] implement vfsPublicNamesHandler
  [ ] implement vfsServicesHandler
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
SafeVfs (this file) implements the Path Map containing entries which map a path
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

mountHandler(safePath, lazyInitialise, {params})
----------------------------------------------------
mountHandler() creates a suitable vfsHandler instance and inserts it
into the Path Map. The class of the handler corresponds to the role of the
value at the given safePath (typically a Mutable Data object).

The returned handler object will cache any supplied 'params' (such as a key
within the container which they handle).

The 'lazyInitialise' flag determines whether to initialise immediately (to
access a Mutable Data for example), or to return immediately and delay
initialisation until needed.

getHandler()
--------------------
getHandler() checks the map for an entry for a given path. If the entry
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

let handler = new vfsPublicNames(safeJs, '_publicNames')
if (handler) {
  pathMap.'_publicNames' = handler
}

*/

const Fuse = require('fuse-bindings')
const debug = require('debug')('safe-fuse:index')
const mkdirp = require('mkdirp-promise')
const createSafeFuse = require('../fuse-operations')
const explain = require('explain-error')

const RootHandler = require('./root')
const NfsHandler = require('./nfs')
const PublicNamesHandler = require('./public-names')
const ServicesHandler = require('./services')

class SafeVfs {
  constructor (safeApi) {
    this._safeApi = safeApi
    this._pathMap = {}
  }

  safeApi () { return this._safeApi }

  async mountFuse (mountPath, opts) {
    opts = opts || {}

    try {
      return this.initialisePathMap()
      .then(() => {
        return mkdirp(mountPath)
        .then(() => {
          return new Promise((resolve, reject) => {
            Fuse.mount(mountPath, createSafeFuse(this), opts.fuse, (err) => {
              console.log('log:index.js:path()!!!')
              debug('index.js:path()!!!')
              if (err) {
                err = explain(err, 'Failed to create mount point')
                debug(err)
                reject(err)
              } else {
                resolve()
              }
            })
          })
        })
      }).catch((err) => {
        console.log('ERROR - DEBUG')
        console.error('Failed to mount SAFE FUSE volume')
        throw err
      })
    } catch (err) {
      console.error('Failed to mount SAFE FUSE volume')
      throw err
    }
  }

  async unmountFuse (mountPath) {
    return new Promise((resolve, reject) => {
      return Fuse.unmount(mountPath, err => {
        if (err) {
          err = explain(err, 'Failed to unmount SAFE FUSE volume')
          debug(err)
          reject(err)
        } else {
          this._pathMap = {}
          resolve()
        }
      })
    })
  }

  /**
   * Initialise the pathMap with a RootHandler
   *
   * @return {Promise}
   */
  async initialisePathMap () {
    this._pathMap = {}
//???    return this.mountContainer({safePath: '/'}) // Always have a root handler
  }

  /**
   * Mount SAFE container (Mutable Data)
   *
   * @param  {string} safePath      path starting with a root container
   * Examples:
   *   _publicNames                 mount _publicNames container
   *   _publicNames/happybeing      mount services container for 'happybeing'
   *   _publicNames/www.happybeing  mount www container (NFS for service at www.happybeing)
   *   _publicNames/thing.happybeing mount the services container (NFS, mail etc at thing.happybeing
   * @param  {string} mountPath     (optional) subpath of the mount point
   * @param  {string} lazyInitialise(optional) if false, any API init occurs immediately
   * @param  {string} ContainerHandler (optional) handler class for the container type
   * @return {Promise}
   */

  async mountContainer (params) {
    let config = {lazyInitialise: true} // Default values
    config = params

    if (config.safePath === undefined) {
      throw new Error('Unable to mount container on unspecified mount point')
    }

    try {
      if (this._pathMap[config.safePath]) {
        throw new Error('Mount already present at \'' + config.safePath + '\'')
      }

      let DefaultHandlerClass
      if (config.safePath === '_publicNames') {
        DefaultHandlerClass = PublicNamesHandler
      } else if (config.safePath === '/') {
        DefaultHandlerClass = RootHandler
      } else {
        DefaultHandlerClass = NfsHandler
      }

      config.mountPath = config.mountPath || config.safePath
      config.ContainerHandlerClass = config.ContainerHandlerClass || DefaultHandlerClass

      this._pathMap[config.safePath] = new config.ContainerHandlerClass(this, config.safePath, config.mountPath, config.lazyInitialise)
    } catch (err) {
      throw err
    }
  }
}

module.exports = SafeVfs
module.exports.SafeVfs = SafeVfs
