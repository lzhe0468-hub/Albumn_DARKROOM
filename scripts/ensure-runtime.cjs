const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
async function main(){
  if(process.env.ELECTRON_SKIP_BINARY_DOWNLOAD)return;
  const directory=path.dirname(require.resolve('electron/package.json'));
  const binary=path.join(directory,'dist','electron.exe');
  if(process.platform!=='win32')return; // Electron's own installer handles other hosts.
  if(fs.existsSync(binary)&&fs.existsSync(path.join(directory,'path.txt')))return;
  const version=require('electron/package.json').version;
  const name='electron-v'+version+'-win32-'+process.arch+'.zip';
  const checksums=require(path.join(directory,'checksums.json'));
  const archive=await require('@electron/get').downloadArtifact({version,artifactName:'electron',platform:'win32',arch:process.arch,checksums});
  if(crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex')!==checksums[name])throw new Error('Electron archive checksum mismatch');
  // Some Node/Windows combinations leave extract-zip unfinished without an error.
  // The bundled 7-Zip extracts the same verified official archive synchronously.
  const result=spawnSync(require('7zip-bin').path7za,['x',archive,'-o'+path.join(directory,'dist'),'-y','-bso0','-bsp0'],{stdio:'inherit',windowsHide:true});
  if(result.error)throw result.error;
  if(result.status!==0||!fs.existsSync(binary))throw new Error('Electron runtime extraction failed');
  fs.writeFileSync(path.join(directory,'path.txt'),'electron.exe');
  console.log('Electron '+version+' Windows runtime ready');
}
main().catch(error=>{console.error(error);process.exitCode=1});
