/*
MIT License

APPLICABLE TO THIS FILE ONLY: safe-app-cli.js which is adapted from
https://github.com/project-decorum/decorum-lib/src/Safe.ts
commit: 1d08f743e60c7953169290abaa37179de3508862

Copyright (c) 2018 Benno Zeeman

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */

const fs = require('fs')
const ipc = require('node-ipc')
const path = require('path')
const yargs = require('yargs')
const Safe = require('@maidsafe/safe-node-app')

// No stdout from node-ipc
ipc.config.silent = true

Safe.bootstrap = async (info) => {
  const options = {
    libPath: getLibPath()
  }

  const argv = yargs
    .option('pid', {
      type: 'number'
    })
    .option('uri', {
      type: 'string'
    })
    .help()
    .argv

  if (argv.pid !== undefined) {
    if (argv.uri === undefined) {
      throw Error('--uri undefined')
    }

    await ipcSend(String(argv.pid), argv.uri)

    process.exit()
  }

  let uri
  if (argv.uri !== undefined) {
    uri = argv.uri
  } else {
    await authorise(process.pid, info, options)
    uri = await ipcReceive(String(process.pid))
  }

  return Safe.fromAuthURI(info, uri, null, options)
}

async function authorise (pid, info, options) {
  info.customExecPath = [
    process.argv[0], process.argv[1],
    '--pid', String(pid),
    '--uri'
  ]

  const app = await Safe.initializeApp(info, null, options)
  const uri = await app.auth.genAuthUri({})

  await app.auth.openUri(uri.uri)
}

async function ipcReceive (id) {
  return new Promise((resolve) => {
    ipc.config.id = id

    ipc.serve(() => {
      ipc.server.on('auth-uri', (data) => {
        resolve(data.message)
        ipc.server.stop()
      })
    })

    ipc.server.start()
  })
}

async function ipcSend (id, data) {
  return new Promise((resolve) => {
    ipc.config.id = id + '-cli'

    ipc.connectTo(id, () => {
      ipc.of[id].on('connect', () => {
        ipc.of[id].emit('auth-uri', { id: ipc.config.id, message: data })

        resolve()
        ipc.disconnect('world')
      })
    })
  })
}

/**
 * @returns
 */
function getLibPath () {
  const roots = [
    path.dirname(process.argv[0]),
    path.dirname(process.argv[1])
  ]

  const locations = [
    'node_modules/@maidsafe/safe-node-app/src/native'
  ]

  for (const root of roots) {
    for (const location of locations) {
      const dir = path.join(root, location)

      if (fs.existsSync(dir)) {
        return dir
      }
    }
  }

  throw Error('No library directory found.')
}

module.exports = Safe
