#!/usr/bin/env node

const Os = require('os')
const Path = require('path')
// const Safenetwork = require('safenetworkjs').SafenetworkApi
const Safenetwork = require('./bootstrap')
const IpfsFuse = require('./index.js')

const mountPath = process.platform !== 'win32'
  ? Path.join(Os.homedir(), 'IPFS')
  : 'I:\\'

// TODO: parameterise these? or separate out?
let appConfig = {
  id: 'unspecified id',
  name: 'SAFE Plume (WARNING config.json not found)',
  vendor: 'unspecified vendor'
}

const appPermissions = {
  // TODO is this right for solid service container (ie solid.<safepublicid>)
  _public: ['Read', 'Insert', 'Update', 'Delete'], // request to insert into `_public` container
  _publicNames: ['Read', 'Insert', 'Update', 'Delete'] // TODO maybe reduce defaults later
}

// TODO try without this in case bootstraps 'just works' when not built
if (false) { // TODO can I make this conditional on being run as script?
  const authCmd = '/home/mrh/src/safe/safe-cli-boilerplate/dist/mock/safecmd'
  const authScript = '/snapshot/safe-cli-boilerplate/safecmd.js'
  appConfig.customExecPath = [
    authCmd, authScript,
    '--pid', String(process.pid), // get this from process.pid
    '--uri']
}

// Auth with Safetnetwork
try {
  console.log('try bootstrap()...')
  Safenetwork.bootstrap(appConfig, appPermissions, process.argv).then(app => {
    IpfsFuse.mount(Safenetwork, mountPath, {
      ipfs: {},
      fuse: { displayFolder: true, force: true }
    }, (err) => {
      if (err) return console.error(err.message)
      console.log(`Mounted IPFS filesystem on ${mountPath}`)
    })
  })
} catch (err) {
  const msg = 'Failed to mount IPFS FUSE volume'
  console.log(msg)
  explain(err, msg)
  //        throw new Error(err)
}

let destroyed = false

process.on('SIGINT', () => {
  if (destroyed) return

  destroyed = true

  IpfsFuse.unmount(mountPath, (err) => {
    if (err) return console.error(err.message)
    console.log(`Unmounted IPFS filesystem at ${mountPath}`)
  })
})
