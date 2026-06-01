# sync-darkroom

将项目根目录修改好的源文件同步到 Electron 运行目录，使改动在重启应用后生效。

## 背景

DARKROOM 的 `.exe` 实际读取的是 `dist/win-unpacked/resources/app/` 里的文件（原 `app.asar` 已改名为 `app.asar.bak`），而不是项目根目录的源文件。每次修改源文件后需要执行此同步。

## 执行步骤

1. 提醒用户确认 DARKROOM 应用已关闭（否则文件可能被占用）
2. 执行以下 PowerShell 命令，将所有 HTML/JS 源文件复制到运行目录：

```powershell
$src = "C:\Users\16928\Desktop\Claude's project\Albumn"
$dst = "C:\Users\16928\Desktop\Claude's project\Albumn\dist\win-unpacked\resources\app"
$files = @("Album.html","journal.html","index.html","couple.html","two-rolls.html","wishlist.html","main.js","package.json")
foreach ($f in $files) {
    if (Test-Path "$src\$f") {
        Copy-Item "$src\$f" "$dst\$f" -Force
        Write-Host "✓ $f"
    }
}
# 同步 fonts 文件夹
if (Test-Path "$src\fonts") {
    Copy-Item "$src\fonts" "$dst\fonts" -Recurse -Force
    Write-Host "✓ fonts/"
}
Write-Host "同步完成，可以重新打开 DARKROOM.exe"
```

3. 告知用户同步完成，可重新打开 `dist/win-unpacked/DARKROOM.exe` 查看效果
