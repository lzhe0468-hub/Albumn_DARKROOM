const {app,dialog}=require('electron');
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.join(__dirname,'.safety-runtime');fs.mkdirSync(root,{recursive:true});
const stage=process.argv.find(v=>v==='before'||v==='after');
const session=path.join(root,'session.json');
const userData=stage==='before'?fs.mkdtempSync(path.join(root,'user-data-')):JSON.parse(fs.readFileSync(session,'utf8')).userData;
if(stage==='before')fs.writeFileSync(session,JSON.stringify({userData}));
app.setPath('userData',userData);
const base=stage==='before'?path.join(root,'before-update.asar'):path.join(__dirname,'..','dist','win-unpacked','resources','app.asar');
const report=path.join(root,stage+'.json'),errors=[];
let chosen=null;dialog.showOpenDialog=async()=>chosen?{canceled:false,filePaths:[chosen]}:{canceled:true,filePaths:[]};
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const photo='data:image/png;base64,'+bytes.toString('base64');
setTimeout(()=>{fs.writeFileSync(report,JSON.stringify({ok:false,error:'timeout',errors}));app.exit(1);},60000);
app.on('browser-window-created',(_e,win)=>{
  win.hide();win.webContents.setBackgroundThrottling(false);win.webContents.on('console-message',(_e,level,msg)=>{if(level>=3)errors.push(msg);});
  win.webContents.once('did-finish-load',async()=>{
    const run=code=>win.webContents.executeJavaScript(code);
    const open=async page=>{await win.loadFile(path.join(base,page));await run('window.confirm=()=>true;window.alert=m=>{window.lastAlert=m};void 0');};
    const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    const capture=directory=>{
      const values={};
      for(const name of fs.readdirSync(directory)) if(/^(album|journal|wishlist|calendar|people)\.json$/.test(name)) values[name]=digest(path.join(directory,name));
      for(const name of fs.readdirSync(path.join(directory,'photos')))values['photos/'+name]=digest(path.join(directory,'photos',name));
      return values;
    };
    async function verifyRecords(){
      await open('Album.html');assert.equal(await run('activeRoll().shots[0].title'),'升级保留的照片');assert.equal(await run('activeRoll().shots[0].rating'),4.5);
      assert.ok(await run(`document.querySelector('.frame img').naturalWidth>0`));
      await open('journal.html');assert.equal(await run('currentFrame().note'),'逐张感想，升级后也必须保留');assert.equal(await run('activeGoal.desc'),'升级前的构想');
      await open('couple.html');assert.equal(await run('nickA.textContent'),'本机甲');assert.equal(await run('nickB.textContent'),'本机乙');
      await open('wishlist.html');assert.equal(await run('rolls[0].frames[0].letters.a'),'甲的重要信笺');assert.equal(await run('rolls[0].frames[0].letters.b'),'乙的重要信笺');
      await open('two-rolls.html');assert.equal(await run(`state['2035-12-31'].a.shots[0].note`),'2035 年的双人记录');
    }
    try{
      if(stage==='before'){
        await open('Album.html');
        await run(`rolls.forEach(r=>r.active=false);rolls[0].active=true;rolls[0].shots=[];persist();renderAll();handleFiles([new File([Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}),c=>c.charCodeAt(0))],'升级保留的照片.png',{type:'image/png'})]);`);
        await run(`activeRoll().shots[0].rating=4.5;persist();`);
        await open('journal.html');
        await run(`activeGoal=goals[0];activeGoal.desc='升级前的构想';activeGoal.frames=[{id:crypto.randomUUID(),label:'收录作品',src:${JSON.stringify(photo)},note:'逐张感想，升级后也必须保留'}];activeGoal.selectedFrameId=activeGoal.frames[0].id;persistJournal();renderDetail();`);
        await open('couple.html');await run(`nickA.textContent='本机甲';nickB.textContent='本机乙';saveNicknames();`);
        await open('wishlist.html');await run(`rolls[0].frames[0].letters={a:'甲的重要信笺',b:'乙的重要信笺'};persistWishlist();`);
        await open('two-rolls.html');await run(`state['2035-12-31']={a:{cur:0,mood:'happy',shots:[{src:${JSON.stringify(photo)},note:'2035 年的双人记录',tint:0}]},b:{cur:0,mood:null,shots:[]}};goToMonth(2035,11,31);`);
        await verifyRecords();
        const directory=path.join(userData,'album-library'),expected=capture(directory);
        fs.writeFileSync(path.join(root,'expected.json'),JSON.stringify(expected));
        // Complete independent copy made before replacing the application resources.
        const backup=fs.mkdtempSync(path.join(root,'full-backup-'));fs.cpSync(directory,backup,{recursive:true});
        fs.writeFileSync(path.join(root,'backup-path.txt'),backup);
      }else{
        const expected=JSON.parse(fs.readFileSync(path.join(root,'expected.json'))),directory=path.join(userData,'album-library');
        await verifyRecords();assert.deepEqual(capture(directory),expected);
        assert.ok(fs.existsSync(path.join(userData,'library-location.json')));
        const revisions=fs.readdirSync(path.join(directory,'.upgrade-backups')).filter(n=>/^[a-f0-9]{16}$/.test(n));assert.ok(revisions.length>=1);
        const revision=revisions.map(n=>path.join(directory,'.upgrade-backups',n)).find(folder=>fs.existsSync(path.join(folder,'album.json')));
        for(const [name,hash] of Object.entries(expected))if(!name.startsWith('photos/'))assert.equal(digest(path.join(revision,name)),hash);
        // Real FileReader import delayed while the user changes the visible roll.
        await open('wishlist.html');
        const start=await run(`openRoll(rolls[0]);({index:curRoll.frames.findIndex(f=>!f.filled),other:JSON.stringify(rolls[1].frames)})`);
        await run(`const NativeReader=window.FileReader;window.FileReader=class extends NativeReader{readAsDataURL(file){setTimeout(()=>super.readAsDataURL(file),250)}};
          const transfer=new DataTransfer();transfer.items.add(new File([Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}),c=>c.charCodeAt(0))],'延迟导入.png',{type:'image/png'}));
          document.getElementById('upload-photo').files=transfer.files;document.getElementById('upload-photo').dispatchEvent(new Event('change'));openRoll(rolls[1]);
          const unload=new Event('beforeunload',{cancelable:true});window.dispatchEvent(unload);window.importProtected=unload.defaultPrevented;void 0`);
        assert.equal(await run('wishlistImporting'),1);assert.equal(await run('window.importProtected'),true);
        for(let i=0;i<100&&await run('wishlistImporting');i++)await new Promise(r=>setTimeout(r,30));
        assert.equal(await run(`rolls[0].frames[${start.index}].title`),'延迟导入');assert.equal(await run('JSON.stringify(rolls[1].frames)'),start.other);
        await open('index.html');const backupPath=fs.readFileSync(path.join(root,'backup-path.txt'),'utf8');
        chosen=fs.mkdtempSync(path.join(root,'restore-working-'));fs.cpSync(backupPath,chosen,{recursive:true});
        await run(`window.libraryStorage.choose('open')`);await verifyRecords();assert.deepEqual(capture(backupPath),expected);
      }
      assert.deepEqual(errors,[]);
      fs.writeFileSync(report,JSON.stringify({ok:true,stage,checks:stage==='before'?['previous release saves all sections','independent full-library copy']:['replace application resources','same metadata and original-image hashes','upgrade snapshot retained','all notes and ratings restored','wishlist delayed import cannot overwrite another roll','pending import guards exit','open and verify full-library backup'],errors}));app.exit(0);
    }catch(e){fs.writeFileSync(report,JSON.stringify({ok:false,error:e.stack,errors}));app.exit(1);}
  });
});
app.setAppPath(base);
require(path.join(base,'main.js'));
