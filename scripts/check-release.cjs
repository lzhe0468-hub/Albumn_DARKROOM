const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const asar=require('@electron/asar');
const {runtimeFiles,runtimeDirectories}=require('../app-files');
const root=path.join(__dirname,'..'),pkg=require('../package.json');
assert.deepEqual(pkg.build.files,[...runtimeFiles,...runtimeDirectories.map(name=>name+'/**')],'Release allowlists disagree');
const archive=path.join(root,'dist','win-unpacked','resources','app.asar');
for(const name of asar.listPackage(archive)){
  const relative=name.replace(/^[/\\]+/,'').replaceAll('\\','/');
  assert.ok(runtimeFiles.includes(relative)||runtimeDirectories.some(dir=>relative===dir||relative.startsWith(dir+'/')),'Unexpected release entry: '+relative);
  assert.ok(!/(^|\/)(photos|tests|\.claude|\.upgrade-backups)(\/|$)|(^|\/)(album|journal|calendar|wishlist|people)\.json/.test(relative),'Private data in release: '+relative);
}
for(const name of runtimeFiles){
  const packed=asar.extractFile(archive,name);
  if(name==='package.json'){
    const value=JSON.parse(packed);assert.equal(value.version,pkg.version);assert.equal(value.name,pkg.name);
  }else assert.deepEqual(packed,fs.readFileSync(path.join(root,name)),'Stale runtime file: '+name);
}
const label='v'+pkg.version.split('.').slice(0,2).join('.');
for(const name of ['index.html','Album.html','couple.html'])assert.ok(fs.readFileSync(path.join(root,name),'utf8').includes(label),'Stale UI version: '+name);
assert.ok(!fs.existsSync(path.join(root,'dist','win-unpacked','resources','app')),'Legacy resources/app could cause confusion');
console.log('Release '+pkg.version+': allowlist, privacy exclusions, runtime content and version checks PASS');
