/* TODO theWebalyst notes:
[x] Async: looks like I could replace with Promises (https://caolan.github.io/async/docs.html#auto)

NOTE:
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
 */

const Fuse = require('fuse-bindings')
const debug = require('debug')('ipfs-fuse:index')
const mkdirp = require('mkdirp')
const Async = require('async')
const createIpfsFuse = require('./safenetwork-fuse')

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
          err = explain(err, 'Failed to connect to IPFS node')
          debug(err)
          return cb(err)
        }

        debug(id)
        cb(null, ipfs)
      })
      */
    },
    mount: ['path', 'ipfs', (res, cb) => {
      Fuse.mount(mountPath, createIpfsFuse(safeApi), opts.fuse, (err) => {
        if (err) {
          err = explain(err, 'Failed to mount IPFS FUSE volume')
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
      err = explain(err, 'Failed to unmount IPFS FUSE volume')
      debug(err)
      return cb(err)
    }
    cb()
  })
}
