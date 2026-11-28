const { app, BrowserWindow } = require('electron')
const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

const LOG = 'C:\\temp\\bs-main.log'
function log(s) { try { fs.appendFileSync(LOG, new Date().toISOString() + ' ' + s + '\n') } catch { /* ignore */ } }
log('boot, packaged=' + app.isPackaged)

let child = null
function rootDir() { return app.isPackaged ? process.resourcesPath : path.join(__dirname, '..') }
function nodeExe() {
  const bundled = path.join(rootDir(), 'runtime', 'node.exe')
  return fs.existsSync(bundled) ? bundled : 'node'
}

function startServer() {
  const root = rootDir()
  const exe = nodeExe()
  const script = path.join(root, 'server.mjs')
  log('spawn ' + exe + ' ' + script)
  child = spawn(exe, [script], { cwd: root, env: Object.assign({}, process.env, { OPEN_BROWSER: '0' }), stdio: 'ignore', windowsHide: true })
  child.on('error', (e) => log('spawn error ' + e.message))
  child.on('exit', (c) => log('child exit ' + c))
}

app.whenReady().then(() => {
  log('ready')
  startServer()
  const win = new BrowserWindow({ width: 1240, height: 820, title: '卡密后台', autoHideMenuBar: true, backgroundColor: '#0b1220' })
  win.loadURL('http://127.0.0.1:8124/')
  log('window loaded')
})

app.on('window-all-closed', () => { if (child) { try { child.kill() } catch { /* ignore */ } } app.quit() })
