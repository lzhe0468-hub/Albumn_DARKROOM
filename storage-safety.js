class StorageVersionError extends Error {
  constructor(message){super(message);this.code='UNSUPPORTED_STORAGE_VERSION';}
}
function assertStorageVersion(data){
  if(data && typeof data==='object' && data.version!==undefined && data.version!==1){
    throw new StorageVersionError('此存档由其他版本的软件创建，当前程序不能安全读取或保存。请使用对应的新版本；原存档未覆盖。');
  }
}
function assertJournalVersion(data){
  if(data?.photoNotesVersion!==undefined && data.photoNotesVersion!==1){
    throw new StorageVersionError('照片感想格式高于当前程序支持的版本。请更新软件，原存档未覆盖。');
  }
}
function assertExistingVersion(file,validate){
  const fs=require('fs');
  if(!fs.existsSync(file)) return;
  try{validate(JSON.parse(fs.readFileSync(file,'utf8')));}
  catch(error){if(error.code==='UNSUPPORTED_STORAGE_VERSION') throw error;}
}
module.exports={StorageVersionError,assertStorageVersion,assertJournalVersion,assertExistingVersion};
