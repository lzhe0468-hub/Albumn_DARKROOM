const fs=require('node:fs'),path=require('node:path');
module.exports=name=>{
  const parent=path.resolve(process.env.DARKROOM_TEST_RUN_ROOT||__dirname);
  if(parent!==__dirname&&!parent.startsWith(__dirname+path.sep)) throw new Error('Runtime test output must stay inside tests/');
  const directory=path.join(parent,name);
  fs.mkdirSync(directory,{recursive:true});
  return directory;
};
