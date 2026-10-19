const {app}=require('electron');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=require('./runtime-root.cjs')('.text-runtime');fs.mkdirSync(root,{recursive:true});
app.setPath('userData',root);
const stage=process.argv.find(v=>v==='write'||v==='read');
const packaged=process.argv.includes('--packaged-test');
const base=packaged?path.join(__dirname,'..','dist','win-unpacked','resources','app.asar'):path.join(__dirname,'..');
const {DocumentStore}=require(path.join(base,'document-store.js'));
const originalWrite=DocumentStore.prototype.write;
let failWrites=false;
DocumentStore.prototype.write=function(data){if(failWrites) throw new Error('模拟磁盘写入失败');return originalWrite.call(this,data)};
const errors=[];
const expected='今天的灵感\n第二行：保留中文、空行和表情 🌧️\n\n末尾空格  ';
const report=path.join(root,(packaged?'packaged-':'')+stage+'.json');
setTimeout(()=>{fs.writeFileSync(report,JSON.stringify({ok:false,error:'timeout',errors}));app.exit(1)},45000);
app.on('browser-window-created',(_e,win)=>{
  win.hide();win.webContents.setBackgroundThrottling(false);
  win.webContents.on('console-message',(_e,level,message)=>{if(level>=3) errors.push(message)});
  win.webContents.once('did-finish-load',async()=>{
    const run=async code=>{try{return await win.webContents.executeJavaScript(code)}catch(error){error.message+="\nExecuted: "+code;throw error}};
    const open=async page=>{
      await win.loadFile(path.join(base,page));
      await run('window.alert=m=>{window.lastAlert=m};window.confirm=()=>true;void 0');
    };
    const input=async(id,value)=>run(`document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(value)};document.getElementById(${JSON.stringify(id)}).dispatchEvent(new Event('input',{bubbles:true}));void 0`);
    try {
      await open('journal.html');
      assert.equal(await run('journalStorage.ready'),true);
      assert.equal(await run(`getComputedStyle(document.getElementById('btn-done-notes')).display!=='none'`),true);
      if(stage==='write'){
        await run(`goals=goals.filter(g=>g.name!=='文字保存测试任务');activeGoal=goals[0];if(!activeGoal.frames.length)activeGoal.frames.push({id:crypto.randomUUID(),label:'文字测试照片',src:null,note:''});activeGoal.selectedFrameId=activeGoal.frames[0].id;persistJournal();renderGoals();renderDetail();`);
        await run(`document.getElementById('btn-edit-notes').click()`);
        await input('notes',expected);
        await run(`document.getElementById('btn-done-notes').click()`);
        assert.match(await run(`document.getElementById('notes-save-status').textContent`),/已保存/);
        await input('notes','');
        await open('journal.html');assert.equal(await run(`document.getElementById('notes').value`),'');
        await run(`document.getElementById('btn-edit-notes').click()`);
        failWrites=true;
        await input('notes','失败时保留的输入');
        assert.equal(await run(`document.getElementById('notes').value`),'失败时保留的输入');
        assert.match(await run(`document.getElementById('notes-save-status').textContent`),/保存失败/);
        await run(`document.getElementById('btn-done-notes').click()`);
        assert.match(await run('window.lastAlert'),/模拟磁盘写入失败/);
        failWrites=false;
        await input('notes',expected);
        await run(`document.getElementById('btn-done-notes').click();activeGoal=goals[0];renderDetail();document.getElementById('btn-edit-desc').click()`);
        await input('d-desc-edit','');
        await open('journal.html');assert.equal(await run('goals[0].desc'),'');
        await run(`activeGoal=goals[0];renderDetail();document.getElementById('btn-edit-desc').click()`);
        await input('d-desc-edit','第一项拍摄构想\n自动保存');
        await run(`document.querySelectorAll('.goal')[1].click();document.getElementById('btn-edit-desc').click()`);
        await input('d-desc-edit','第二项构想');
        await run(`document.getElementById('new-goal').click();document.getElementById('new-goal-name').value='文字保存测试任务';document.querySelector('#new-goal-form button[type="submit"]').click()`);
        await run(`document.getElementById('btn-edit-desc').click()`);
        await input('d-desc-edit','新任务也能保存构想');
        await run(`activeGoal=goals.find(g=>g.id===1);persistJournal();renderGoals();renderDetail();`);
      }
      assert.equal(await run(`document.getElementById('notes').value`),expected);
      assert.equal(await run(`goals.find(g=>g.id===1).desc`),'第一项拍摄构想\n自动保存');
      assert.equal(await run(`goals.find(g=>g.id===2).desc`),'第二项构想');
      assert.ok(await run(`goals.some(g=>g.name==='文字保存测试任务'&&g.desc==='新任务也能保存构想')`));
      try{fs.writeFileSync(path.join(root,'journal.png'),(await win.webContents.capturePage()).toPNG())}catch{}
      await open('couple.html');
      if(stage==='write'){
        await run(`document.getElementById('nick-a').textContent='保存甲';document.getElementById('nick-a').dispatchEvent(new Event('input'));document.getElementById('nick-b').textContent='保存乙';document.getElementById('nick-b').dispatchEvent(new Event('input'));document.getElementById('save-nicknames').click()`);
      }
      assert.equal(await run(`document.getElementById('nick-a').textContent`),'保存甲');
      assert.equal(await run(`document.getElementById('nick-b').textContent`),'保存乙');
      await open('wishlist.html');
      assert.equal(await run('wishlistStorage.ready'),true);
      assert.equal(await run('PEOPLE.a.name'),'保存甲');
      await run(`document.querySelector('.roll-card').click();document.querySelector('.strip-cell.filled').click();document.getElementById('sealed').click()`);
      await new Promise(r=>setTimeout(r,750));
      if(stage==='write'){
        await input('letter-text','');
        await run(`document.getElementById('save-letter').click()`);
        assert.equal(await run('curRoll.frames[selFrame].letters.a'),'');
        await input('letter-text','写给甲的信\n重启仍在 💌');
        await run(`document.getElementById('save-letter').click();document.querySelector('[data-who="b"]').click()`);
        // New author's sealed letter is opened with the existing animation.
        await run(`document.getElementById('sealed').click()`);
        await new Promise(r=>setTimeout(r,750));
        await input('letter-text','乙的另一封信');
      }
      assert.equal(await run('curRoll.frames[0].letters.a'),'写给甲的信\n重启仍在 💌');
      assert.equal(await run('curRoll.frames[0].letters.b'),'乙的另一封信');
      await open('two-rolls.html');
      assert.equal(await run('calendarStorage.ready'),true);
      if(stage==='write'){
        await run(`goToMonth(2026,4,29);document.querySelector('.fv-note button').click();document.getElementById('calendar-note-input').value='日历里的文字记事';document.querySelector('#calendar-note-form button[type="submit"]').click()`);
      }
      assert.equal(await run(`state['2026-05-29'].a.shots[0].note`),'日历里的文字记事');
      assert.equal(await run('PEOPLE.b.name'),'保存乙');
      assert.deepEqual(errors,[]);
      fs.writeFileSync(report,JSON.stringify({ok:true,stage,packaged,checks:['Chinese and multiline text','empty text','automatic and explicit save','save failure and retry','task switch and new task','nicknames across pages','two authors letters','calendar notes','process restart'],errors}));
      app.exit(0);
    }catch(error){fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack,errors}));app.exit(1)}
  });
});
app.setAppPath(base);
require(path.join(base,'main.js'));
