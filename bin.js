#!/usr/bin/env node

const debug = require('debug')('safe-fuse:bin')
const Os = require('os')
const path = require('path')
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
  ? path.join(Os.homedir(), 'SAFE')
  : 'I:\\'

// TODO: parameterise these? or separate out?
let appConfig = {
  id: 'safenetwork-fuse',
  name: 'SAFE Network FUSE',
  vendor: 'theWebalyst'
}

const appContainers = {
  // TODO is this right for solid service container (ie solid.<safepublicid>)
  _public: ['Read', 'Insert', 'Update', 'Delete'], // request to insert into `_public` container
  _publicNames: ['Read', 'Insert', 'Update', 'Delete'] // TODO maybe reduce defaults later
}

const containerOpts = {
  own_container: false
}

// Auth with Safetnetwork
let safeVfs
try {
  debug('try bootstrap()...')
  safeJsApi.bootstrap(appConfig, appContainers, containerOpts, argv).then(async (app) => {
    safeVfs = new SafeVfs(safeJsApi)
    // TODO remove this temp code chasing getContainer() issue:
    safeJsApi._publicMdata = await safeJsApi.auth.getContainer('_public')

    safeVfs.mountFuse(mountPath, {
      fuse: { displayFolder: true, force: true }
    }).then(() => {
      return Promise.all([
        // TODO replace the following fixed defaults with CLI configured mounts
        safeVfs.mountContainer({safePath: '_public'})
        // this.mountContainer ({safePath: '_publicNames', PublicNamesHandler)
      ]).then(() => {
        debug(`Mounted SAFE filesystem on ${mountPath}`)
      })
    }).catch((err) => {
      const msg = 'Failed to mount SAFE FUSE volume'
      debug(msg)
      explain(err, msg)
    })
  })
} catch (err) {
  console.error(err.message)
  const msg = 'Failed to mount SAFE FUSE volume'
  debug(msg)
  explain(err, msg)
  //        throw new Error(err)
}

let destroyed = false

process.on('SIGINT', () => {
  if (destroyed) return

  destroyed = true

  try {
    safeVfs.unmountFuse(mountPath).then(() => {
      debug(`Unmounted SAFE filesystem at ${mountPath}`)
    })
  } catch (err) {
    console.error(err.message)
    const msg = 'Failed to mount SAFE FUSE volume'
    debug(msg)
    explain(err, msg)
    //        throw new Error(err)
  }
})
