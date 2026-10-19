(() => {
  const modal=document.getElementById('library-settings');
  const status=document.getElementById('library-status');
  const directory=document.getElementById('library-directory');
  const migrate=document.getElementById('library-migrate');
  const reveal=document.getElementById('library-reveal');
  let busy=false;
  function refresh(){
    const info=window.libraryStorage.info();
    directory.textContent=info.directory;
    migrate.disabled=!info.available;
    reveal.disabled=!info.available;
    status.textContent=info.error||info.warning||'所有修改保存在本地，退出后仍会保留。';
    return info;
  }
  function setBusy(value){
    busy=value;
    modal.querySelectorAll('button').forEach(button=>button.disabled=value);
    if(!value) refresh();
  }
  document.getElementById('library-settings-button').addEventListener('click',()=>{
    try {refresh();}catch(error){status.textContent=error.message;}
    modal.showModal();
  });
  document.getElementById('library-close').addEventListener('click',()=>modal.close());
  modal.addEventListener('cancel',event=>{if(busy) event.preventDefault();});
  async function choose(mode){
    setBusy(true);
    status.textContent=mode==='migrate'?'请选择保存位置。复制与校验完成前，请保持程序开启。':'请选择完整的照片库文件夹。';
    try {
      const result=await window.libraryStorage.choose(mode);
      setBusy(false);
      if(!result.canceled) status.textContent=mode==='migrate'
        ? '已切换到新位置。原照片库保留在：\n'+result.previousDirectory
        : '已打开照片库。进入相册即可查看其中的照片和记录。';
    } catch(error){
      setBusy(false);
      status.textContent='未切换照片库：'+error.message;
    }
  }
  migrate.addEventListener('click',()=>choose('migrate'));
  document.getElementById('library-open').addEventListener('click',()=>choose('open'));
  reveal.addEventListener('click',async()=>{
    try {await window.libraryStorage.reveal();}catch(error){status.textContent=error.message;}
  });
  window.addEventListener('beforeunload',event=>{
    if(busy){event.preventDefault();event.returnValue='照片库正在切换，请等待完成';}
  });
  try {const info=refresh();if(!info.available||info.warning) modal.showModal();}
  catch(error){
    status.textContent='请通过 DARKROOM 桌面程序管理照片库：'+error.message;
    modal.querySelectorAll('button:not(#library-close)').forEach(button=>button.disabled=true);
  }
})();
