const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.join(__dirname,'..');
for(const name of ['album-store','document-store','library-manager','photo-metadata','storage-safety']) {
  const result=spawnSync(process.execPath,[path.join(root,'tests',name+'.cjs')],{cwd:root,stdio:'inherit',windowsHide:true});
  if(result.error) throw result.error;
  if(result.status!==0) process.exit(result.status||1);
}
