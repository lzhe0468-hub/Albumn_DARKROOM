# DARKROOM · v2.0

A vibe coding work for every photographer or any couples that want to mark down their daily life.

一个从个人摄影习惯出发的本地桌面相册。以胶卷组织照片，用逐张灵感本记录观看与拍摄的感受，也为同一台设备上的两个人保留照片、心情和信笺。延续暗房、胶片与纸张的视觉风格。

**[版本下载与历史版本 →](RELEASES.md)**

## 使用

支持 Windows 10 / 11 x64。发布包已包含运行环境，日常使用无需服务器、账户或登录。

- 安装包：`DARKROOM-2.0.0-win-x64-setup.exe`。
- 免安装版：`DARKROOM-2.0.0-win-x64-portable.exe`。
- 本地构建后的目录版：`dist/win-unpacked/DARKROOM.exe`。

安装包、免安装包与历史源码统一列在[版本下载页](RELEASES.md)。源码归档需要自行构建；`dist/` 和 `node_modules/` 不提交到 Git。

首次使用先导入少量照片，填写评分和文字，退出重开确认后再批量整理。首页“照片库位置”可以更改保存位置、打开已有库或在文件夹中查看。

## 现在可以做什么

- **胶卷档案**：导入照片、评分、查看与编辑拍摄参数、放大欣赏；切换页面和重启后保留。
- **拍摄信息**：本机解析 EXIF，包括相机、镜头、光圈、快门、ISO、曝光补偿、焦距和拍摄时间；不覆盖手动编辑的字段。
- **摄影纪事**：以“已收录 X 张”组织作品；每个收录条目独立记录感想，自动保存并提供保存按钮。旧共用随笔可查看和复制。
- **双轨日历**：2020—2035 年、年月选择、今天跳转、照片和记事。
- **同机双人记录**：昵称区分两位作者，保存心情与心愿信笺。
- **照片库管理**：原图独立存储，支持校验迁移、重新定位、上一版存档和更新前记录快照。

首页数字与示例内容继续用于展示审美基调。排序入口预留；一键完整备份与恢复、回收站、RAW 支持和大量原图性能优化尚未完成。

## 数据与更新

默认照片库通常位于 `%APPDATA%/darkroom/album-library`，可以在首页改到独立于程序的文件夹。程序名、应用标识和存档格式保持兼容，版本号更新为 2.0.0。

**更新前退出软件，把整个照片库复制到另一块硬盘。**原图在 `photos/`，评分、文字和关联关系在各 JSON 存档中；只复制照片不能恢复完整记录。库内的 `.bak` 和升级快照不能替代独立备份，也不能保证所有未来版本都兼容。

迁移会保留原库并校验复制结果。磁盘不可用或存档版本不支持时停止覆盖，避免用默认内容替换旧记录。完整说明见 [照片库与数据保护](docs/DATA_SAFETY.md)。

## 从源码运行

需要 Node.js 22.12 或更高版本；本次构建使用 Node.js 24。依赖版本记录在 `package-lock.json` 中。

```powershell
npm ci
npm start
```

开发和构建首次安装需要联网下载依赖及 Electron。Windows 安装会校验并补全缺失的开发运行文件；需要时也可运行 `npm run setup:runtime`。应用内字体和 EXIF 解析库随程序提供。

## 测试与打包

```powershell
npm test
npm run dist
npm run check:release
npm run test:runtime -- --packaged-test
```

`npm run dist` 生成 Windows x64 安装包、免安装包及目录版，默认不自动发布到 GitHub。`npm run check:release` 检查版本、资源清单和私有数据排除情况。隔离运行测试验证页面操作、保存失败、重启及照片库迁移，不写入正式照片库。详见 [测试说明](docs/TESTING.md)。

已有目录版时，`npm run pack:local` 可以只更新其 `app.asar`。操作前关闭软件；不要再手工同步到旧的 `resources/app/` 目录。

## 项目结构

- 根目录 HTML：六个页面与界面资源。
- `main.js`、`preload.js`：本地桌面运行和页面访问接口。
- `album-store.js`、`document-store.js`：照片与文字存档。
- `library-manager.js`、`storage-safety.js`、`upgrade-backup.js`：照片库位置、格式保护和更新快照。
- `fonts/`、`build/`、`vendor/`：字体、图标和离线解析库。
- `scripts/`、`tests/`、`docs/`：构建验证与说明。

更新内容见 [CHANGELOG](CHANGELOG.md)。第三方组件与字体的许可见 [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md)。本仓库未另行指定项目代码的开源许可证；第三方许可仅适用于其各自内容。
