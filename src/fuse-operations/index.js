const createCreate = require('./create')
const createFtruncate = require('./ftruncate')
const createGetattr = require('./getattr')
const createMkdir = require('./mkdir')
const createMknod = require('./mknod')
const createOpen = require('./open')
const createRead = require('./read')
const createReaddir = require('./readdir')
const createRename = require('./rename')
const createRmdir = require('./rmdir')
const createStatfs = require('./statfs')
const createUnlink = require('./unlink')
const createUtimens = require('./utimens')
const createWrite = require('./write')

module.exports = (safeJs) => Object.assign(
  createCreate(safeJs),
  createFtruncate(safeJs),
  createGetattr(safeJs),
  createMkdir(safeJs),
  createMknod(safeJs),
  createOpen(safeJs),
  createRead(safeJs),
  createReaddir(safeJs),
  createRename(safeJs),
  createRmdir(safeJs),
  createStatfs(safeJs),
  createUnlink(safeJs),
  createUtimens(safeJs),
  createWrite(safeJs)
)
