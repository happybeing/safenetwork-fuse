/* TODO theWebalyst notes:
[x] Async: looks like I could replace with Promises (https://caolan.github.io/async/docs.html#auto)

SAFE-VFS
========

Overview
--------
1) safenetworkjs is trying to support two APIs (web and node) which have
different auth flows. For now I'm following the node API but...
[ ] when web DOM API is updated add DOM support back to safenetworkjs

2) for safenetwork-fuse auth must be done in the CLI binary
(not safenetwork-fuse) because the executable needs to be invoked a
second time to pass the authUri back to the process which calls openUri().
So...
[ ] merge safecmd.js code into bin.js in order to parse FUSE args and safecmd
    args (and pass CLI args including auth URI and process ID)
[ ] for development, add path of a safe-cli-boilerplate executable
    to appInfo as follows:
      const authCmd = "/home/mrh/src/safe/safe-cli-boilerplate/dist/mock/safecmd"
      const authScript = "/snapshot/safe-cli-boilerplate/safecmd.js"
      appInfo.customExecPath = [
        authCmd, authScript,
        '--pid', String(pid),
        '--uri']

[ ] do the auth before attempting the mount
[ ] on successful auth, call mount and pass in the safeApi and initialised safeApp
[ ] get this to auth with mock network
  NOTE for development I need a built CLI cmd to pass the URI back to this process
[ ] change ./safenetwork-webapi from copies to safenetworkjs (and npm link it)

SafeVfs
-------
SAFE-VFS in the design document is implemented by SafeVfs.

SafeVfs implements the Path Map containing entries which map a path
to a vfsHandler object. The Path Map contains:
- one top level entry for each mount point (e.g. _publicNames, _documents etc.)
- zero or more entries for sub-paths of a top level path entry, that are
  also containers
- provides a getHandler() to get the vfsHandler for a given path

SafeVfs.fuseHandler()
---------------------
This checks the map for an entry for a given path.
If the entry exists, it returns the entry, a vfsHandler object.
If it does not exist, recurses by calling itself on the parent path and on
resolving inserts the returned vfsHandler object into the map.

This method is called by the FUSE operator implementations. Example
proto code for a SAFE VFS implementation of readdir (see readdir.js)
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

vfsHandler Object
-----------------
vfsHandlerObject = {
    fuseHandler <vfsFuseHandler>,
    container <mutableData>,  // Then handler is specific to the MD role, such
                              // as public names, services, NFS, email etc.
    params <object>           // Params (e.g. as a key in the container if the
                              // mount is within the container)
}

vfsFuseHandler classes
----------------------
There is a vfsFuseHandler class for each supported MD container
role (public names, services, NFS service, email service etc.)

Each class provides a method for each supported FUSE operation (readdir,
mkdir etc).

Another method, vfsFuseHandler::newVfsFuseHandler(key) returns a new
vfsFuseHandlerObject corresponding to the MD role of the value at the
given key. The new object will be initialised so methods on the object
have any information needed when they are called (such as a key within
the container which they handle).
*/

const Fuse = require('fuse-bindings')
const debug = require('debug')('ipfs-fuse:index')
const mkdirp = require('mkdirp')
const Async = require('async')
const createIpfsFuse = require('./safenetwork-fuse')
const explain = require('explain-error')

exports.mount = (safeApi, mountPath, opts, cb) => {
  Safenetwork = safeApi
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
    cb()
  })
}
