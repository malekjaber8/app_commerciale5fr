// Application bureau (admin) : ouvre l'interface admin dans une fenetre native.
// Un mini serveur local (127.0.0.1) sert les fichiers compiles : l'origine est http://localhost,
// deja autorisee par Firebase Auth, et les images/videos se chargent normalement.
const { app, BrowserWindow, Menu, shell } = require('electron')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

const ROOT = path.join(__dirname, '..', 'dist-desktop')
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname)
        let file = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath))
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html')
        const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'
        const size = fs.statSync(file).size
        const range = req.headers.range
        if (range) {
          const m = /bytes=(\d*)-(\d*)/.exec(range)
          const start = m && m[1] ? parseInt(m[1], 10) : 0
          const end = m && m[2] ? parseInt(m[2], 10) : size - 1
          res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 })
          fs.createReadStream(file, { start, end }).pipe(res)
        } else {
          res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': size })
          fs.createReadStream(file).pipe(res)
        }
      } catch {
        res.writeHead(500); res.end('Erreur')
      }
    })
    server.listen(0, '127.0.0.1', () => resolve(server.address().port))
  })
}

async function createWindow() {
  const port = await startServer()
  const win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    title: 'Administration - Les Cinq Freres',
    backgroundColor: '#f8fafc',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  Menu.setApplicationMenu(null)
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  await win.loadURL(`http://localhost:${port}/`)

  // Mode test : capture d'ecran puis fermeture (utilise pour verifier le rendu)
  if (process.env.ELECTRON_SCREENSHOT) {
    setTimeout(async () => {
      const img = await win.webContents.capturePage()
      fs.writeFileSync(process.env.ELECTRON_SCREENSHOT, img.toPNG())
      app.quit()
    }, 12000)
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
