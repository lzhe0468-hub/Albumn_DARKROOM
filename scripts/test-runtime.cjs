const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..'),electron=require('electron');
const output=fs.mkdtempSync(path.join(root,'tests','.run-'));
const bootstrap=path.join(output,'bootstrap');fs.mkdirSync(bootstrap);
fs.writeFileSync(path.join(bootstrap,'package.json'),JSON.stringify({name:'darkroom-test',version:'1.0.0',main:'index.cjs'}));
const packaged=process.argv.includes('--packaged-test');
const suites=[['album-runtime','.runtime'],['text-runtime','.text-runtime'],['library-runtime','.library-runtime'],['journal-calendar-runtime','.journal-runtime']];
const photo=process.env.DARKROOM_TEST_PHOTO;
if(photo){assert.ok(fs.existsSync(photo),'DARKROOM_TEST_PHOTO must exist');suites.push(['exif-runtime','.exif-runtime']);}
for(const [name,folder] of suites) {
  fs.writeFileSync(path.join(bootstrap,'index.cjs'),'require('+JSON.stringify(path.join(root,'tests',name+'.cjs'))+');\n');
  for(const stage of ['write','read']) {
    const args=[bootstrap,stage];if(packaged)args.push('--packaged-test');
    if(photo)args.push('--photo='+path.resolve(photo));
    const env={...process.env,DARKROOM_TEST_RUN_ROOT:output};delete env.ELECTRON_RUN_AS_NODE;
    const result=spawnSync(electron,args,{cwd:root,env,encoding:'utf8',windowsHide:true,timeout:75000});
    if(result.error)throw result.error;
    const report=path.join(output,folder,(packaged?'packaged-':'')+stage+'.json');
    const value=fs.existsSync(report)?JSON.parse(fs.readFileSync(report,'utf8')):{ok:false,error:'No test report'};
    if(result.status!==0||!value.ok){console.error(name,stage,value,result.stderr);process.exit(1);}
    console.log(name+' '+stage+': PASS');
  }
}
console.log('Isolated reports: '+path.relative(root,output));
