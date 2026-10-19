# sync-darkroom

更新已有本地运行包的应用资源。完整构建与测试以 README.md 为准。

1. 检查 DARKROOM 是否仍在运行；运行时不要替换其资源包。
2. 在项目根目录运行 npm run pack:local。
3. 脚本按明确清单创建 dist/win-unpacked/resources/app.asar，保留上次资源副本。
4. 重新打开 dist/win-unpacked/DARKROOM.exe 验证。

不要再把文件复制到 resources/app/。照片库独立于程序目录，更新时不要移动、删除或替换用户照片库。
如果没有现成的 dist/win-unpacked，先执行 npm ci 和 npm run dist。
