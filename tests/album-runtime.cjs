// Run with Electron twice: ... tests/album-runtime.cjs write|read
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const root = require('./runtime-root.cjs')('.runtime');
fs.mkdirSync(root, { recursive: true });
app.setPath('userData', root);
const stage = process.argv.find(value=>value==='write'||value==='read');
const packaged=process.argv.includes('--packaged-test');
const base=packaged?path.join(__dirname,'..','dist','win-unpacked','resources','app.asar'):path.join(__dirname,'..');
const errors = [];
setTimeout(()=>{fs.writeFileSync(path.join(root,(packaged?'packaged-':'')+stage+'.json'),JSON.stringify({ok:false,error:'Runtime test timed out',errors}));app.exit(1)},30000);
app.on('browser-window-created', (_event, win) => {
  win.hide();win.webContents.setBackgroundThrottling(false);
  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 3) errors.push(message);
  });
  win.webContents.once('did-finish-load', async () => {
    try {
      await win.loadFile(path.join(base, 'Album.html'));
      const run = code => win.webContents.executeJavaScript(code);
      assert.equal(await run('storageReady'), true);
      await run('window.confirm=()=>true; window.alert=m=>{throw new Error(m)}; void 0');
      if (stage === 'write') {
        await run(`
          rolls=rolls.filter(r=>r.name!=='持久化验证胶卷');
          if(!rolls.some(r=>r.active)) rolls[0].active=true;
          persist();renderAll();
          document.getElementById('add-roll').click();
          let input=document.querySelector('.name-input');
          input.value='持久化验证胶卷'; input.dispatchEvent(new Event('blur'));
          document.querySelectorAll('.roll')[rolls.length-1].click();
          const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
          handleFiles([new File([bytes],'测试照片.png',{type:'image/png'})]);
        `);
        // Wait for the real asynchronous FileReader import, not a fabricated state.
        for (let i=0;i<100 && await run('importing');i++) await new Promise(r=>setTimeout(r,50));
        assert.equal(await run('activeRoll().shots.length'),1);
        await run(`
          document.getElementById('btn-edit').click();
          document.getElementById('m-title').value='重启后仍保留';
          document.getElementById('m-location').value='哈尔滨';
          document.getElementById('m-camera').value='测试相机';
          document.getElementById('m-tags').value='验证,中文';
          document.getElementById('modal-save').click();
          document.querySelector('[data-val="4.5"]').click();
        `);
        await win.loadFile(path.join(base,'index.html'));
        await win.loadFile(path.join(base,'Album.html'));
      }
      const value = await run('({name:activeRoll().name,shot:activeRoll().shots[0]})');
      assert.equal(value.name,'持久化验证胶卷');
      assert.equal(value.shot.title,'重启后仍保留');
      assert.equal(value.shot.location,'哈尔滨');
      assert.equal(value.shot.camera,'测试相机');
      assert.equal(value.shot.tags,'验证,中文');
      assert.equal(value.shot.rating,4.5);
      assert.ok(value.shot.src.startsWith('file:'));
      assert.equal(await run(`document.querySelector('.frame img').complete && document.querySelector('.frame img').naturalWidth`),1);
      try { fs.writeFileSync(path.join(root,(packaged?'packaged-':'')+stage+'.png'), (await win.webContents.capturePage()).toPNG()); }
      catch(error) { fs.writeFileSync(path.join(root,stage+'-capture.txt'),error.message); }
      if (stage === 'read') {
        await run(`document.getElementById('btn-delete').click()`);
        await win.loadFile(path.join(base,'Album.html'));
        assert.equal(await run('activeRoll().shots.length'),0);
        await run('window.confirm=()=>true; void 0');
        await run(`document.querySelector('.roll.active .del').click()`);
        await win.loadFile(path.join(base,'Album.html'));
        assert.equal(await run(`rolls.some(r=>r.name==='持久化验证胶卷')`),false);
      }
      assert.deepEqual(errors,[]);
      fs.writeFileSync(path.join(root,(packaged?'packaged-':'')+stage+'.json'),JSON.stringify({ok:true,stage,checks:['preload IPC','photo import','metadata','rating','page reload',stage==='read'?'process restart and persistent deletion':'navigation'],errors}));
      app.exit(0);
    } catch(error) {
      fs.writeFileSync(path.join(root,(packaged?'packaged-':'')+stage+'.json'),JSON.stringify({ok:false,error:error.stack,errors}));
      app.exit(1);
    }
  });
});
app.setAppPath(base);
require(path.join(base,'main.js'));
