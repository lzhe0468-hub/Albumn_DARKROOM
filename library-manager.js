const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { AlbumStore } = require('./album-store');
const { DocumentStore } = require('./document-store');
const {buildId,ensureUpgradeBackup,metadataName}=require('./upgrade-backup');
const {assertStorageVersion}=require('./storage-safety');

const MARKER = '.darkroom-library.json';
const DOCUMENTS = ['journal','wishlist','calendar','people'];
const METADATA = /^(album|journal|wishlist|calendar|people)\.json(?:\.bak|\.corrupt-\d+)?$/;
const PHOTO = /^[a-f0-9]{64}\.(png|jpg|gif|webp|bmp|avif|tif|ico)$/;

class LibraryManager {
  constructor(userData,options={}) {
    this.userData = path.resolve(userData);
    fs.mkdirSync(this.userData,{recursive:true});
    this.config = path.join(this.userData,'library-location.json');
    this.busy = false;
    this.warning = '';
    this.locationError = '';
    this.directory = path.join(this.userData,'album-library');
    this.revision=options.buildId||buildId();
    this.protectedDirectories=(options.protectedDirectories||[]).map(p=>path.resolve(p));
    this.prepared=new Set();
    this.expectedLibraryId=null;
    if (fs.existsSync(this.config) || fs.existsSync(this.config+'.bak')) {
      let settings;
      try {settings=this.readConfig(this.config);}
      catch(error) {
        if(error.code==='UNSUPPORTED_STORAGE_VERSION'){this.locationError=error.message;return;}
        try {
          settings=this.readConfig(this.config+'.bak');
          this.warning='照片库位置设置读取失败，已使用上一次的位置，请核对。';
        } catch {
          this.locationError='照片库位置设置损坏，请使用“打开已有照片库”重新定位；没有创建或覆盖相册。';
          return;
        }
      }
      this.directory=settings.directory;
      this.expectedLibraryId=settings.libraryId||null;
    } else {
      // First upgrade: adopt the existing default library, including all prior saves.
      fs.mkdirSync(path.join(this.directory,'photos'),{recursive:true});
      this.ensureMarker(this.directory);
      this.setLocation(this.directory);
    }
  }

  readConfig(file) {
    const settings=JSON.parse(fs.readFileSync(file,'utf8'));
    assertStorageVersion(settings);
    if(settings.version!==1 || typeof settings.directory!=='string' || !path.isAbsolute(settings.directory)) throw new Error('照片库位置无效');
    return settings;
  }

  ensureMarker(directory) {
    const file=path.join(directory,MARKER);
    if(!fs.existsSync(file)) this.atomicWrite(file,JSON.stringify({format:'darkroom-library',version:1,id:crypto.randomUUID()},null,2));
    const marker=JSON.parse(fs.readFileSync(file,'utf8'));
    if(marker.format!=='darkroom-library' || marker.version!==1 || typeof marker.id!=='string') throw new Error('无法识别照片库');
    return marker;
  }

  atomicWrite(file,content) {AlbumStore.prototype.atomicWrite.call(this,file,content);}

  info() {
    let available=false;
    let error=this.locationError;
    if(!error) {
      try {
        if(!fs.statSync(this.directory).isDirectory() || !fs.existsSync(path.join(this.directory,MARKER))) throw new Error('照片库文件夹不可用，请连接原磁盘或打开已有照片库。');
        const marker=JSON.parse(fs.readFileSync(path.join(this.directory,MARKER),'utf8'));
        if(marker.format!=='darkroom-library' || marker.version!==1) throw new Error('照片库标记无效，请重新打开已有照片库。');
        if(this.expectedLibraryId&&marker.id!==this.expectedLibraryId) throw new Error('该位置的照片库已被替换，请使用“打开已有照片库”核对后重新定位');
        available=true;
      } catch(e) {error=e.code==='ENOENT'?'照片库文件夹不可用，请连接原磁盘或打开已有照片库。':e.message;}
    }
    return {directory:this.directory,available,busy:this.busy,error,warning:this.warning};
  }

  assertReady() {
    if(this.busy) throw new Error('照片库正在切换，请稍候');
    const info=this.info();
    if(!info.available) throw new Error(info.error);
  }

  albumStore() {this.assertReady();return new AlbumStore(this.directory);}
  documentStore(section) {this.assertReady();return new DocumentStore(this.directory,section);}
  prepareWrite(){
    this.assertReady();
    if(!this.expectedLibraryId) this.setLocation(this.directory);
    if(!this.prepared.has(this.directory)){
      ensureUpgradeBackup(this.directory,this.revision);
      this.prepared.add(this.directory);
    }
  }

  // Enumerate only managed files; reject symbolic links so copying cannot escape the library.
  files(directory) {
    const files=[];
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})) {
      const full=path.join(directory,entry.name);
      const stat=fs.lstatSync(full);
      if(entry.name===MARKER || METADATA.test(entry.name)) {
        if(!stat.isFile() || stat.isSymbolicLink()) throw new Error('照片库包含不安全的文件链接');
        files.push(entry.name);
      } else if(entry.name==='.upgrade-backups') {
        if(!stat.isDirectory()||stat.isSymbolicLink()) throw new Error('升级副本目录无效');
        for(const revision of fs.readdirSync(full)){
          const folder=path.join(full,revision),folderStat=fs.lstatSync(folder);
          if(revision.startsWith('.creating-')&&folderStat.isDirectory()&&!folderStat.isSymbolicLink()) continue;
          if(!/^[a-f0-9]{16}$/.test(revision)||!folderStat.isDirectory()||folderStat.isSymbolicLink()) throw new Error('升级副本目录无效');
          for(const name of fs.readdirSync(folder)){
            const record=fs.lstatSync(path.join(folder,name));
            if((name!=='snapshot.json'&&!metadataName(name))||!record.isFile()||record.isSymbolicLink()) throw new Error('升级副本文件无效');
            files.push(path.join('.upgrade-backups',revision,name));
          }
        }
      } else if(entry.name==='photos') {
        if(!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('照片目录不能是文件链接');
        for(const name of fs.readdirSync(full)) {
          const photoStat=fs.lstatSync(path.join(full,name));
          if(!PHOTO.test(name)) {
            if(name.endsWith('.tmp') && photoStat.isFile()) continue;
            throw new Error('照片库中存在无法识别的照片文件：'+name);
          }
          if(!photoStat.isFile() || photoStat.isSymbolicLink()) throw new Error('照片不能是文件链接');
          files.push(path.join('photos',name));
        }
      }
    }
    return files;
  }

  validate(directory) {
    if(!fs.existsSync(path.join(directory,MARKER))) throw new Error('请选择完整的 DARKROOM 照片库文件夹');
    const marker=JSON.parse(fs.readFileSync(path.join(directory,MARKER),'utf8'));
    if(marker.format!=='darkroom-library'||marker.version!==1) throw new Error('照片库格式无效');
    this.files(directory);
    const stores=[new AlbumStore(directory),...DOCUMENTS.map(section=>new DocumentStore(directory,section))];
    for(const store of stores) {
      const result=store.read();
      const visit=value=>{
        if(!value || typeof value!=='object') return;
        if(value.photoFile && !fs.existsSync(path.join(directory,'photos',value.photoFile))) throw new Error('照片库不完整，缺少照片：'+value.photoFile);
        for(const child of Object.values(value)) visit(child);
      };
      visit(result.data);
    }
  }

  async digest(file) {
    const hash=crypto.createHash('sha256');
    for await(const chunk of fs.createReadStream(file)) hash.update(chunk);
    return hash.digest('hex');
  }

  setLocation(directory) {
    if(fs.existsSync(this.config)) {
      try {
        this.readConfig(this.config);
      } catch {
        fs.copyFileSync(this.config,this.config+'.corrupt-'+Date.now());
      }
      // Only retain a validated config as the recovery copy.
      try {this.readConfig(this.config);this.atomicWrite(this.config+'.bak',fs.readFileSync(this.config));}
      catch(error) {if(error.code) throw error;}
    }
    const marker=JSON.parse(fs.readFileSync(path.join(directory,MARKER),'utf8'));
    this.atomicWrite(this.config,JSON.stringify({version:1,directory,libraryId:marker.id},null,2));
    this.directory=directory;this.locationError='';this.warning='';
    this.expectedLibraryId=marker.id;
  }

  async migrate(parentDirectory) {
    this.assertReady();
    const source=fs.realpathSync(this.directory);
    const parent=fs.realpathSync(parentDirectory);
    const target=path.resolve(parent,'DARKROOM照片库');
    const inside=(a,b)=>{const relative=path.relative(a,b);return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));};
    if(this.protectedDirectories.some(folder=>inside(folder,target))) throw new Error('照片库不能放在程序安装目录内，请选择独立的照片文件夹');
    if(inside(source,target)||inside(target,source)) throw new Error('新位置不能位于当前照片库内部，也不能包含当前照片库');
    if(fs.existsSync(target)) throw new Error('目标下已有“DARKROOM照片库”，不会覆盖。若要使用它，请选择“打开已有照片库”。');
    this.validate(source);
    const files=this.files(source);
    const staging=path.resolve(parent,'.DARKROOM-importing-'+crypto.randomUUID());
    // Both rename endpoints must stay immediately inside the explicitly selected directory.
    if(path.dirname(target)!==parent || path.dirname(staging)!==parent) throw new Error('目标路径无效');
    this.busy=true;
    try {
      await fs.promises.mkdir(staging);
      await fs.promises.mkdir(path.join(staging,'photos'));
      for(const relative of files) {
        const from=path.join(source,relative),to=path.join(staging,relative);
        await fs.promises.mkdir(path.dirname(to),{recursive:true});
        await fs.promises.copyFile(from,to,fs.constants.COPYFILE_EXCL);
        if(await this.digest(from)!==await this.digest(to)) throw new Error('复制校验失败，原照片库保持原位：'+relative);
      }
      this.validate(staging);
      // Never replace an existing library, including one created during the copy.
      if(fs.existsSync(target)) throw new Error('目标文件夹已存在，取消切换，原照片库保持原位');
      await fs.promises.rename(staging,target);
      this.setLocation(target);
      return {...this.info(),busy:false,previousDirectory:source};
    } finally {this.busy=false;}
  }

  async open(directory) {
    if(this.busy) throw new Error('照片库正在切换');
    const resolved=fs.realpathSync(directory);
    this.validate(resolved);
    this.setLocation(resolved);
    return this.info();
  }
}
module.exports={LibraryManager,MARKER};
