const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')
const { LibraryManager } = require('./library-manager')
const fs = require('fs')
const { readPhotoMetadata } = require('./photo-metadata')

// Prevent two application processes from overwriting each other's snapshots.
const primary = app.requestSingleInstanceLock()
if (!primary) app.quit()

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'DARKROOM',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: '#1a1a1a'
  })

  win.loadFile('index.html')
  win.setMenuBarVisibility(false)
}

app.whenReady().then(() => {
  if (!primary) return
  const library = new LibraryManager(app.getPath('userData'),{protectedDirectories:[app.isPackaged?path.dirname(process.execPath):__dirname]})
  const isHome=event=>event.senderFrame.url===pathToFileURL(path.join(__dirname,'index.html')).href
  ipcMain.on('library:info',event=>{
    event.returnValue=isHome(event)?{ok:true,value:library.info()}:{ok:false,error:'请在首页设置照片库'}
  })
  ipcMain.handle('library:choose',async(event,mode)=>{
    try {
      if(!isHome(event)) throw new Error('请在首页设置照片库')
      if(!['migrate','open'].includes(mode)) throw new Error('未知照片库操作')
      if(library.busy) throw new Error('照片库正在切换，请稍候')
      const result=await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender),{
        title:mode==='migrate'?'选择新的保存位置，将在其中创建 DARKROOM照片库':'选择已有的 DARKROOM 照片库文件夹',
        properties:['openDirectory','createDirectory'],
        buttonLabel:mode==='migrate'?'保存到此位置':'打开照片库'
      })
      if(result.canceled || !result.filePaths.length) return {ok:true,value:{canceled:true}}
      const value=mode==='migrate'?await library.migrate(result.filePaths[0]):await library.open(result.filePaths[0])
      return {ok:true,value}
    } catch(error) {return {ok:false,error:error.message}}
  })
  ipcMain.handle('library:reveal',async event=>{
    try {
      if(!isHome(event)) throw new Error('请在首页打开照片库')
      library.assertReady()
      const error=await shell.openPath(library.directory)
      if(error) throw new Error(error)
      return {ok:true,value:true}
    } catch(error) {return {ok:false,error:error.message}}
  })
  app.on('before-quit',event=>{if(library.busy) event.preventDefault()})
  const documentPages = {journal:'journal.html',wishlist:'wishlist.html',calendar:'two-rolls.html',people:'couple.html'}
  for (const channel of ['text:load','text:save']) {
    ipcMain.on(channel,(event,payload) => {
      try {
        const section=payload?.section
        if (!Object.hasOwn(documentPages,section)) throw new Error('未知文字存档')
        const allowed = section==='people' && channel==='text:load'
          ? ['couple.html','two-rolls.html','wishlist.html'] : [documentPages[section]]
        if (!allowed.some(page=>event.senderFrame.url===pathToFileURL(path.join(__dirname,page)).href)) throw new Error('页面无权访问此文字存档')
        const document=library.documentStore(section)
        if(channel==='text:save') library.prepareWrite()
        event.returnValue={ok:true,value:channel==='text:load'?document.read():document.write(payload.data)}
      } catch(error) {event.returnValue={ok:false,error:error.message}}
    })
  }
  for (const channel of ['album:load', 'album:save']) {
    ipcMain.on(channel, (event, data) => {
      try {
        if (event.senderFrame.url !== pathToFileURL(path.join(__dirname, 'Album.html')).href) {
          throw new Error('此页面不能访问相册存档')
        }
        const store=library.albumStore()
        if(channel==='album:save') library.prepareWrite()
        event.returnValue = { ok: true, value: channel === 'album:load' ? store.read() : store.write(data) }
      } catch (error) {
        event.returnValue = { ok: false, error: error.message }
      }
    })
  }
  ipcMain.handle('album:metadata',async(event,photoFile)=>{
    try {
      if(event.senderFrame.url!==pathToFileURL(path.join(__dirname,'Album.html')).href) throw new Error('此页面不能读取照片信息')
      if(typeof photoFile!=='string'||!/^[a-f0-9]{64}\.(png|jpg|gif|webp|bmp|avif|tif|ico)$/.test(photoFile)) throw new Error('照片编号无效')
      const store=library.albumStore()
      const data=store.read().data
      if(!data?.rolls.some(roll=>roll.shots.some(shot=>shot.photoFile===photoFile))) throw new Error('照片不属于当前相册')
      const bytes=await fs.promises.readFile(path.join(store.photos,photoFile))
      return {ok:true,value:await readPhotoMetadata(bytes)}
    }catch(error){return {ok:false,error:error.message}}
  })
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
