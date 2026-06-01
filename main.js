const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'DARKROOM',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: '#1a1a1a'
  })

  win.loadFile('index.html')
  win.setMenuBarVisibility(false)
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
