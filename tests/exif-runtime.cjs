const {app}=require('electron');
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=require('./runtime-root.cjs')('.exif-runtime');fs.mkdirSync(root,{recursive:true});app.setPath('userData',root);
const stage=process.argv.find(v=>v==='write'||v==='read');
const fixture=process.argv.find(v=>v.startsWith('--photo='))?.slice(8);
const packaged=process.argv.includes('--packaged-test');
const base=packaged?path.join(__dirname,'..','dist','win-unpacked','resources','app.asar'):path.join(__dirname,'..');
const report=path.join(root,(packaged?'packaged-':'')+stage+'.json');const errors=[];
setTimeout(()=>{fs.writeFileSync(report,JSON.stringify({ok:false,error:'timeout',errors}));app.exit(1)},45000);
app.on('browser-window-created',(_e,win)=>{
  win.hide();win.webContents.setBackgroundThrottling(false);win.webContents.on('console-message',(_e,level,msg)=>{if(level>=3) errors.push(msg)});
  win.webContents.once('did-finish-load',async()=>{
    const run=code=>win.webContents.executeJavaScript(code);
    const open=()=>win.loadFile(path.join(base,'Album.html'));
    async function waitForExif(){for(let i=0;i<200 && !await run('activeRoll().shots[0]?.exifVersion');i++) await new Promise(r=>setTimeout(r,30));}
    try{
      await open();await run('window.alert=m=>{window.lastAlert=m};void 0');
      if(stage==='write'){
        const bytes=fs.readFileSync(fixture);
        await run(`rolls.forEach(r=>r.active=false);rolls[0].active=true;rolls[0].shots=[];selectedIdx=-1;persist();renderAll();
          const bytes=Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}),c=>c.charCodeAt(0));
          handleFiles([new File([bytes],'DSC_0147.JPG',{type:'image/jpeg'})]);`);
        const meta=await run('activeRoll().shots[0]');
        assert.equal(meta.camera,'NIKON Z 30');assert.equal(meta.aperture,'6.3');assert.equal(meta.shutter,'1/640 s');
        assert.equal(meta.iso,'125');assert.equal(meta.ev,'+0.3 EV');assert.equal(meta.focal,'50 mm');assert.equal(meta.focal35,'75 mm');
        assert.equal(meta.lens,'NIKKOR Z DX 16-50mm f/3.5-6.3 VR');assert.equal(meta.mode,'A');
        assert.equal(await run(`document.getElementById('exif-aperture').textContent`),'ƒ/6.3');
        assert.equal(await run(`document.getElementById('exif-shutter').textContent`),'1/640 s');
        assert.equal(await run(`document.getElementById('exif-iso').textContent`),'125');
        const stored=fs.readFileSync(path.join(root,'album-library','photos',meta.photoFile));
        assert.equal(crypto.createHash('sha256').update(stored).digest('hex'),crypto.createHash('sha256').update(bytes).digest('hex'));
        await run(`Promise.all(Array.from(document.querySelectorAll('.frame img,#preview-img')).map(img=>img.decode().catch(()=>{})))`);
        try{fs.writeFileSync(path.join(root,'nikon.png'),(await win.webContents.capturePage()).toPNG())}catch{}
        // Simulate an older imported photo whose parameters were never extracted.
        await run(`for(const key of window.photoMetadata.fields) activeRoll().shots[0][key]='';activeRoll().shots[0].mode='A';delete activeRoll().shots[0].exifVersion;delete activeRoll().shots[0].exifStatus;persist();`);
        await open();await waitForExif();
        assert.equal(await run('activeRoll().shots[0].aperture'),'6.3');
        assert.equal(await run('activeRoll().shots[0].ev'),'+0.3 EV');
        await run(`document.getElementById('btn-edit').click();document.getElementById('m-iso').value='900';document.getElementById('m-aperture').value='';document.getElementById('m-title').value='我的海鸥';document.getElementById('modal-save').click();document.getElementById('read-exif').click();`);
        for(let i=0;i<100 && await run('metadataPending.size>0');i++) await new Promise(r=>setTimeout(r,30));
      }
      const saved=await run('activeRoll().shots[0]');
      assert.equal(saved.iso,'900');assert.equal(saved.aperture,'');assert.equal(saved.title,'我的海鸥');
      assert.equal(saved.shutter,'1/640 s');assert.equal(saved.ev,'+0.3 EV');
      assert.equal(saved.camera,'NIKON Z 30');assert.equal(saved.focal35,'75 mm');
      assert.ok(saved.metadataEdited.includes('iso'));assert.ok(saved.metadataEdited.includes('aperture'));
      assert.ok(await run(`document.querySelector('.frame img').naturalWidth>0`));
      assert.deepEqual(errors,[]);
      fs.writeFileSync(report,JSON.stringify({ok:true,stage,packaged,checks:['actual Nikon JPEG import','aperture/shutter/ISO/EV/lens/focal/time','Inspector display','original bytes preserved','legacy photo automatic recovery','explicit EXIF reread','manual edits preserved','restart'],errors}));app.exit(0);
    }catch(e){fs.writeFileSync(report,JSON.stringify({ok:false,error:e.stack,errors}));app.exit(1)}
  });
});
app.setAppPath(base);
require(path.join(base,'main.js'));
