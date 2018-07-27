const Fuse = require('fuse-bindings')
const explain = require('explain-error')
const debug = require('debug')('safenetwork-fuse:readdir')

async function callSafeApi (safeJsApi, path) { // TODO testing only
  console.log('callSafeApi(' + path + ')')

  const typeTag = 15000
  const md = await safeJsApi.appHandle().mutableData.newRandomPublic(typeTag)

  const initialData = {
    'random_key_1': JSON.stringify({
      text: 'Scotland to try Scotch whisky',
      made: false
    }),
    'random_key_2': JSON.stringify({
      text: 'Patagonia before I\'m too old',
      made: false
    })
  }

  await md.quickSetup(initialData)

  console.log('Created Mutable Data with contents: ')
  let items = await getItems(md)
  items.map((key, value) => {
    console.log(key + ' = ' + value)
  })
}

async function getItems (md) {
  const entries = await md.getEntries()
  let items = []

  await entries.forEach((key, value) => {
    if (value.buf.length === 0) return

    const parsedValue = JSON.parse(value.buf)
    items.push({ key: key, value: parsedValue, version: value.version })
  })
  return items
}

const fakeReadDir = {
  '/': ['one', 'two', 'three'],
  '/one': ['four', 'five', 'happybeing']
}

const fakeGetattr = {
  '/': 'directory',
  '/one': 'directory',
  '/two': 'file',
  '/three': 'file',
  '/one/four': 'file',
  '/one/five': 'file',
  '/one/happybeing': 'file'
}
/*
 * Pseudocode for a SAFE VFS implementation of readdir()
 *
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
 */
module.exports = (safeJsApi) => {
  return {
    readdir (path, reply) {
      debug({ path })
      callSafeApi(safeJsApi, path).then(() => { // TODO testing only
        console.log('done callSafeApi on path: ' + path)
      })

      let listing = fakeReadDir[path]
      if (listing)
        reply(0, listing)
      else
        reply(Fuse.EREMOTEIO)

      /*
      ipfs.files.ls(path, (err, files) => {
        if (err) {
          err = explain(err, 'Failed to ls path')
          debug(err)
          return reply(Fuse.EREMOTEIO)
        }
        reply(0, files.map(f => f.name || f.hash))
      })*/
    }
  }
}
