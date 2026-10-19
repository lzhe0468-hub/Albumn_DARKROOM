// Explicit release allowlist: user photo libraries and test fixtures must never ship.
const runtimeFiles=['index.html','Album.html','couple.html','journal.html','journal-page.js','two-rolls.html','wishlist.html',
  'main.js','preload.js','album-store.js','document-store.js','storage-safety.js','upgrade-backup.js','app-files.js',
  'text-storage.js','people-storage.js','library-manager.js','library-settings.js','photo-metadata.js','package.json','THIRD_PARTY_NOTICES.md'];
const runtimeDirectories=['fonts','build','vendor'];
module.exports={runtimeFiles,runtimeDirectories};
