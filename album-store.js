const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const {assertStorageVersion,assertExistingVersion}=require('./storage-safety');

// User data lives outside the installation, so rebuilding the app cannot erase it.
class AlbumStore {
  constructor(directory) {
    this.directory = directory;
    this.file = path.join(directory, 'album.json');
    this.backup = this.file + '.bak';
    this.photos = path.join(directory, 'photos');
    fs.mkdirSync(this.photos, { recursive: true });
  }

  validate(data) {
    assertStorageVersion(data);
    if (!data || data.version !== 1 || !Array.isArray(data.rolls) || !data.rolls.length ||
        !Number.isSafeInteger(data.nextId)) throw new Error('相册数据格式无效');
    const ids = new Set();
    for (const roll of data.rolls) {
      if (!Number.isSafeInteger(roll.id) || ids.has(roll.id) || typeof roll.name !== 'string' ||
          !Array.isArray(roll.shots)) throw new Error('胶卷数据格式无效');
      ids.add(roll.id);
      for (const shot of roll.shots) {
        if (!shot || typeof shot.src !== 'string' || !Number.isFinite(shot.rating) ||
            shot.rating < 0 || shot.rating > 5) throw new Error('照片数据格式无效');
        if (shot.photoFile && !/^[a-f0-9]{64}\.(png|jpg|gif|webp|bmp|avif|tif|ico)$/.test(shot.photoFile)) {
          throw new Error('照片路径无效');
        }
      }
    }
    if (data.nextId <= Math.max(...ids)) throw new Error('胶卷编号无效');
    return data;
  }

  read() {
    if (!fs.existsSync(this.file) && !fs.existsSync(this.backup)) return { data: null };
    let data;
    let warning;
    try { data = this.validate(JSON.parse(fs.readFileSync(this.file, 'utf8'))); }
    catch (error) {
      if(error.code==='UNSUPPORTED_STORAGE_VERSION') throw error;
      // Preserve the damaged file; never silently replace it with demo content.
      data = this.validate(JSON.parse(fs.readFileSync(this.backup, 'utf8')));
      warning = '主存档读取失败，已恢复上一次备份。';
    }
    for (const roll of data.rolls) for (const shot of roll.shots) {
      if (shot.photoFile) shot.src = pathToFileURL(path.join(this.photos, shot.photoFile)).href;
    }
    return { data, warning };
  }

  write(input) {
    assertExistingVersion(this.file,data=>this.validate(data));
    const data = this.validate(JSON.parse(JSON.stringify(input)));
    for (const roll of data.rolls) for (const shot of roll.shots) {
      if (!shot.photoFile) {
        const match = /^data:image\/(png|jpeg|jpg|gif|webp|bmp|avif|tiff|x-icon);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(shot.src);
        if (!match) throw new Error('不支持的图片格式，请使用 PNG、JPEG、GIF、WebP、BMP、AVIF 或 TIFF');
        const bytes = Buffer.from(match[2], 'base64');
        if (!bytes.length) throw new Error('图片内容为空');
        const ext = ({ jpeg: 'jpg', tiff: 'tif', 'x-icon': 'ico' })[match[1]] || match[1];
        shot.photoFile = crypto.createHash('sha256').update(bytes).digest('hex') + '.' + ext;
        const destination = path.join(this.photos, shot.photoFile);
        if (!fs.existsSync(destination)) this.atomicWrite(destination, bytes);
      } else if (!fs.existsSync(path.join(this.photos, shot.photoFile))) {
        throw new Error('照片文件缺失，未覆盖原存档');
      }
      // Only a relative filename is persisted. Installation/user-data paths may change.
      shot.src = '';
    }
    if (fs.existsSync(this.file)) {
      const previous = fs.readFileSync(this.file);
      try {
        this.validate(JSON.parse(previous.toString('utf8')));
        this.atomicWrite(this.backup, previous);
      } catch (error) {
        if (!(error instanceof SyntaxError) && error.code) throw error;
        fs.copyFileSync(this.file, this.file + '.corrupt-' + Date.now());
      }
    }
    this.atomicWrite(this.file, JSON.stringify(data, null, 2));
    return this.read().data;
  }

  atomicWrite(destination, content) {
    const temporary = destination + '.tmp';
    const fd = fs.openSync(temporary, 'w');
    try { fs.writeFileSync(fd, content); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    fs.renameSync(temporary, destination);
  }
}

module.exports = { AlbumStore };
