const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {runtimeFiles}=require('./app-files');
const {AlbumStore}=require('./album-store');
const metadataName=name=>name==='.darkroom-library.json'||/^(album|journal|wishlist|calendar|people)\.json(?:\.bak|\.corrupt-\d+)?$/.test(name);
function buildId(){
  const hash=crypto.createHash('sha256');
  for(const file of [...runtimeFiles].sort()) hash.update(file+'\0').update(fs.readFileSync(path.join(__dirname,file))).update('\0');
  return hash.digest('hex').slice(0,16);
}
// One immutable metadata snapshot per code revision, before its first write.
// Original images remain in photos/; this is not a substitute for a full off-disk backup.
function ensureUpgradeBackup(directory,revision){
  if(!/^[a-f0-9]{16}$/.test(revision)) throw new Error('升级副本编号无效');
  const parent=path.join(directory,'.upgrade-backups');
  const target=path.join(parent,revision);
  const marker=JSON.parse(fs.readFileSync(path.join(directory,'.darkroom-library.json'),'utf8'));
  if(fs.existsSync(target)){
    const manifest=JSON.parse(fs.readFileSync(path.join(target,'snapshot.json'),'utf8'));
    if(manifest.buildId!==revision||manifest.libraryId!==marker.id||!Array.isArray(manifest.files)) throw new Error('升级保护副本无效，已阻止覆盖存档');
    for(const entry of manifest.files){
      if(!metadataName(entry.name)) throw new Error('升级副本路径无效');
      const data=fs.readFileSync(path.join(target,entry.name));
      if(crypto.createHash('sha256').update(data).digest('hex')!==entry.sha256) throw new Error('升级保护副本校验失败，已阻止覆盖存档');
    }
    return target;
  }
  fs.mkdirSync(parent,{recursive:true});
  const staging=fs.mkdtempSync(path.join(parent,'.creating-'));
  const files=[];
  for(const name of fs.readdirSync(directory).filter(metadataName).sort()){
    const file=path.join(directory,name),stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink()) throw new Error('无法为存档文件创建升级副本');
    const bytes=fs.readFileSync(file);
    AlbumStore.prototype.atomicWrite.call(null,path.join(staging,name),bytes);
    files.push({name,size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  AlbumStore.prototype.atomicWrite.call(null,path.join(staging,'snapshot.json'),JSON.stringify({version:1,buildId:revision,libraryId:marker.id,createdAt:new Date().toISOString(),files},null,2));
  if(path.dirname(path.resolve(staging))!==path.resolve(parent)||path.dirname(path.resolve(target))!==path.resolve(parent)) throw new Error('升级副本目标路径无效');
  fs.renameSync(staging,target);
  return target;
}
module.exports={buildId,ensureUpgradeBackup,metadataName};
