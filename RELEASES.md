# DARKROOM · 版本下载

这里集中列出各个版本的下载与更新说明。新版本按时间从新到旧追加，旧版本保留，便于回看。

**当前推荐：v2.0.0** · Windows 10 / 11 · x64

[下载免安装版](https://github.com/lzhe0468-hub/Albumn_DARKROOM/releases/download/v2.0.0/DARKROOM-2.0.0-win-x64-portable.exe) · [下载安装版](https://github.com/lzhe0468-hub/Albumn_DARKROOM/releases/download/v2.0.0/DARKROOM-2.0.0-win-x64-setup.exe)

免安装版下载后可以直接运行；安装版提供安装向导。两者使用同样的功能，照片库均可在首页选择保存位置。

**更新前，请退出软件并备份整个照片库。** 原图、评分与文字记录需要一起保留，详见[照片库与数据保护](docs/DATA_SAFETY.md)。

## v2.0.0 · 本地摄影记录版

发布日期：2026-10-19 · 当前推荐版本

### 下载

- [Windows x64 免安装版](https://github.com/lzhe0468-hub/Albumn_DARKROOM/releases/download/v2.0.0/DARKROOM-2.0.0-win-x64-portable.exe)
- [Windows x64 安装版](https://github.com/lzhe0468-hub/Albumn_DARKROOM/releases/download/v2.0.0/DARKROOM-2.0.0-win-x64-setup.exe)
- [SHA-256 文件校验值](https://github.com/lzhe0468-hub/Albumn_DARKROOM/releases/download/v2.0.0/SHA256SUMS.txt)
- [本版源码 ZIP](https://github.com/lzhe0468-hub/Albumn_DARKROOM/archive/refs/tags/v2.0.0.zip) · [完整发布说明](https://github.com/lzhe0468-hub/Albumn_DARKROOM/releases/tag/v2.0.0)

### 本版变化

- 胶卷、照片、评分、拍摄参数与文字记录在切换页面和重启后保留。
- 自动读取照片 EXIF，并保护手动修改的字段。
- 摄影纪事按“已收录 X 张”组织作品，每张收录照片都有独立灵感本。
- 支持双人昵称、心愿信笺，以及 2020—2035 年的照片日历。
- 支持照片库位置选择、校验迁移、重新打开与更新前的记录快照。

首页示例统计继续保留，排序入口预留。一键完整备份恢复、回收站、RAW 支持和大量原图性能优化尚未完成。

## v1.0.0 · 初始界面与示例

历史源码日期：2026-06-01 · 历史归档

### 下载与回看

- [历史源码 ZIP](https://github.com/lzhe0468-hub/Albumn_DARKROOM/archive/38794a8f57dbd484a6a1e66ef024c8fc3229100b.zip)
- [浏览当时的项目](https://github.com/lzhe0468-hub/Albumn_DARKROOM/tree/38794a8f57dbd484a6a1e66ef024c8fc3229100b)
- [比较 v1.0 与 v2.0](https://github.com/lzhe0468-hub/Albumn_DARKROOM/compare/38794a8f57dbd484a6a1e66ef024c8fc3229100b...v2.0.0)

这一项对应升级前保留的 Git 提交，项目中的版本号为 1.0.0，展示早期暗房风格与示例页面。当时没有上传安装包，因此这里提供的是历史源码快照，不能直接当作可执行程序使用。

该版本尚无 v2.0 的可靠保存与升级保护，请使用 v2.0 整理正式照片库。

---

## 以后如何更新这一页

1. 将新版本的安装包、免安装包等文件上传到该版本的 [GitHub Release](https://github.com/lzhe0468-hub/Albumn_DARKROOM/releases)。
2. 在本页版本列表顶部新增一段，写明版本号、日期、下载链接和本次变化。
3. 将页首“当前推荐”及两个快捷下载入口改为新版本，保留下面的旧版本记录。

本页是统一下载目录，实际文件由各个 GitHub Release 保存；只添加文字或文件名不会自动上传安装包。

<details>
<summary>复制这一段作为下次更新的模板</summary>

```markdown
## vX.Y.Z · 版本名称

发布日期：YYYY-MM-DD

### 下载

- [Windows x64 免安装版](填写已上传文件的下载链接)
- [Windows x64 安装版](填写已上传文件的下载链接)
- [完整发布说明](填写本版 Release 链接)

### 本版变化

- 变化一。
- 变化二。

更新提示：填写本次升级需要注意的数据兼容或操作事项。
```

</details>
