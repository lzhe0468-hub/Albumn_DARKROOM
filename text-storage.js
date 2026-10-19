// Shared save feedback. Failed edits stay in the page so the user can retry/copy them.
class TextPageStorage {
  constructor(section, status) {
    this.section=section;
    this.ready=false;
    this.failed=false;
    this.status=status || document.createElement('span');
    if(!status){
      this.status.style.cssText='font-size:11px;color:var(--kodak,#e6a92b);letter-spacing:.05em';
      (document.querySelector('.meter') || document.querySelector('.chrome') || document.body).appendChild(this.status);
    }
    this.status.setAttribute('role','status');
    this.status.setAttribute('aria-live','polite');
  }
  load(){
    try {
      if(!window.textStorage) throw new Error('请使用 DARKROOM 桌面程序打开');
      const result=window.textStorage.load(this.section);
      this.ready=true;
      this.status.textContent='已保存';
      if(result.warning) alert(result.warning);
      return result.data;
    } catch(error){
      this.status.textContent='读取失败 · 编辑已停用';
      alert('无法读取文字存档：'+error.message+'。为保护旧内容，编辑已停用。');
      document.querySelectorAll('textarea,input,button,[contenteditable]').forEach(el=>{
        if(el.matches('[contenteditable]')) el.contentEditable='false';
        else el.disabled=true;
      });
      document.addEventListener('click',e=>{
        if(!e.target.closest('a')){e.preventDefault();e.stopImmediatePropagation();}
      },true);
      for(const type of ['beforeinput','input','change','drop']) document.addEventListener(type,e=>{e.preventDefault();e.stopImmediatePropagation();},true);
      return null;
    }
  }
  save(data,manual=false){
    if(!this.ready) return null;
    try {
      this.status.textContent='正在保存…';
      const saved=window.textStorage.save(this.section,data);
      const mergePhotos=(target,source)=>{
        if(!target || !source || typeof target!=='object' || typeof source!=='object') return;
        if(source.photoFile){target.photoFile=source.photoFile;target.src=source.src;}
        for(const key of Object.keys(source)) mergePhotos(target[key],source[key]);
      };
      mergePhotos(data,saved);
      this.failed=false;
      this.status.textContent='已保存 · '+new Date().toLocaleTimeString('zh-CN',{hour12:false});
      return saved;
    } catch(error){
      this.failed=true;
      this.status.textContent='保存失败 · 请重试，勿关闭页面';
      if(manual) alert('保存失败：'+error.message+'。输入内容仍保留在页面，请重试或复制备份。');
      return null;
    }
  }
}
window.TextPageStorage=TextPageStorage;
