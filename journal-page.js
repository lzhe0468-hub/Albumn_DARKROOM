let nextGoalId=6;
let activeGoal=goals[0];
let activeFilter='all';
let legacyNotes='';
let journalImporting=false;
const goalsEl=document.getElementById('goals');
const goalCountEl=document.getElementById('goal-count');
const drop=document.getElementById('drop');
const dropFile=document.getElementById('drop-file');
const achGrid=document.getElementById('ach-grid');
const descP=document.getElementById('d-desc');
const descEdit=document.getElementById('d-desc-edit');
const btnEditDesc=document.getElementById('btn-edit-desc');
const notes=document.getElementById('notes');
const wc=document.getElementById('word-count');
const btnEditNotes=document.getElementById('btn-edit-notes');
const btnDoneNotes=document.getElementById('btn-done-notes');
const journalStorage=new TextPageStorage('journal',document.getElementById('notes-save-status'));
const STATUS_LABEL={'in-progress':'IN PROGRESS',done:'DONE',archived:'ARCHIVED'};
const STATUS_ZH={'in-progress':'进行中',done:'已完成',archived:'已归档'};
const newGoalDialog=document.getElementById('new-goal-dialog');

function escapeHtml(s){return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function currentFrame(){return activeGoal?.frames.find(f=>f.id===activeGoal.selectedFrameId)||null;}
function updateWc(){wc.textContent=notes.value.replace(/\s/g,'').length;}
function showToast(message){
  if(journalStorage.failed) message='保存失败 · 输入仍在页面，请点击保存重试';
  const toast=document.getElementById('toast');
  document.getElementById('toast-msg').textContent=message;toast.hidden=false;
  clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.hidden=true,2000);
}
function persistJournal(manual=false){
  goals.forEach(g=>g.cur=g.frames.length);
  return !!journalStorage.save({version:1,photoNotesVersion:1,goals,nextGoalId,activeGoalId:activeGoal?.id??null,notes:legacyNotes},manual);
}
function renderNotebook(){
  const frame=currentFrame();
  const enabled=!!frame&&journalStorage.ready;
  notes.value=frame?.note||'';notes.readOnly=true;notes.disabled=!enabled;
  notes.placeholder=frame?'写下观看这张照片的感想、喜欢的细节……':'先在左侧收录或选择一张照片';
  document.getElementById('note-photo-label').textContent=frame?'— '+(frame.label||'未命名照片')+' —':'— 选择一张照片 —';
  btnEditNotes.style.display='';btnEditNotes.disabled=!enabled;btnDoneNotes.disabled=!enabled;
  document.getElementById('clear-notes').disabled=!enabled;
  document.getElementById('legacy-notes').disabled=!legacyNotes||!journalStorage.ready;
  updateWc();
}
function renderGoals(){
  goalsEl.innerHTML='';
  const visible=goals.filter(g=>activeFilter==='all'||g.status===activeFilter);
  goalCountEl.textContent=visible.length+' 卷';
  visible.forEach(g=>{
    const el=document.createElement('div');el.className='goal'+(g===activeGoal?' active':'');
    el.dataset.status=g.status;el.dataset.id=g.id;
    el.innerHTML=`<div class="row1"><span class="badge">${STATUS_LABEL[g.status]||'COLLECTION'}</span><button class="del" title="删除">×</button></div>
      <h4>${escapeHtml(g.name)}</h4><div class="sub">${escapeHtml(g.en||'')}</div><div class="pr-row"><span>已收录 <b>${g.frames.length}</b> 张</span></div>`;
    el.addEventListener('click',e=>{
      if(e.target.closest('.del')) return;
      activeGoal=g;persistJournal();renderGoals();renderDetail();
    });
    el.querySelector('.del').addEventListener('click',e=>{
      e.stopPropagation();
      if(!confirm(`删除胶卷「${g.name}」和其中的感想？`)) return;
      goals=goals.filter(item=>item!==g);
      if(activeGoal===g) activeGoal=goals[0]||null;
      if(persistJournal(true)) showToast('✓ 已删除胶卷');
      renderGoals();renderDetail();
    });
    goalsEl.appendChild(el);
  });
}
function renderDetail(){
  const main=document.getElementById('main');
  descEdit.style.display='none';descP.style.display='';btnEditDesc.textContent='✎ 编辑构想';
  achGrid.querySelectorAll('.ach').forEach(el=>el.remove());
  main.inert=!activeGoal;main.style.opacity=activeGoal?1:.35;
  if(!activeGoal){renderNotebook();return;}
  if(!currentFrame()) activeGoal.selectedFrameId=activeGoal.frames[0]?.id||null;
  activeGoal.frames.forEach(addAchFrame);
  document.getElementById('d-title').firstChild.nodeValue=activeGoal.name+' ';
  document.getElementById('d-en').textContent=activeGoal.en||'';
  document.getElementById('d-meta').textContent=`N° ${String(activeGoal.id).padStart(2,'0')} · ${STATUS_ZH[activeGoal.status]||'收藏'} · ${activeGoal.meta}`;
  document.getElementById('d-cur').textContent=activeGoal.frames.length;
  document.getElementById('ach-count').textContent=activeGoal.frames.length;
  descP.textContent=activeGoal.desc;
  document.getElementById('d-due').textContent=activeGoal.due||'未定';
  document.getElementById('d-window').textContent=activeGoal.window||'—';
  document.getElementById('d-roll').textContent=activeGoal.roll||'—';
  document.getElementById('d-stat').textContent=STATUS_LABEL[activeGoal.status]||'COLLECTION';
  renderNotebook();
}
function selectJournalFrame(id){
  if(!activeGoal?.frames.some(f=>f.id===id)) return;
  activeGoal.selectedFrameId=id;
  persistJournal();
  achGrid.querySelectorAll('.ach').forEach(el=>{
    const selected=el.dataset.id===id;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));
    el.querySelector('.check').textContent=selected?'查看中':'已收录';
  });
  renderNotebook();
}
function addAchFrame(frame,index){
  const div=document.createElement('div');
  const selected=frame.id===activeGoal.selectedFrameId;
  div.className='ach '+(['','b','g','r'][index%4])+(selected?' selected':'');
  div.dataset.id=frame.id;div.setAttribute('role','button');div.tabIndex=0;div.setAttribute('aria-pressed',String(selected));
  div.setAttribute('aria-label',frame.label||'未命名照片');
  if(frame.src){
    const img=document.createElement('img');img.src=frame.src;img.alt=frame.label||'';
    img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover';div.appendChild(img);
  } else {const ph=document.createElement('div');ph.className='ph';div.appendChild(ph);}
  const del=document.createElement('button');del.className='ach-del';del.textContent='✕';del.title='删除照片与感想';
  const check=document.createElement('span');check.className='check';check.textContent=selected?'查看中':'已收录';
  const label=document.createElement('div');label.className='lbl';label.textContent=frame.label||'未命名照片';
  div.append(del,check,label);
  div.addEventListener('click',e=>{if(!e.target.closest('.ach-del')) selectJournalFrame(frame.id);});
  div.addEventListener('keydown',e=>{if(e.target===div&&['Enter',' '].includes(e.key)){e.preventDefault();selectJournalFrame(frame.id);}});
  del.addEventListener('click',e=>{
    e.stopPropagation();
    if(!confirm('删除这张照片和它的感想？')) return;
    const goal=activeGoal;goal.frames=goal.frames.filter(f=>f.id!==frame.id);
    if(goal.selectedFrameId===frame.id) goal.selectedFrameId=goal.frames[Math.min(index,goal.frames.length-1)]?.id||null;
    if(persistJournal(true)) showToast('✓ 已删除');renderGoals();renderDetail();
  });
  achGrid.insertBefore(div,drop);
}

document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('on',b===button));activeFilter=button.dataset.f;renderGoals();
}));
document.getElementById('new-goal').addEventListener('click',()=>{
  if(!journalStorage.ready) return;
  document.getElementById('new-goal-form').reset();document.getElementById('new-goal-error').textContent='';
  document.getElementById('new-goal-name').setCustomValidity('');newGoalDialog.showModal();
});
document.getElementById('cancel-new-goal').addEventListener('click',()=>newGoalDialog.close());
document.getElementById('new-goal-name').addEventListener('input',e=>e.target.setCustomValidity(''));
document.getElementById('new-goal-form').addEventListener('submit',e=>{
  e.preventDefault();
  const input=document.getElementById('new-goal-name'),name=input.value.trim();
  if(!name){input.setCustomValidity('请填写胶卷名称');input.reportValidity();return;}
  const previous=activeGoal;
  const date=new Date(),stamp=`${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
  const goal={id:nextGoalId++,name,en:'',meta:'始于 '+stamp,due:'未定',cur:0,status:'in-progress',
    desc:document.getElementById('new-goal-desc').value,window:'—',roll:'—',frames:[],selectedFrameId:null};
  goals.unshift(goal);activeGoal=goal;
  if(!persistJournal(true)){
    goals=goals.filter(g=>g!==goal);activeGoal=previous;nextGoalId--;
    document.getElementById('new-goal-error').textContent='未能保存，请重试；输入仍保留在这里。';return;
  }
  activeFilter='all';document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('on',b.dataset.f==='all'));
  newGoalDialog.close();renderGoals();renderDetail();showToast('✓ 胶卷已创建，可以开始收录照片');
});

async function handleDropFiles(files){
  if(!activeGoal||!journalStorage.ready||journalImporting) return;
  const target=activeGoal,arr=Array.from(files).filter(f=>f.type.startsWith('image/'));
  if(!arr.length){showToast('请上传图片文件');return;}
  journalImporting=true;
  try {
    const frames=await Promise.all(arr.map(file=>new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onerror=()=>reject(new Error('无法读取 '+file.name));
      reader.onabort=()=>reject(new Error('读取已取消'));
      reader.onload=e=>resolve({id:crypto.randomUUID(),src:e.target.result,label:file.name.replace(/\.[^.]+$/,''),note:''});
      reader.readAsDataURL(file);
    })));
    if(!goals.includes(target)) throw new Error('目标胶卷已删除');
    target.frames.push(...frames);target.selectedFrameId=frames[0].id;
    if(persistJournal(true)) showToast(`✓ 已收录 ${frames.length} 张照片`);
    renderGoals();renderDetail();
  }catch(error){alert('收录失败：'+error.message);}
  finally {journalImporting=false;}
}
['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('over');}));
['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('over');}));
drop.addEventListener('drop',e=>handleDropFiles(e.dataTransfer.files));
dropFile.addEventListener('change',e=>{handleDropFiles(e.target.files);e.target.value='';});
btnEditDesc.addEventListener('click',()=>{
  if(!activeGoal) return;
  if(descEdit.style.display==='none'){
    descEdit.value=activeGoal.desc;descEdit.style.display='block';descP.style.display='none';btnEditDesc.textContent='✓ 保存构想';descEdit.focus();
  }else if(persistJournal(true)){descP.textContent=activeGoal.desc;descEdit.style.display='none';descP.style.display='';btnEditDesc.textContent='✎ 编辑构想';}
});
descEdit.addEventListener('input',()=>{if(activeGoal){activeGoal.desc=descEdit.value;persistJournal();}});
btnEditNotes.addEventListener('click',()=>{if(currentFrame()){notes.readOnly=false;notes.focus();btnEditNotes.style.display='none';}});
function saveCurrentNote(manual=false){
  const frame=currentFrame();if(!frame) return false;
  frame.note=notes.value;frame.noteUpdatedAt=new Date().toISOString();updateWc();return persistJournal(manual);
}
notes.addEventListener('input',()=>saveCurrentNote());
btnDoneNotes.addEventListener('click',()=>{if(saveCurrentNote(true)) showToast('✓ 这张照片的感想已保存');});
document.getElementById('clear-notes').addEventListener('click',()=>{
  if(!currentFrame()||!confirm('清空这张照片的感想？其他照片不会改变。')) return;
  notes.value='';notes.readOnly=false;saveCurrentNote(true);notes.focus();
});
document.getElementById('legacy-notes').addEventListener('click',()=>{
  document.getElementById('legacy-notes-text').value=legacyNotes;document.getElementById('legacy-notes-dialog').showModal();
});
document.getElementById('close-legacy-notes').addEventListener('click',()=>document.getElementById('legacy-notes-dialog').close());
window.addEventListener('beforeunload',e=>{
  if(journalImporting||journalStorage.failed){e.preventDefault();e.returnValue='照片导入或文字保存尚未完成';}
});

const demoNote=notes.value;
const savedJournal=journalStorage.load();
if(journalStorage.ready){
  if(savedJournal){
    goals=savedJournal.goals;nextGoalId=savedJournal.nextGoalId;legacyNotes=savedJournal.notes;
    activeGoal=goals.find(g=>g.id===savedJournal.activeGoalId)||goals[0]||null;
  }else{
    goals.forEach(g=>g.frames=[]);
    goals[0].frames=Array.from(achGrid.querySelectorAll('.ach')).map((el,index)=>({src:null,label:el.querySelector('.lbl span')?.textContent||'',note:index===0?demoNote:''}));
    try{legacyNotes=localStorage.getItem('darkroom_notes')||'';}catch{}
  }
  let migrated=!savedJournal||savedJournal.photoNotesVersion!==1;
  goals.forEach(g=>{
    g.frames.forEach(f=>{
      if(!f.id){f.id=crypto.randomUUID();migrated=true;}
      if(typeof f.note!=='string'){f.note='';migrated=true;}
    });
    if(!g.frames.some(f=>f.id===g.selectedFrameId)) g.selectedFrameId=g.frames[0]?.id||null;
  });
  if(migrated) persistJournal(true);
}
goals.forEach(g=>{if(!Array.isArray(g.frames)) g.frames=[];});
renderGoals();renderDetail();
