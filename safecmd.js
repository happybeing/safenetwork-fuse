/*
GPL-3.0 License

Copyright (C) 2018 Mark Hughes

For GPL 3.0 License details see: https://opensource.org/licenses/GPL-3.0
*/
const fs = require('fs')
const filesize = require('filesize')
const yargs = require('yargs')
const safeApp = require('./safe-app-cli') // SAFE App with added .args (cli), .bootstrap (for IPC auth)

safecmd()

async function safecmd () {
  // ---------------------
  // Command Line Handling
  // ---------------------

  const argv = yargs
    .option('pid', { type: 'number' }) // pid for SAFE Auth
    .option('uri', { type: 'string' }) // uri for SAFE Auth
    .help()
    .argv

  // -----------------
  // Pre-auth activity
  // -----------------

  // -------- List directory with file sizes ------------------

  var files = fs.readdirSync('./')
  files.forEach(file => {
    let fsize = filesize(fs.statSync(file).size)

    console.log(`${file} - ${fsize}`)
  })

  // --------------
  // Auth with SAFE
  // --------------
  const appInfo = {
    id: 'example',
    name: 'example',
    vendor: 'example'
  }
  const app = await safeApp.bootstrap(appInfo, argv)

  // ------------------
  // Post auth activity
  // ------------------

  // -------- Create Mutable Data with Public Access -----------

  const typeTag = 15001
  const data = { key: 'Safe World' }

  // Mutable data created at random address with public access
  let mData = await app.mutableData.newRandomPublic(typeTag)

  // Setup MD with the app having full access permission easily
  await mData.quickSetup(data)
  console.log('Quick Setup Completed')

  // -------- Create and Read files using NFS ------------------

  // Returns NFS Handle, which allows to use NFS functions
  let nfs = await mData.emulateAs('NFS')

  // Creates and Saves the file to the network
  let file = await nfs.create('Hello Safe World')
  console.log('New file is created and saved to the network successfully')

  // Insert the file to mutable data and commits to the network
  await nfs.insert('hello.txt', file)

  // Find the file of the given filename or from the path
  file = await nfs.fetch('hello.txt')

  /* Opens the file for reading or writing
      * Open file modes:
      * CONSTANTS.NFS_FILE_MODE_OVERWRITE - Replaces the entire content of the file when writing data
      * CONSTANTS.NFS_FILE_MODE_APPEND - Appends to the existing data in the file
      * CONSTANTS.NFS_FILE_MODE_READ - Open file to read
  */
  let opened = await nfs.open(file, safeApp.CONSTANTS.NFS_FILE_MODE_READ)

  /* Reads the file content
      * Read modes:
      * CONSTANTS.NFS_FILE_START - refers position of the content - starts reading from the position specified, 0 means read from the beginning
      * CONSTANTS.NFS_FILE_END - refers length of the content - reads the content till the length specified, 0 means read till the end
      */
  let content = await opened.read(safeApp.CONSTANTS.NFS_FILE_START, safeApp.CONSTANTS.NFS_FILE_END)
  console.log('The file has been opened and read')

  // Prints: Hello Safe World
  console.log('The content of the file which has been read:', content.toString())
  process.exit()
}
