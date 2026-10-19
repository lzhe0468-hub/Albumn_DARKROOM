const fs=require('fs'),assert=require('assert/strict');
const {map,readPhotoMetadata,applyPhotoMetadata}=require('../photo-metadata');
async function main(){
  const value=map({Model:'NIKON Z 30',FNumber:6.3,ExposureTime:1/640,ISO:125,ExposureCompensation:1/3,FocalLength:50,FocalLengthIn35mmFormat:75,WhiteBalance:1,ExposureProgram:3,DateTimeOriginal:'2026:03:15 15:45:46'});
  assert.equal(value.aperture,'6.3');assert.equal(value.shutter,'1/640 s');assert.equal(value.ev,'+0.3 EV');
  assert.equal(value.focal35,'75 mm');assert.equal(value.mode,'A');assert.equal(value.wb,'手动');
  const zero=map({ExposureCompensation:0,WhiteBalance:0});assert.equal(zero.ev,'0 EV');assert.equal(zero.wb,'自动');
  assert.equal(map({}).mode,'');assert.equal(map({}).exifStatus,'none');
  assert.equal(map({ExposureTime:2.5}).shutter,'2.5 s');
  assert.equal(map({FNumber:NaN,ExposureTime:0}).aperture,'');
  assert.equal(map({ApertureValue:4,ShutterSpeedValue:3}).aperture,'4');
  assert.equal(map({ApertureValue:4,ShutterSpeedValue:3}).shutter,'1/8 s');
  const edited={camera:'我的相机',aperture:'',iso:'900',mode:'M',metadataEdited:['aperture','iso','mode']};
  applyPhotoMetadata(edited,value);
  assert.equal(edited.camera,'我的相机');assert.equal(edited.iso,'900');assert.equal(edited.aperture,'');assert.equal(edited.mode,'M');
  assert.equal(edited.focal,'50 mm');
  const legacy={mode:'A',iso:''};applyPhotoMetadata(legacy,map({ExposureProgram:1}));assert.equal(legacy.mode,'M');
  const malformed=await readPhotoMetadata(Buffer.from('not an image'));assert.equal(malformed.exifStatus,'error');
  const png=await readPhotoMetadata(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
  assert.equal(png.exifStatus,'none');assert.equal(png.mode,'');
  if(process.argv[2]){
    const actual=await readPhotoMetadata(fs.readFileSync(process.argv[2]));
    for(const key of ['camera','aperture','shutter','iso','ev','focal','focal35','mode','wb','takenAt']) assert.equal(actual[key],value[key],key);
    assert.equal(actual.lens,'NIKKOR Z DX 16-50mm f/3.5-6.3 VR');
    console.log('PASS: user-supplied Nikon JPEG matches camera properties');
  }
  console.log('PASS: EXIF formatting, zero values, APEX fallback, missing/malformed metadata and manual edit preservation');
}
main().catch(e=>{console.error(e);process.exitCode=1});
