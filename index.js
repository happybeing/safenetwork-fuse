/* TODO theWebalyst notes:
[ ] Async: looks like I could replace with Promises (https://caolan.github.io/async/docs.html#auto)
 */

const Fuse = require('fuse-bindings')
const debug = require('debug')('ipfs-fuse:index')
// TODO change ./safenetwork-webapi from copies to dependency:
const Safenetwork = require('./safenetwork-webapi') // was ipfs-api
const mkdirp = require('mkdirp')
// const Async = require('async')
const createIpfsFuse = require('./safenetwork-fuse')

exports.mount = async (mountPath, opts, cb) => {
  if (!cb) {
    cb = opts
    opts = {}
  }
  opts = opts || {}
  cb = cb || (() => {})

  async function path () {
    mkdirp(mountPath, (err) => {
      if (err) {
        debug(err)
        throw (err)
      }
    })
  }

  async function ipfs () {
    // WAS: const ipfs = new IpfsApi(opts.ipfs)

    // TODO: parameterise these? or separate out?
    const safeAppConfig = {
      id: 'unspecified id',
      name: 'SAFE Plume (WARNING config.json not found)',
      vendor: 'unspecified vendor'
    }
    const appPermissions = {
      // TODO is this right for solid service container (ie solid.<safepublicid>)
      _public: ['Read', 'Insert', 'Update', 'Delete'], // request to insert into `_public` container
      _publicNames: ['Read', 'Insert', 'Update', 'Delete'] // TODO maybe reduce defaults later
    }

    if (!Safenetwork.isAuthorised()) {
      console.log('safe:plume AUTH simpleAuthorise()')
      Safenetwork.simpleAuthorise(safeAppConfig, appPermissions)
    }

    if (!Safenetwork.isAuthorised()) {
      let err = 'Failed to connect to SAFE Network'
      debug(err)
      throw err
    }

    return Safenetwork
  }

  try {
    const result = await Promise.all([path, ipfs])
    const safe = result[1]
    Fuse.mount(mountPath, createIpfsFuse(safe), opts.fuse, (err) => {
      if (err) {
        err = 'Failed to mount IPFS FUSE volume'
        debug(err)
        throw err
      }
    })
  } catch (err) {
    cb(err)
  }

  cb(null, {})  // Success with empty return object
}

exports.unmount = (mountPath, cb) => {
  cb = cb || (() => {})

  Fuse.unmount(mountPath, (err) => {
    if (err) {
      err = 'Failed to unmount IPFS FUSE volume'
      debug(err)
      return cb(err)
    }
    cb()
  })
}
