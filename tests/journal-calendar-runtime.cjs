const {app}=require('electron');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=require('./runtime-root.cjs')('.journal-runtime');fs.mkdirSync(root,{recursive:true});app.setPath('userData',root);
const stage=process.argv.find(v=>v==='write'||v==='read'),packaged=process.argv.includes('--packaged-test');
const base=packaged?path.join(__dirname,'..','dist','win-unpacked','resources','app.asar'):path.join(__dirname,'..');
const {DocumentStore}=require(path.join(base,'document-store.js'));
const originalWrite=DocumentStore.prototype.write;let failWrites=false;
DocumentStore.prototype.write=function(data){if(failWrites) throw new Error('模拟保存失败');return originalWrite.call(this,data);};
const fixture=process.argv.find(v=>v.startsWith('--photo='))?.slice(8);
const image=fixture?fs.readFileSync(fixture):Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const mime=fixture?'image/jpeg':'image/png',source='data:'+mime+';base64,'+image.toString('base64');
if(stage==='write') new DocumentStore(path.join(root,'album-library'),'journal').write({version:1,notes:'升级前的完整随笔\n不可丢失',nextGoalId:2,activeGoalId:1,
  goals:[{id:1,name:'原来的收藏',en:'',meta:'始于 2026.10.17',desc:'已有构想',status:'in-progress',cur:3,tgt:1,frames:['A','B','C'].map(label=>({src:source,label}))}]});
const report=path.join(root,(packaged?'packaged-':'')+stage+'.json'),errors=[];
setTimeout(()=>{fs.writeFileSync(report,JSON.stringify({ok:false,error:'timeout',errors}));app.exit(1)},60000);
app.on('browser-window-created',(_e,win)=>{
  win.hide();win.webContents.setBackgroundThrottling(false);win.webContents.on('console-message',(_e,level,msg)=>{if(level>=3) errors.push(msg);});
  win.webContents.once('did-finish-load',async()=>{
    const run=code=>win.webContents.executeJavaScript(code);
    const open=async page=>{await win.loadFile(path.join(base,page));await run(`window.confirm=()=>true;window.alert=m=>{window.lastAlert=m};window.prompt=()=>{throw new Error('原生 prompt 不应被调用')};void 0`);};
    const input=(id,text)=>run(`document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(text)};document.getElementById(${JSON.stringify(id)}).dispatchEvent(new Event('input',{bubbles:true}));void 0`);
    const clickPhoto=label=>run(`document.querySelector('[data-id="'+activeGoal.frames.find(f=>f.label===${JSON.stringify(label)}).id+'"]').click()`);
    const writeNote=async text=>{await run(`document.getElementById('btn-edit-notes').click()`);await input('notes',text);};
    const upload=async who=>{
      await run(`window.uploadPromise=handleUpload(${JSON.stringify(who)},[new File([Uint8Array.from(atob(${JSON.stringify(image.toString('base64'))}),c=>c.charCodeAt(0))],'记录.jpg',{type:${JSON.stringify(mime)}})]);void 0`);
      assert.equal(await run(`document.getElementById('calendar-note-dialog').open`),true);
      await input('calendar-note-input',who==='a'?'2035 年甲的记录':'2035 年乙的记录');
      await run(`document.querySelector('#calendar-note-form button[type="submit"]').click();window.uploadPromise`);
    };
    try{
      await open('journal.html');assert.equal(await run('journalStorage.ready'),true);
      assert.equal(await run('legacyNotes'),'升级前的完整随笔\n不可丢失');
      if(stage==='write'){
        assert.equal(await run('notes.value'),'');
        await run(`document.getElementById('legacy-notes').click()`);
        assert.equal(await run(`document.getElementById('legacy-notes-text').value`),'升级前的完整随笔\n不可丢失');
        await run(`document.getElementById('close-legacy-notes').click()`);
        await clickPhoto('A');await writeNote('A 的光线感想');
        await clickPhoto('B');assert.equal(await run('notes.value'),'');
        await writeNote('B 的构图感想\n第二行 💡');
        await clickPhoto('C');await writeNote('C 的色彩感想');
        await clickPhoto('B');assert.equal(await run('notes.value'),'B 的构图感想\n第二行 💡');
        await clickPhoto('A');await run(`document.querySelector('.ach.selected .ach-del').click()`);
        assert.equal(await run('notes.value'),'B 的构图感想\n第二行 💡');
        failWrites=true;await writeNote('B 保存失败后的输入');
        assert.match(await run(`document.getElementById('notes-save-status').textContent`),/保存失败/);
        failWrites=false;await writeNote('B 的构图感想\n第二行 💡');await run(`document.getElementById('btn-done-notes').click()`);
        await run(`document.getElementById('new-goal').click()`);assert.equal(await run('newGoalDialog.open'),true);
        await run(`document.getElementById('cancel-new-goal').click()`);assert.equal(await run('goals.length'),1);
        await run(`document.getElementById('new-goal').click()`);
        await input('new-goal-name','欣赏收藏');await input('new-goal-desc','收藏喜欢的照片并写下观看感想');
        await run(`document.querySelector('#new-goal-form button[type="submit"]').click()`);
        assert.equal(await run('newGoalDialog.open'),false);assert.equal(await run('activeGoal.name'),'欣赏收藏');
        assert.equal(await run('notes.disabled'),true);assert.equal(await run('activeGoal.tgt'),undefined);
        await run(`handleDropFiles(['D','E'].map(name=>new File([Uint8Array.from(atob(${JSON.stringify(image.toString('base64'))}),c=>c.charCodeAt(0))],name+'.jpg',{type:${JSON.stringify(mime)}})))`);
        assert.equal(await run(`document.getElementById('ach-count').textContent`),'2');
        assert.equal(await run('activeGoal.status'),'in-progress');
        assert.equal(await run(`document.querySelectorAll('.goal .prog').length`),0);
        await clickPhoto('D');await writeNote('D：喜欢这张照片的留白');
        await clickPhoto('E');await writeNote('E：另一种感受');
        await run(`document.getElementById('clear-notes').click()`);assert.equal(await run('notes.value'),'');
        await writeNote('E：另一种感受');
        await clickPhoto('D');assert.equal(await run('notes.value'),'D：喜欢这张照片的留白');
      }
      const saved=await run('goals.map(g=>({name:g.name,frames:g.frames.map(f=>({id:f.id,label:f.label,note:f.note}))}))');
      const old=saved.find(g=>g.name==='原来的收藏'),fresh=saved.find(g=>g.name==='欣赏收藏');
      assert.deepEqual(old.frames.map(f=>f.label),['B','C']);
      assert.equal(old.frames[0].note,'B 的构图感想\n第二行 💡');assert.equal(old.frames[1].note,'C 的色彩感想');
      assert.equal(fresh.frames[0].note,'D：喜欢这张照片的留白');assert.equal(fresh.frames[1].note,'E：另一种感受');
      assert.equal(new Set([...old.frames,...fresh.frames].map(f=>f.id)).size,4);
      await run(`Promise.all(Array.from(document.querySelectorAll('.ach img')).map(img=>img.decode().catch(()=>{})))`);
      assert.equal(await run(`document.querySelectorAll('.ach img').length`),2);
      assert.equal(await run(`Array.from(document.querySelectorAll('.ach img')).every(img=>img.naturalWidth>0)`),true);
      await new Promise(r=>setTimeout(r,200));
      try{fs.writeFileSync(path.join(root,'journal.png'),(await win.webContents.capturePage()).toPNG());}catch{}
      await open('two-rolls.html');assert.equal(await run('calendarStorage.ready'),true);
      assert.equal(await run(`document.getElementById('calendar-year').options.length`),16);
      if(stage==='write'){
        await run('goToMonth(2028,1,29)');assert.equal(await run('selected.day'),29);
        await run('goToMonth(2029,1)');assert.equal(await run('selected.day'),28);
        await run('goToMonth(2020,0,1)');assert.equal(await run(`document.getElementById('prev').disabled`),true);
        await run(`document.getElementById('prev').click()`);assert.equal(await run('viewYear'),2020);
        await run('goToMonth(2035,11,31)');assert.equal(await run(`document.getElementById('next').disabled`),true);
        await run(`document.getElementById('next').click()`);assert.equal(await run('viewYear'),2035);
        await upload('a');await upload('b');
        await run(`document.querySelectorAll('.fv-note button')[0].click()`);
        await input('calendar-note-input','2035 年甲的记录（修改）');await run(`document.querySelector('#calendar-note-form button[type="submit"]').click()`);
        await run(`document.getElementById('calendar-today').click()`);
        assert.equal(await run('selKey()'),await run(`new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0')+'-'+String(new Date().getDate()).padStart(2,'0')`));
        await run('goToMonth(2035,11,31)');
      }
      assert.equal(await run('selKey()'),'2035-12-31');
      assert.equal(await run(`state['2035-12-31'].a.shots[0].note`),'2035 年甲的记录（修改）');
      assert.equal(await run(`state['2035-12-31'].b.shots[0].note`),'2035 年乙的记录');
      assert.ok(await run(`state['2026-05-29'].a.shots.length>0`));
      await run(`Promise.all(Array.from(document.querySelectorAll('img')).map(img=>img.decode().catch(()=>{})))`);
      try{fs.writeFileSync(path.join(root,'calendar.png'),(await win.webContents.capturePage()).toPNG());}catch{}
      assert.deepEqual(errors,[]);
      fs.writeFileSync(report,JSON.stringify({ok:true,stage,packaged,checks:['legacy notes preserved','real new-roll dialog','collection counts without targets','same-image distinct notes','photo/roll switching','deletion and note identity','failed save retry','2035 boundary','leap dates','today navigation','two-person calendar import/edit dialog','process restart'],errors}));app.exit(0);
    }catch(e){fs.writeFileSync(report,JSON.stringify({ok:false,error:e.stack,errors}));app.exit(1);}
  });
});
app.setAppPath(base);
require(path.join(base,'main.js'));
