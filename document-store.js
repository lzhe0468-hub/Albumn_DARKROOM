const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const { AlbumStore } = require('./album-store');
const {assertStorageVersion,assertJournalVersion,assertExistingVersion}=require('./storage-safety');

const sections = new Set(['journal', 'wishlist', 'calendar', 'people']);
class DocumentStore extends AlbumStore {
  constructor(directory, section) {
    if (!sections.has(section)) throw new Error('未知文字存档');
    super(directory);
    this.section = section;
    this.file = path.join(directory, section + '.json');
    this.backup = this.file + '.bak';
  }

  validate(data) {
    assertStorageVersion(data);
    if (!data || data.version !== 1) throw new Error('文字存档版本无效');
    if (this.section === 'journal') {
      assertJournalVersion(data);
      if (typeof data.notes !== 'string' || !Array.isArray(data.goals) ||
          !Number.isSafeInteger(data.nextGoalId)) throw new Error('记事存档无效');
      const ids = new Set();
      for (const g of data.goals) {
        if (!Number.isSafeInteger(g.id) || ids.has(g.id) || typeof g.name !== 'string' ||
            typeof g.desc !== 'string' || !Array.isArray(g.frames) ||
            !Number.isFinite(g.cur) || (g.tgt!==undefined && (!Number.isFinite(g.tgt) || g.tgt<=0))) throw new Error('任务数据无效');
        ids.add(g.id);
        if(data.photoNotesVersion===1){
          const frames=new Set();
          for(const frame of g.frames){
            if(typeof frame.id!=='string'||!frame.id||frames.has(frame.id)||typeof frame.note!=='string') throw new Error('照片感想数据无效');
            frames.add(frame.id);
          }
        }
      }
      if ([...ids].some(id => id >= data.nextGoalId)) throw new Error('任务编号无效');
    } else if (this.section === 'wishlist') {
      if (!Array.isArray(data.rolls) || !Number.isSafeInteger(data.nextRollId)) throw new Error('心愿存档无效');
      const ids = new Set();
      for (const r of data.rolls) {
        if (!Number.isSafeInteger(r.id) || ids.has(r.id) || typeof r.name !== 'string' ||
            !Array.isArray(r.frames) || r.frames.length !== r.total) throw new Error('心愿胶卷无效');
        ids.add(r.id);
        for (const f of r.frames) {
          if (typeof f.letters?.a !== 'string' || typeof f.letters?.b !== 'string') throw new Error('信笺内容无效');
        }
      }
      if ([...ids].some(id => id >= data.nextRollId)) throw new Error('心愿编号无效');
    } else if (this.section === 'people') {
      if (typeof data.a !== 'string' || typeof data.b !== 'string') throw new Error('昵称无效');
    } else {
      if (!data.state || typeof data.state !== 'object' || Array.isArray(data.state)) throw new Error('日历存档无效');
      for (const [date, lanes] of Object.entries(data.state)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('日期无效');
        for (const who of ['a','b']) {
          if (!Array.isArray(lanes[who]?.shots)) throw new Error('日历照片无效');
          for (const shot of lanes[who].shots) if (typeof shot.note !== 'string') throw new Error('记事内容无效');
        }
      }
    }
    this.walk(data, node => {
      if (node.photoFile && !/^[a-f0-9]{64}\.(png|jpg|gif|webp|bmp|avif|tif|ico)$/.test(node.photoFile)) throw new Error('照片路径无效');
    });
    return data;
  }

  walk(value, visit) {
    if (!value || typeof value !== 'object') return;
    visit(value);
    for (const child of Object.values(value)) this.walk(child, visit);
  }

  read() {
    if (!fs.existsSync(this.file) && !fs.existsSync(this.backup)) return {data:null};
    let data, warning;
    try { data = this.validate(JSON.parse(fs.readFileSync(this.file, 'utf8'))); }
    catch (error) {
      if(error.code==='UNSUPPORTED_STORAGE_VERSION') throw error;
      data = this.validate(JSON.parse(fs.readFileSync(this.backup, 'utf8')));
      warning = '主存档读取失败，已恢复上一版本，请检查内容。';
    }
    this.walk(data, node => {
      if (node.photoFile) node.src = pathToFileURL(path.join(this.photos, node.photoFile)).href;
    });
    return {data, warning};
  }

  write(input) {
    assertExistingVersion(this.file,data=>this.validate(data));
    const data = this.validate(JSON.parse(JSON.stringify(input)));
    this.walk(data, node => {
      if (typeof node.src === 'string' && node.src.startsWith('data:')) {
        const match = /^data:image\/(png|jpeg|jpg|gif|webp|bmp|avif|tiff|x-icon);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(node.src);
        if (!match) throw new Error('不支持的图片格式');
        const bytes = Buffer.from(match[2], 'base64');
        if (!bytes.length) throw new Error('图片为空');
        const ext = ({jpeg:'jpg',tiff:'tif','x-icon':'ico'})[match[1]] || match[1];
        node.photoFile = crypto.createHash('sha256').update(bytes).digest('hex') + '.' + ext;
        const destination = path.join(this.photos, node.photoFile);
        if (!fs.existsSync(destination)) this.atomicWrite(destination, bytes);
      }
      if (node.photoFile) {
        if (!fs.existsSync(path.join(this.photos, node.photoFile))) throw new Error('照片文件缺失，未覆盖存档');
        node.src = '';
      }
    });
    if (fs.existsSync(this.file)) {
      const previous = fs.readFileSync(this.file);
      let valid = false;
      try { this.validate(JSON.parse(previous.toString('utf8'))); valid = true; } catch {}
      if (valid) this.atomicWrite(this.backup, previous);
      else fs.copyFileSync(this.file, this.file + '.corrupt-' + Date.now());
    }
    this.atomicWrite(this.file, JSON.stringify(data, null, 2));
    return this.read().data;
  }
}
module.exports = { DocumentStore };
