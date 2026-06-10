# Electron 技术入门文档

## 概述

Electron 是一个用于构建跨平台桌面应用程序的框架，它允许开发者使用网页技术（HTML、CSS、JavaScript）来开发桌面应用，同时能够调用本地操作系统能力。

**核心特点**：网页级 UI + 本地电脑能力 + 跨平台交付

---

## 架构模型：三层边界

Electron 应用由三个核心角色组成，必须明确区分：

| 角色 | 职责 | 说明 |
|------|------|------|
| **Renderer（渲染进程）** | 负责网页界面 | 运行前端代码，展示用户界面 |
| **Main（主进程）** | 负责系统能力 | 调用本地 API、管理窗口、与操作系统交互 |
| **Preload（预加载脚本）** | 负责安全通道 | 作为 Renderer 和 Main 之间的桥梁，暴露受控的 API |

> ⚠️ **不要把 Electron 当成普通网页**：它有进程边界，也有系统权限。  
> 原则：网页负责界面，主进程负责系统，预加载脚本负责安全通道。

---

## 适用场景

当你需要满足以下条件时，Electron 是合适的选择：

- 需要丰富、流畅的网页级用户界面
- 需要调用本地电脑能力（文件系统、系统对话框、硬件等）
- 需要跨平台交付（Windows、macOS、Linux）

---

## 项目目录结构

Electron 项目通常不只有 `src`，而是分成两个主要部分：

- **前端界面**：存放渲染进程的代码（HTML/CSS/JS、React/Vue 等）
- **桌面外壳**：存放主进程和预加载脚本的代码（`main.js`、`preload.js`）

---

## 快速上手：从 0 到 1

第一目标不是打包、签名或自动更新，而是让最小应用成功运行。

### 1. 初始化项目
```bash
npm init -y
npm install electron
```

### 2. 创建必要文件
- `main.js`：主进程入口
- `preload.js`：预加载脚本
- `index.html`：渲染进程页面

### 3. 启动应用
```bash
npx electron .
```

---

## 第一个桌面能力：选择文件

通过一个按钮，展示完整的 Electron 通信链路：

```
Renderer  →  Preload  →  Main  → 系统对话框
```

**步骤简示**：
1. 渲染进程页面中，按钮触发调用 `window.electron.selectFile`（由预加载暴露）
2. 预加载脚本通过 `ipcRenderer` 向主进程发送消息
3. 主进程使用 `dialog.showOpenDialog` 调用系统文件选择对话框
4. 主进程将结果返回给渲染进程

---

## IPC 通信：页面与主进程的对话

- **IPC（Inter-Process Communication）** 是渲染进程和主进程之间的“安全对话”
- **Preload 脚本负责开门**：它通过 `contextBridge` 暴露安全的 API，而不是直接暴露 `ipcRenderer` 的全部方法

示例预加载脚本：
```javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  selectFile: () => ipcRenderer.invoke('dialog:selectFile')
})
```

---

## 安全边界

Electron 应用拥有系统权限，因此**默认应将页面关在安全沙盒里**。

- 启用沙盒模式（`sandbox: true`）
- 禁用 `nodeIntegration`
- 使用 `contextIsolation`
- 通过预加载脚本暴露有限、受控的 API

> ⚠️ 别把前端当后端用：渲染进程不应直接访问 Node.js 或系统资源。

---

## 常用命令区分

| 命令 | 用途 | 检查内容 |
|------|------|----------|
| `dev` | 开发模式（热重载） | 代码逻辑、界面调试 |
| `build` | 构建打包 | 代码编译、资源处理 |
| `preview` | 预览打包后的应用 | 模拟生产环境运行 |
| `package` / `make` | 生成可分发的安装包 | 路径、资源、权限、图标等 |

> 不要混淆：开发能跑不等于安装包能跑。

---

## 打包发布注意事项

打包不是最后才考虑的事情。开发阶段就应提前检查：

- **路径处理**：生产环境下 `__dirname` 和资源路径可能与开发不同
- **资源打包**：静态资源需正确配置 `extraResources`
- **权限声明**：某些系统能力（如摄像头、麦克风）需要提前在打包配置中声明
- **代码签名**：生产环境需要签名以避免安全警告

常用打包工具：`electron-builder`、`electron-forge`

---

## 总结

| 要点 | 描述 |
|------|------|
| 三层边界 | Renderer（界面）、Main（系统）、Preload（安全通道） |
| 核心能力 | 网页 UI + 本地能力 + 跨平台 |
| 安全原则 | 沙盒、隔离、不直接暴露 Node.js |
| 开发流程 | 先跑通最小应用 → 添加 IPC 能力 → 处理打包问题 |

> 记住：Electron 不是普通网页，有进程边界和系统权限。