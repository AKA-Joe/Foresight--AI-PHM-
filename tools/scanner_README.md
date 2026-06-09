# ⚔️ Nmap-Lite · 端口扫描与服务识别工具

轻量级网络安全侦察工具 —— **多线程 TCP 端口扫描 + Service Banner 抓取 + OS 指纹推测**，终端输出可视化结果。

```text
 ⚔️  扫描 45.33.32.156 · 3 端口 · 200 并发

 📊 扫描统计
   目标: 45.33.32.156
   扫描端口数: 3    开放端口: 2    用时: 2.01s
   OS 指纹推测: Linux (置信度 75%)

 🔓 开放端口一览
   22  → OpenSSH  SSH-2.0-OpenSSH_6.6.1p1 Ubuntu-2ubuntu2.13
   80  → HTTP     -

 🖥️  OS 指纹推测: Linux
   置信度: ███████████████░░░░░ 75%
```

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 🔍 **TCP Connect 扫描** | 多线程并发，支持自定义超时与线程数 |
| 📡 **Banner 抓取** | 对开放端口主动读取服务标识，识别版本号 |
| 🖥️ **OS 指纹推测** | 基于开放端口组合 + 服务分布推测操作系统 |
| ⚠️ **风险评估** | 基于端口风险数据库自动评分（高危/中危/低危） |
| 📋 **预设端口集** | top10 / top100 / top1000 / Web / 数据库 / 自定义 |
| 📊 **实时进度条** | Rich 动画进度 + 已完成/总数 + 剩余时间估算 |
| 📈 **统计面板** | 水平条形图 + 百分比 + OS 置信度条 |
| 🖨️ **HTML 报告** | 暗色主题报告，风险标签 + 分类 + 指纹卡片 |
| 📄 **JSON 导出** | 结构化数据，便于二次处理 |
| 🎨 **终端 UI** | 彩色表格 + ASCII art 标题 + Panel 布局 |
| ⌨️ **双模式** | 命令行参数快速扫描 + 交互式菜单引导 |

---

## 📦 安装

```bash
pip install rich
```

---

## 🚀 用法

### 命令行模式

```bash
# 指定端口扫描
python scanner.py scanme.nmap.org 22,80,443

# 使用预设集
python scanner.py example.com top10
python scanner.py example.com top100
python scanner.py example.com top1000

# 端口范围
python scanner.py 192.168.1.1 1-1024

# 全端口（慎重，很慢）
python scanner.py target 1-65535

# 导出 HTML 报告
python scanner.py scanme.nmap.org 22,80,443 --html report.html

# 导出 JSON
python scanner.py scanme.nmap.org top100 -o scan.json

# 自定义超时和并发
python scanner.py target 22,80,443 -t 3 -w 500 --html report.html
```

### 交互式模式

```bash
python scanner.py
```

进入菜单引导，依次选择：
1. 输入目标地址
2. 选择端口范围（Top10 / Top100 / Top1000 / 自定义 / 全端口）
3. 设置超时和并发数
4. 选择是否导出 JSON / HTML

---

## 🗂️ 预设端口集

| 预设 | 数量 | 典型端口 |
|------|------|---------|
| `top10` | 10 | 21,22,23,80,443,3306,3389,5432,5900,8080 |
| `top100` | ~50 | 最常用的服务端口 |
| `top1000` | 200+ | 覆盖绝大多数常见服务 |
| `web` | 20+ | 80,443,8080,8443 等 Web 端口 |
| `database` | ~12 | MySQL, PostgreSQL, Redis, MongoDB 等 |

---

## 📄 HTML 报告样例

导出为深色主题 HTML 文件，包含：

- **统计卡片组** — 扫描端口数 / 开放端口 / 过滤 / 关闭 / 用时
- **OS 指纹卡片** — 推测结果 + 置信度
- **开放端口表格** — 端口号、状态标签、服务名、Banner 详情
- **页脚** — 生成时间戳

可直接在浏览器打开，适合分享给团队成员。

---

## 🧠 原理

### TCP Connect 扫描
使用完整的 TCP 三次握手连接目标端口：
- 连接成功 → 端口 **开放**
- 连接被拒（RST）→ 端口 **关闭**
- 超时无响应 → 端口 **过滤**（防火墙/丢包）

### Banner 抓取
对开放端口发送空请求或等待服务端主动推送的标识信息，解析服务类型和版本号（如 `SSH-2.0-OpenSSH_6.6.1p1`）。

### OS 指纹推测
基于**开放端口组合模式**推测操作系统：
- 3389(RDP) + 445(SMB) → **Windows**
- 22(SSH) + 数据库端口 → **Linux Server**
- 22(SSH) + 23(Telnet) + 161(SNMP) → **Cisco IOS / 网络设备**

---

## ⚠️ 法律声明

本工具仅用于**授权的安全测试**、CTF 竞赛、本地网络排查。请遵守当地法律法规，**不要**扫描未经授权的目标。扫描他人服务器可能构成非法入侵。

---

## 📁 文件

```
tools/
├── scanner.py           # ⚔️ 端口扫描器（主程序）
├── scanner_README.md    # 本文件（扫描器文档）
├── cybereye.py          # 🛡️ 网络侦察情报系统
└── cybereye_README.md   # CyberEye 文档
```
