// Rebuild the existing unpacked app using the runtime already present locally.
const fs = require('fs');
const path = require('path');
const asar = require('@electron/asar');
const {runtimeFiles,runtimeDirectories}=require('../app-files');
async function main() {
  const root = path.join(__dirname,'..');
  const target=path.join(root,'dist','win-unpacked','resources','app.asar');
  if(!fs.existsSync(target)) throw new Error('No unpacked app found. Run npm run dist first.');
  const stagingRoot=path.join(root,'.packaged-app');fs.mkdirSync(stagingRoot,{recursive:true});
  const staging=fs.mkdtempSync(path.join(stagingRoot,'release-'));
  for(const name of [...runtimeFiles,...runtimeDirectories]) {
    fs.cpSync(path.join(root,name),path.join(staging,name),{recursive:true});
  }
  const backup=target+'.before-persistence';
  if(!fs.existsSync(backup)) fs.copyFileSync(target,backup);
  await asar.createPackage(staging,target+'.tmp');
  if(fs.existsSync(target)) fs.copyFileSync(target,target+'.previous');
  fs.renameSync(target+'.tmp',target);
  console.log('Updated dist/win-unpacked/resources/app.asar; original retained as app.asar.before-persistence');
}
main().catch(e=>{console.error(e);process.exitCode=1});
