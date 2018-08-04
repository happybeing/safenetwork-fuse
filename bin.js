#!/usr/bin/env node

const Os = require('os')
const Path = require('path')
const safeJsApi = require('safenetworkjs').SafenetworkApi
const SafeVfs = require('./src/safe-vfs')
const explain = require('explain-error')
const yargs = require('yargs')

const argv = yargs
  .option('pid', { type: 'number' }) // pid for SAFE Auth
  .option('uri', { type: 'string' }) // uri for SAFE Auth
  .help()
  .argv

const mountPath = process.platform !== 'win32'
  ? Path.join(Os.homedir(), 'SAFE')
  : 'I:\\'

// TODO: parameterise these? or separate out?
let appConfig = {
  id: 'safenetwork-fuse',
  name: 'SAFE Network FUSE',
  vendor: 'theWebalyst'
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
let safeVfs
try {
  console.log('try bootstrap()...')
  safeJsApi.bootstrap(appConfig, appPermissions, argv).then(app => {
    safeVfs = new SafeVfs(safeJsApi)
    safeVfs.mountFuse(mountPath, {
      ipfs: {},
      fuse: { displayFolder: true, force: true }
    }).then(() => {
      console.log(`Mounted SAFE filesystem on ${mountPath}`)
    }).catch((err) => {
      const msg = 'Failed to mount SAFE FUSE volume'
      console.log(msg)
      explain(err, msg)
    })
  })
} catch (err) {
  console.error(err.message)
  const msg = 'Failed to mount SAFE FUSE volume'
  console.log(msg)
  explain(err, msg)
  //        throw new Error(err)
}

let destroyed = false

process.on('SIGINT', () => {
  if (destroyed) return

  destroyed = true

  try {
    safeVfs.unmountFuse(mountPath).then(() => {
      console.log(`Unmounted SAFE filesystem at ${mountPath}`)
    })
  } catch (err) {
    console.error(err.message)
    const msg = 'Failed to mount SAFE FUSE volume'
    console.log(msg)
    explain(err, msg)
    //        throw new Error(err)
  }
})
