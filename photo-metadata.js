(function(root){
  const parser=typeof module==='object'&&module.exports?require('./vendor/exifr/dist/full.umd.js'):root.exifr;
  const fields=['camera','lens','focal','aperture','shutter','iso','ev','wb','mode','takenAt','focal35'];
  const tags=['Make','Model','LensMake','LensModel','LensInfo','FNumber','ApertureValue','ExposureTime','ShutterSpeedValue',
    'ISO','ISOSpeedRatings','RecommendedExposureIndex','ExposureCompensation','ExposureBiasValue','FocalLength',
    'FocalLengthIn35mmFormat','FocalLengthIn35mmFilm','WhiteBalance','ExposureProgram','DateTimeOriginal'];
  const number=value=>typeof value==='number'&&Number.isFinite(value)?value:undefined;
  const format=(value,precision=2)=>String(Number(value.toFixed(precision)));
  const text=value=>typeof value==='string'?value.replace(/\0/g,'').trim():'';
  function map(tags){
    const result=Object.fromEntries(fields.map(key=>[key,'']));
    result.camera=text(tags.Model)||text(tags.Make);
    result.lens=text(tags.LensModel);
    if(!result.lens && Array.isArray(tags.LensInfo) && tags.LensInfo.length===4 && tags.LensInfo.every(v=>number(v)>0)) {
      const [min,max,fmin,fmax]=tags.LensInfo;
      result.lens=`${format(min)}${max!==min?'–'+format(max):''}mm f/${format(fmin)}${fmax!==fmin?'–'+format(fmax):''}`;
    }
    const aperture=number(tags.FNumber)??(number(tags.ApertureValue)!==undefined?Math.pow(2,tags.ApertureValue/2):undefined);
    if(aperture>0) result.aperture=format(aperture,1);
    const exposure=number(tags.ExposureTime)??(number(tags.ShutterSpeedValue)!==undefined?Math.pow(2,-tags.ShutterSpeedValue):undefined);
    if(exposure>0) result.shutter=exposure<1?`1/${format(1/exposure)} s`:`${format(exposure)} s`;
    const iso=number(tags.ISO)??number(tags.ISOSpeedRatings)??number(tags.RecommendedExposureIndex);
    if(iso>0) result.iso=format(iso,0);
    const ev=number(tags.ExposureCompensation)??number(tags.ExposureBiasValue);
    if(ev!==undefined) result.ev=(ev>0?'+':'')+format(ev,1)+' EV';
    if(number(tags.FocalLength)>0) result.focal=format(tags.FocalLength)+' mm';
    const focal35=number(tags.FocalLengthIn35mmFormat)??number(tags.FocalLengthIn35mmFilm);
    if(focal35>0) result.focal35=format(focal35)+' mm';
    result.wb=({0:'自动',1:'手动'})[tags.WhiteBalance]||'';
    result.mode=({1:'M',2:'P',3:'A',4:'S',5:'DEPTH',6:'ACTION',7:'PORTRAIT',8:'LANDSCAPE'})[tags.ExposureProgram]||'';
    result.takenAt=text(tags.DateTimeOriginal).replace(/^(\d{4}):(\d{2}):(\d{2})/,'$1-$2-$3');
    result.exifVersion=1;
    result.exifStatus=fields.some(key=>result[key])?'read':'none';
    return result;
  }
  async function readPhotoMetadata(file){
    try {
      if(!parser) throw new Error('EXIF 解析器未加载');
      const tagsRead=await parser.parse(file,{pick:tags,translateValues:false,reviveValues:false});
      return map(tagsRead||{});
    } catch {
      return {...map({}),exifStatus:'error'};
    }
  }
  function applyPhotoMetadata(shot,metadata){
    const edited=shot.metadataEdited||[];
    for(const field of fields) {
      if(edited.includes(field)) continue;
      // Old imports used a hard-coded A; it was never read from the camera.
      if(!shot[field] || (field==='mode'&&!shot.exifVersion&&shot.mode==='A')) shot[field]=metadata[field]||'';
    }
    shot.exifVersion=metadata.exifVersion;
    shot.exifStatus=metadata.exifStatus;
    return shot;
  }
  const api={readPhotoMetadata,applyPhotoMetadata,fields,map};
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.photoMetadata=api;
})(typeof globalThis==='object'?globalThis:this);
