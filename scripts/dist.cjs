const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');
async function main(){
  if(process.platform!=='win32')throw new Error('This release script builds on Windows x64.');
  // electron-builder 24's multi-platform tool archive contains macOS symlinks.
  // Extract only the Windows tools so standard Windows accounts can build.
  const cache=path.resolve(process.env.ELECTRON_BUILDER_CACHE||path.join(root,'.packaged-app','builder-cache'));
  process.env.ELECTRON_BUILDER_CACHE=cache;
  const tools=path.join(cache,'winCodeSign','winCodeSign-2.6.0');
  if(!fs.existsSync(path.join(tools,'rcedit-x64.exe'))){
    const parent=path.dirname(tools);fs.mkdirSync(parent,{recursive:true});
    const archive=path.join(parent,'winCodeSign-2.6.0.7z');
    const sha512='e8b408d9df413c2dd7b346684d07b5a37b4f880dbc73bf8f63af50f62fe90fc958e39a6c32d1ee2f0bf7bd1724895af7671d5c6cdc8b94147c493c0275c1f0b4';
    const valid=()=>fs.existsSync(archive)&&crypto.createHash('sha512').update(fs.readFileSync(archive)).digest('hex')===sha512;
    if(!valid())await require('app-builder-lib/out/binDownload').download(
      'https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z',
      archive,Buffer.from(sha512,'hex').toString('base64'));
    if(!valid())throw new Error('Windows build tools checksum mismatch');
    const stage=fs.mkdtempSync(path.join(parent,'extract-'));
    const result=spawnSync(require('7zip-bin').path7za,['x','-bd',archive,'-o'+stage,'-xr!darwin'],{stdio:'inherit',windowsHide:true});
    if(result.error)throw result.error;
    if(result.status!==0)throw new Error('Windows build tools extraction failed');
    fs.renameSync(stage,tools);
  }
  const builder=require('electron-builder');
  await builder.build({targets:builder.Platform.WINDOWS.createTarget(['nsis','portable'],builder.Arch.x64),publish:'never'});
}
main().catch(error=>{console.error(error);process.exitCode=1});
