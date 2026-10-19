const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {AlbumStore}=require('../album-store');
const {DocumentStore}=require('../document-store');
const {LibraryManager}=require('../library-manager');
const root=fs.mkdtempSync(path.join(__dirname,'.store-safety-'));
const data={version:1,nextId:2,selectedIdx:0,rolls:[{id:1,name:'重要相册',active:true,shots:[{src:'data:image/png;base64,aGVsbG8=',title:'原图',rating:4.5}]}]};
async function main(){
  const store=new AlbumStore(path.join(root,'version-test'));const saved=store.write(data);store.write(saved);
  const future=JSON.stringify({version:2,rolls:[{name:'新版本数据'}]});fs.writeFileSync(store.file,future);
  const backup=fs.readFileSync(store.backup);
  assert.throws(()=>store.read(),e=>e.code==='UNSUPPORTED_STORAGE_VERSION');
  assert.throws(()=>store.write(saved),e=>e.code==='UNSUPPORTED_STORAGE_VERSION');
  assert.equal(fs.readFileSync(store.file,'utf8'),future);assert.deepEqual(fs.readFileSync(store.backup),backup);
  const journal=new DocumentStore(path.join(root,'document-version'),'journal');
  const note={version:1,notes:'旧随笔',nextGoalId:2,goals:[{id:1,name:'作品',desc:'构想',cur:0,frames:[]}]};
  journal.write(note);journal.write(note);
  const newer=JSON.stringify({...note,photoNotesVersion:2,newNotes:{unreadableToOldApp:'必须保留'}});fs.writeFileSync(journal.file,newer);
  assert.throws(()=>journal.read(),e=>e.code==='UNSUPPORTED_STORAGE_VERSION');
  assert.throws(()=>journal.write(note),e=>e.code==='UNSUPPORTED_STORAGE_VERSION');
  assert.equal(fs.readFileSync(journal.file,'utf8'),newer);

  const settings=path.join(root,'settings'),revisionA='aaaaaaaaaaaaaaaa',revisionB='bbbbbbbbbbbbbbbb';
  const manager=new LibraryManager(settings,{buildId:revisionA});
  assert.ok(fs.existsSync(manager.config));
  manager.albumStore().write(data);manager.documentStore('journal').write(note);
  const before=fs.readFileSync(path.join(manager.directory,'album.json'));
  manager.prepareWrite();
  const snapshot=path.join(manager.directory,'.upgrade-backups',revisionA);
  assert.deepEqual(fs.readFileSync(path.join(snapshot,'album.json')),before);
  const changed=manager.albumStore().read().data;changed.rolls[0].name='后来修改的相册';manager.albumStore().write(changed);manager.prepareWrite();
  assert.deepEqual(fs.readFileSync(path.join(snapshot,'album.json')),before);
  const upgraded=new LibraryManager(settings,{buildId:revisionB});upgraded.prepareWrite();
  assert.equal(JSON.parse(fs.readFileSync(path.join(upgraded.directory,'.upgrade-backups',revisionB,'album.json'))).rolls[0].name,'后来修改的相册');
  assert.deepEqual(fs.readFileSync(path.join(snapshot,'album.json')),before);
  const metadata=JSON.parse(fs.readFileSync(path.join(snapshot,'snapshot.json')));
  for(const entry of metadata.files) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(snapshot,entry.name))).digest('hex'),entry.sha256);
  fs.writeFileSync(path.join(snapshot,'album.json'),'corrupt snapshot');
  const verifySnapshot=new LibraryManager(settings,{buildId:revisionA});
  assert.throws(()=>verifySnapshot.prepareWrite(),/校验失败/);
  fs.writeFileSync(path.join(snapshot,'album.json'),before);

  const failing=new LibraryManager(settings,{buildId:'cccccccccccccccc'});
  const current=fs.readFileSync(path.join(failing.directory,'album.json'));
  const originalAtomic=AlbumStore.prototype.atomicWrite;
  AlbumStore.prototype.atomicWrite=()=>{throw Object.assign(new Error('disk full'),{code:'ENOSPC'});};
  try{assert.throws(()=>failing.prepareWrite(),/disk full/);}finally{AlbumStore.prototype.atomicWrite=originalAtomic;}
  assert.deepEqual(fs.readFileSync(path.join(failing.directory,'album.json')),current);
  const parent=path.join(root,'新位置');fs.mkdirSync(parent);
  await upgraded.migrate(parent);
  assert.deepEqual(fs.readFileSync(path.join(upgraded.directory,'.upgrade-backups',revisionA,'album.json')),before);
  const install=path.join(root,'program');fs.mkdirSync(install);
  const protectedManager=new LibraryManager(settings,{buildId:revisionB,protectedDirectories:[install]});
  await assert.rejects(()=>protectedManager.migrate(install),/安装目录/);

  const offlineSettings=path.join(root,'offline-settings'),offline=new LibraryManager(offlineSettings,{buildId:revisionA});
  const moved=offline.directory+'.offline';
  for(const candidate of [offline.directory,moved]){const relative=path.relative(root,path.resolve(candidate));assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));}
  fs.renameSync(offline.directory,moved);
  const restart=new LibraryManager(offlineSettings,{buildId:revisionA});assert.equal(restart.info().available,false);
  assert.equal(fs.existsSync(offline.directory),false);assert.throws(()=>restart.albumStore(),/不可用/);
  console.log('PASS: newer schemas refused without fallback/overwrite, default library identity, immutable upgrade snapshots, snapshot checksums, disk-full failure, migration retains snapshots, install-directory rejection and missing default library protection');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
