const {app,dialog}=require('electron');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=require('./runtime-root.cjs')('.library-runtime');fs.mkdirSync(root,{recursive:true});app.setPath('userData',root);
const stage=process.argv.find(v=>v==='write'||v==='read');
const packaged=process.argv.includes('--packaged-test');
const base=packaged?path.join(__dirname,'..','dist','win-unpacked','resources','app.asar'):path.join(__dirname,'..');
const report=path.join(root,(packaged?'packaged-':'')+stage+'.json');
const errors=[];let selectedFolder=null;
dialog.showOpenDialog=async()=>selectedFolder?{canceled:false,filePaths:[selectedFolder]}:{canceled:true,filePaths:[]};
setTimeout(()=>{fs.writeFileSync(report,JSON.stringify({ok:false,error:'timeout',errors}));app.exit(1)},45000);
app.on('browser-window-created',(_e,win)=>{
  win.hide();win.webContents.setBackgroundThrottling(false);win.webContents.on('console-message',(_e,level,msg)=>{if(level>=3) errors.push(msg)});
  win.webContents.once('did-finish-load',async()=>{
    const run=code=>win.webContents.executeJavaScript(code);
    const open=page=>win.loadFile(path.join(base,page));
    async function expectSaved(){
      await open('Album.html');assert.equal(await run('rolls[0].name'),'迁移验证胶卷');
      assert.equal(await run('rolls[0].shots[0].rating'),4.5);
      assert.equal(await run(`document.querySelector('.frame img').naturalWidth`),1);
      await open('journal.html');assert.equal(await run('notes.value'),'迁移后仍保留的随笔');
      await open('couple.html');assert.equal(await run('nickA.textContent'),'本机甲');
      await open('wishlist.html');assert.equal(await run('rolls[0].frames[0].letters.a'),'本机信笺');
      await open('two-rolls.html');assert.equal(await run(`state['2026-05-29'].a.shots[0].note`),'本机记事');
    }
    try{
      if(stage==='write'){
        await open('Album.html');
        await run(`rolls[0].name='迁移验证胶卷';rolls.forEach(r=>r.active=false);rolls[0].active=true;rolls[0].shots=[];persist();renderAll();
          const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));handleFiles([new File([bytes],'原图.png',{type:'image/png'})]);`);
        for(let i=0;i<100 && await run('importing');i++) await new Promise(r=>setTimeout(r,30));
        await run(`rolls[0].shots[0].rating=4.5;persist();`);
        await open('journal.html');await run(`notes.value='迁移后仍保留的随笔';notes.dispatchEvent(new Event('input'));`);
        await open('couple.html');await run(`nickA.textContent='本机甲';nickA.dispatchEvent(new Event('input'));`);
        await open('wishlist.html');await run(`rolls[0].frames[0].letters.a='本机信笺';persistWishlist();`);
        await open('two-rolls.html');await run(`state['2026-05-29'].a.shots[0].note='本机记事';persistCalendar();`);
        await open('index.html');
        const source=await run('window.libraryStorage.info().directory');
        const old=fs.readFileSync(path.join(source,'album.json'));
        selectedFolder=fs.mkdtempSync(path.join(root,'自选位置-'));
        await run(`document.getElementById('library-settings-button').click();document.getElementById('library-migrate').click()`);
        for(let i=0;i<200 && await run(`document.getElementById('library-migrate').disabled`);i++) await new Promise(r=>setTimeout(r,30));
        assert.match(await run(`document.getElementById('library-status').textContent`),/已切换/);
        const info=await run('window.libraryStorage.info()');
        assert.equal(info.directory,path.join(selectedFolder,'DARKROOM照片库'));
        assert.deepEqual(fs.readFileSync(path.join(source,'album.json')),old);
        // Folder dialog cancellation must leave the active location unchanged.
        selectedFolder=null;
        const canceled=await run(`window.libraryStorage.choose('open')`);
        assert.equal(canceled.canceled,true);
        assert.equal(await run('window.libraryStorage.info().directory'),info.directory);
        try{fs.writeFileSync(path.join(root,'settings.png'),(await win.webContents.capturePage()).toPNG())}catch{}
        await expectSaved();
        // Open a retained library explicitly, then return to the migrated library.
        await open('index.html');selectedFolder=source;
        await run(`window.libraryStorage.choose('open')`);
        assert.equal(await run('window.libraryStorage.info().directory'),source);
        selectedFolder=info.directory;await run(`window.libraryStorage.choose('open')`);
      }
      await expectSaved();
      assert.deepEqual(errors,[]);
      fs.writeFileSync(report,JSON.stringify({ok:true,stage,packaged,checks:['home settings UI','directory chooser IPC','photo and all text migration','original library retained','cancel unchanged','open existing library','process restart and photo rendering'],errors}));app.exit(0);
    }catch(error){fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack,errors}));app.exit(1)}
  });
});
app.setAppPath(base);
require(path.join(base,'main.js'));
