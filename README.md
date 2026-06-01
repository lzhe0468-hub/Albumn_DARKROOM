# DARKROOM · 摄影档案

A vibe coding work for every photographer or any couples that want to mark down their daily life

---

## 系统要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10（64 位）或 Windows 11 |
| 架构 | x64 |
| 运行时 | 无需额外安装，Electron 已内置 Chromium + Node.js |

> Windows 7 / 8 / 8.1 不受支持。Windows 10 建议 20H2 及以上版本以获得最佳字体渲染效果。

---

## 应用模块

| 页面 | 文件 | 功能 |
|------|------|------|
| 主页 | `index.html` | 导航入口，整体风格展示 |
| 胶卷档案 | `Album.html` | 照片上传、Inspector 查看、评分、灯箱放大、删除 |
| 双轨日历 | `two-rolls.html` | 按月组织照片，日历动态化（2026–2027） |
| 旅伴相册 | `couple.html` | 双人共享相册 |
| 日记本 | `journal.html` | 拖拽上传照片、构想区、灵感本编辑 |
| 心愿清单 | `wishlist.html` | 愿望列表管理 |

---

## 打开应用

直接运行打包好的可执行文件：

```
dist\win-unpacked\DARKROOM.exe
```

无需安装，双击即可启动。

---

## 开发与部署工作流

### 目录结构说明

```
Albumn\
├── index.html          ← 源文件（在此处修改）
├── Album.html
├── journal.html
├── couple.html
├── two-rolls.html
├── wishlist.html
├── main.js
├── fonts\              ← 字体资源
├── dist\
│   └── win-unpacked\
│       ├── DARKROOM.exe          ← 实际运行的程序
│       └── resources\
│           ├── app.asar.bak      ← 原打包归档（已禁用）
│           └── app\              ← 实际读取的运行目录
└── .claude\
    └── commands\
        └── sync-darkroom.md      ← Claude Code 工作流提示（见下方）
```

> **重要**：DARKROOM.exe 读取的是 `dist\win-unpacked\resources\app\` 里的文件，而非项目根目录的源文件（`app.asar` 已改名为 `app.asar.bak` 使其失效）。修改源文件后必须同步到该目录，改动才会生效。

### 修改后同步步骤

1. 关闭 DARKROOM 应用（否则文件可能被占用）
2. 在 Claude Code 中执行 `/sync-darkroom` 命令，自动将所有源文件复制到运行目录
3. 重新启动 `dist\win-unpacked\DARKROOM.exe` 查看效果

手动同步（PowerShell）：

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
Copy-Item "$src\fonts" "$dst\fonts" -Recurse -Force
Write-Host "同步完成"
```

### 重新打包

所有模块 bug 修复完成后，执行以下命令生成新的 `.exe`：

```powershell
npm run dist
```

---

## .claude 文件夹说明

`.claude\` 目录存放 Claude Code 的项目级工作流配置，**不影响应用运行**，仅在使用 Claude Code CLI 开发时生效。

| 文件 | 用途 |
|------|------|
| `.claude\commands\sync-darkroom.md` | `/sync-darkroom` 命令：一键将源文件同步到 Electron 运行目录 |
| `.claude\settings.local.json` | 本地权限白名单，允许 Claude Code 执行特定的 PowerShell 命令 |

---

## 字体

应用内嵌以下字体（`fonts\` 目录，离线可用）：

- **EB Garamond** — 正文衬线字体
- **Noto Serif SC** — 中文衬线字体
- **Courier Prime** — 打字机等宽字体
- **Caveat** — 手写风格字体
