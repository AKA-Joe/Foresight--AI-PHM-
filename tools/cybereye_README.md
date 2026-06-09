# 🛡️ CyberEye · 网络侦察与可视化情报系统

多维度网络情报采集平台 —— **GeoIP 地理定位 + DNS 枚举 + 端口探测 + 路由追踪 + WHOIS**，全终端可视化输出。

```text
🛡️  CyberEye 侦察报告

📊 情报总览
  目标: scanme.nmap.org    IP: 45.33.32.156
  位置: Fremont, United States
  DNS: 4 条记录    端口: 2 个开放    路由: 8 跳

🌐 地理定位
  坐标: 37.55°N, 121.98°W    ISP: DigitalOcean, LLC

📡 DNS 记录
  A       ● 45.33.32.156
  NS      ● dns1.p01.nsone.net

🔓 开放端口
  22  ⚠️ MED  SSH       SSH-2.0-OpenSSH_6.6.1p1
  80  ⚠️ MED  HTTP      -

⚠️  风险评估: 🟢 低风险
```

---

## ✨ 功能特性

| 模块 | 功能 | 可视化效果 |
|------|------|-----------|
| 🌐 **GeoIP 定位** | 通过 ip-api.com 查询 IP 地理位置、ISP、ASN | 情报卡片 + 📍 坐标 + 🏢 组织信息 |
| 🗺️ **ASCII 世界地图** | 在经纬度网格上标记目标位置 | 40×14 字符地图，🔴 标记目标点 |
| 📡 **DNS 枚举** | A/AAAA/MX/TXT/NS/CNAME/SOA 六类记录 | 分类展示，每类最多 5 条 |
| 🔓 **端口探测** | TOP24 常见端口并发扫描 + Banner 抓取 | 风险色标表格（🔥高危/⚠️中危/✓低危） |
| ⚠️ **风险评估** | 基于暴露端口组合计算风险评分 | 色条 + 等级 + 建议文本 |
| 🗺️ **Traceroute** | 路由路径追踪（15 跳） | 拓扑连线图 🖥️→●→●→🎯 |
| 🔍 **WHOIS** | 域名注册信息查询 | 精简信息面板 |
| 📊 **情报总览** | 汇总所有侦察结果 | 统计卡片（IP/位置/DNS/端口/路由/用时） |
| 📄 **HTML 报告** | 暗色主题报告 | 统计卡片 + GEO 卡片 + DNS/端口表格 + 路由列表 |

---

## 📦 安装

```bash
pip install rich requests
```

---

## 🚀 用法

### 命令行模式

```bash
# 快速侦察目标
python cybereye.py scanme.nmap.org

# IP 侦察
python cybereye.py 8.8.8.8

# 导出 HTML 报告
python cybereye.py scanme.nmap.org --html report.html
python cybereye.py 8.8.8.8 -o scan_result.html
```

### 交互式模式

```bash
python cybereye.py
```

进入菜单引导：
1. 输入目标 IP 或域名
2. 自动依次执行：GeoIP → DNS → 端口扫描 → 路由追踪 → WHOIS
3. 可选择导出 HTML 报告

---

## 🧠 技术原理

| 模块 | 原理 |
|------|------|
| **GeoIP** | 调用 ip-api.com 免费 API（无需 Key），返回国家/城市/经纬度/ISP |
| **DNS 枚举** | 系统 `nslookup`/`dig` 命令解析 A/AAAA/MX/TXT/NS/CNAME/SOA 记录 |
| **端口扫描** | TCP Connect 扫描，多线程并发 Socket 连接 + Banner 读取 |
| **Traceroute** | 系统 `tracert`(Win)/`traceroute`(Unix) 命令解析路由路径 |
| **WHOIS** | 系统 `whois` 命令抓取注册信息（仅 Unix） |
| **风险评估** | 基于端口风险数据库（高危/中危/低危）加权评分 |

---

## 📄 HTML 报告

导出为深色主题 HTML 文件，包含：
- **GEO 信息卡片** — IP / 位置 / ISP / 坐标
- **统计卡片组** — DNS 记录数 / 开放端口 / 路由跳数 / 用时
- **DNS 表格** — 记录类型 + 记录值
- **端口表格** — 端口号 / 服务 / 风险标签 / Banner
- **路由列表** — 逐跳 IP

可直接在浏览器打开，适合分享给团队。

---

## ⚠️ 法律声明

本工具仅用于**授权的安全测试**、CTF 竞赛、本地网络排查。请遵守当地法律法规，**不要**侦察未经授权的目标。

---

## 🔗 相关工具

同目录下还有：

- `scanner.py` — ⚔️ Nmap-Lite 端口扫描器
- 以及 `../../scripts/` 下的 Dify 工作流客户端
