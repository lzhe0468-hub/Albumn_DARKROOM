const { contextBridge, ipcRenderer } = require('electron');

function request(channel, data) {
  const result = ipcRenderer.sendSync(channel, data);
  if (!result || !result.ok) throw new Error(result?.error || '无法连接相册存储');
  return result.value;
}

// Narrow bridge: no arbitrary filesystem paths or Electron APIs are exposed.
contextBridge.exposeInMainWorld('albumStorage', {
  load: () => request('album:load'),
  save: data => request('album:save', data),
  metadata: photoFile => invoke('album:metadata',photoFile)
});
contextBridge.exposeInMainWorld('textStorage', {
  load: section => request('text:load', { section }),
  save: (section, data) => request('text:save', { section, data })
});
async function invoke(channel,data) {
  const result=await ipcRenderer.invoke(channel,data);
  if(!result?.ok) throw new Error(result?.error||'照片库操作失败');
  return result.value;
}
contextBridge.exposeInMainWorld('libraryStorage', {
  info:()=>request('library:info'),
  choose:mode=>invoke('library:choose',mode),
  reveal:()=>invoke('library:reveal')
});
