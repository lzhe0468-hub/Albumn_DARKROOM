# 第三方组件与字体

第三方组件和字体的权利归各自作者所有，按各自许可分发。本文件不为本项目其他代码另行授予许可证。

- Electron 31.7.7：MIT。官方运行包保留其 `LICENSE` 与 `LICENSES.chromium.html`，后者覆盖 Chromium 等组成部分。
- exifr 7.1.3：MIT。源文件、版本信息和原许可位于 `vendor/exifr/`。
- EB Garamond、Noto Serif SC、Courier Prime、Caveat、Space Mono：SIL Open Font License 1.1，完整许可与版权声明位于 `fonts/licenses/`。
- Special Elite：Apache License 2.0，许可与字体元数据位于 `fonts/licenses/`。

字体来自 Google Fonts，字体文件以原名称保留。各字体对应的上游目录与许可来源在 `fonts/licenses/SOURCES.md` 中列出。

开发与打包工具由 `package-lock.json` 锁定。`node_modules/` 不作为本项目源代码提交；运行包仅包含白名单内的应用文件及 Electron 必需资源。
