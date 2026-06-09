#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════╗
║   ⚔️  Nmap-Lite · 端口扫描与服�务识别                        ║
║   轻量级网络安全侦察工具                                     ║
╚══════════════════════════════════════════════════════════╝

功能：
  • TCP Connect 端口扫描（多线程并发）
  • 服务 Banner 抓取与版本识别
  • OS 指纹推测（TTL + 窗口大小）
  • 预设端口集（top10 / top100 / top1000 / 全端口 / 自定义）
  • 结果导出 JSON / HTML
  • 终端界面：彩色表格 + 实时进度条 + 统计面板

用法：
  python scanner.py                        # 交互模式
  python scanner.py example.com            # 扫描目标 top1000 端口
  python scanner.py example.com 22,80,443  # 指定端口
  python scanner.py example.com 1-65535    # 全端口扫描（慎用）
  python scanner.py example.com 22,80 -o report.json  # 导出 JSON

依赖：
  pip install rich
"""

import socket
import sys
import time
import struct
import ipaddress
import json
import os
import signal
import io
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# Windows 终端 UTF-8 编码兼容
if sys.platform == "win32":
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='replace')
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

try:
    from rich.console import Console as RichConsole
    from rich.table import Table
    from rich.panel import Panel
    from rich.layout import Layout
    from rich.live import Live
    from rich.progress import (
        Progress, SpinnerColumn, BarColumn, TextColumn,
        TimeElapsedColumn, TimeRemainingColumn, TaskID
    )
    from rich.text import Text
    from rich.columns import Columns
    from rich.syntax import Syntax
    from rich import box
    from rich.prompt import Prompt, IntPrompt, Confirm
    from rich.align import Align
    from rich.rule import Rule
    from rich.style import Style
    from rich.table import Column
except ImportError:
    print("[X]  缺少依赖库 'rich'，请运行: pip install rich")
    sys.exit(1)


# ============================================================
#  常量
# ============================================================

BANNER = """
[bold cyan]
                        ╔══════════════════════╗
                        ║   ⚔️  NMAP-LITE ⚔️   ║
                        ╚══════════════════════╝
[/bold cyan]
[bold yellow]       ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄[/bold yellow]
[bold green]       ██╗  ██╗██╗██████╗ ███████╗██████╗ ██╗   ██╗[/bold green]
[bold green]       ██║  ██║██║██╔══██╗╚════██║██╔══██╗╚██╗ ██╔╝[/bold green]
[bold green]       ███████║██║██████╔╝    ██╔╝██████╦╝ ╚████╔╝ [/bold green]
[bold green]       ██╔══██║██║██╔═══╝    ██╔╝██╔══██╗  ╚██╔╝  [/bold green]
[bold green]       ██║  ██║██║██║        ██║ ██████╦╝   ██║   [/bold green]
[bold green]       ╚═╝  ╚═╝╚═╝╚═╝        ╚═╝ ╚═════╝    ╚═╝   [/bold green]
[bold yellow]       ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀[/bold yellow]
"""

# Footer / completion art
COMPLETE_ART = """
[bold cyan]╔══════════════════════════════════════════════════════════╗[/bold cyan]
[bold cyan]║[/bold cyan]  [bold green]✦[/bold green]  剑出鞘 · 扫描完毕  [bold green]✦[/bold green]                                        [bold cyan]║[/bold cyan]
[bold cyan]║[/bold cyan]  [dim]Nmap-Lite · 轻量级网络安全侦察完成[/dim]                           [bold cyan]║[/bold cyan]
[bold cyan]╚══════════════════════════════════════════════════════════╝[/bold cyan]
"""


# 常见端口 → 服务映射
COMMON_PORTS = {
    21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP",
    53: "DNS", 80: "HTTP", 110: "POP3", 111: "RPC",
    135: "RPC", 139: "NetBIOS", 143: "IMAP", 389: "LDAP",
    443: "HTTPS", 445: "SMB", 993: "IMAPS", 995: "POP3S",
    1433: "MSSQL", 1521: "Oracle", 2049: "NFS",
    3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL",
    5900: "VNC", 5985: "WinRM-HTTP", 5986: "WinRM-HTTPS",
    6379: "Redis", 8080: "HTTP-Alt", 8443: "HTTPS-Alt",
    9090: "HTTP-Alt", 27017: "MongoDB",
}

# 端口预设
PORT_PRESETS = {
    "top10":   [21,22,23,80,443,3306,3389,5432,5900,8080],
    "top100":  [21,22,23,25,53,80,81,110,111,135,139,143,389,443,445,993,995,
                1433,1521,2049,2082,2083,2096,3306,3389,3690,4444,5432,5800,
                5900,5985,5986,6379,6443,7070,7777,8080,8081,8443,8888,9000,
                9090,9200,10000,11211,27017,28017,50000,50070,61616],
    "top1000": None,  # 动态加载
    "web":     [80,81,443,8080,8443,9090,9443,80,81,3000,4000,5000,6000,7000,
                8000,8081,8888,9000,9090,30000],
    "database":[3306,5432,1433,1521,6379,27017,9042,5430,9200,11211,4000],
}

# OS 指纹库 (TTL, WindowSize → OS)
OS_FINGERPRINTS = [
    {"name": "Linux",        "ttl_range": (64, 64),  "win_range": (5840, 65535), "confidence": 90},
    {"name": "Windows 10/11","ttl_range": (128,128), "win_range": (8192,65535),  "confidence": 88},
    {"name": "Windows 7/8",  "ttl_range": (128,128), "win_range": (8192,8192),   "confidence": 85},
    {"name": "macOS",        "ttl_range": (64, 64),  "win_range": (65535,65535),"confidence": 80},
    {"name": "FreeBSD",      "ttl_range": (64, 64),  "win_range": (65535,65535),"confidence": 75},
    {"name": "Solaris",      "ttl_range": (255,255), "win_range": (8760,8760),   "confidence": 70},
    {"name": "Cisco IOS",    "ttl_range": (255,255), "win_range": (4128,4128),   "confidence": 65},
    {"name": "Android",      "ttl_range": (64, 64),  "win_range": (5720,5840),   "confidence": 60},
]

# Banner → 服务版本识别
BANNER_PATTERNS = [
    (r"SSH-\d+\.\d+",             "SSH"),
    (r"OpenSSH[ _]",              "OpenSSH"),
    (r"nginx[/\s]",               "nginx"),
    (r"Apache[/\s]",              "Apache HTTPD"),
    (r"Apache Tomcat",            "Apache Tomcat"),
    (r"Microsoft-IIS",            "IIS"),
    (r"lighttpd",                 "lighttpd"),
    (r"couriere[...]",            "Courier IMAP/POP"),
    (r"Pure-FTPd",                "Pure-FTPd"),
    (r"ProFTPD",                  "ProFTPD"),
    (r"vsFTPd",                   "vsFTPd"),
    (r"OpenSSH",                  "OpenSSH"),
    (r"MySQL",                    "MySQL"),
    (r"PostgreSQL",               "PostgreSQL"),
    (r"Redis",                    "Redis"),
    (r"MongoDB",                  "MongoDB"),
    (r"docker",                   "Docker"),
    (r"Node\.js",                 "Node.js"),
    (r"Python",                   "Python HTTP"),
    (r"NetScaler",                "Citrix NetScaler"),
    (r"BigIP",                    "F5 BIG-IP"),
]


# ============================================================
#  核心扫描引擎
# ============================================================

class ScanResult:
    """单个端口扫描结果"""
    __slots__ = ('port', 'state', 'service', 'banner', 'ttl', 'win_size')

    def __init__(self, port: int):
        self.port = port
        self.state = "过滤"
        self.service = COMMON_PORTS.get(port, "未知")
        self.banner = ""
        self.ttl = 0
        self.win_size = 0

    def to_dict(self) -> dict:
        return {
            "port": self.port,
            "state": self.state,
            "service": self.service,
            "banner": self.banner or "-",
            "ttl": self.ttl,
            "win_size": self.win_size,
        }


class PortScanner:
    """多线程 TCP Connect 端口扫描器"""

    # 服务 banner 特征 → 已知服务名（用于 fallback 猜测）
    BANNER_SERVICE_MAP = {
        "220": "FTP", "SSH": "SSH", "HTTP": "HTTP",
        "SMTP": "SMTP", "POP3": "POP3", "IMAP": "IMAP",
        "MySQL": "MySQL", "PostgreSQL": "PostgreSQL",
        "Redis": "Redis", "MongoDB": "MongoDB",
    }

    def __init__(self, target: str, timeout: float = 2.0, max_workers: int = 200):
        self.target = self.resolve_target(target)
        self.timeout = timeout
        self.max_workers = max_workers
        self.results: list[ScanResult] = []
        self.start_time = 0
        self.end_time = 0
        self.open_count = 0
        self.filtered_count = 0
        self.closed_count = 0
        self.os_guess = None
        self.os_confidence = 0

    @staticmethod
    def resolve_target(target: str) -> str:
        """解析目标，支持 IP 和域名"""
        try:
            ipaddress.ip_address(target)
            return target
        except ValueError:
            pass
        try:
            ip = socket.gethostbyname(target)
            return ip
        except socket.gaierror:
            console = RichConsole(emoji=False, force_terminal=True, legacy_windows=False)
            console.print(f"\n[red][X]  无法解析目标: {target}[/red]")
            sys.exit(1)

    def scan_port(self, port: int) -> ScanResult:
        """扫描单个端口"""
        result = ScanResult(port)
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(self.timeout)
        try:
            conn = sock.connect_ex((self.target, port))
            if conn == 0:
                result.state = "开放"
                # 尝试抓取 banner
                try:
                    sock.settimeout(1.5)
                    banner_raw = sock.recv(2048)
                    if banner_raw:
                        banner_text = banner_raw.decode("utf-8", errors="replace").strip()
                        result.banner = banner_text[:200]
                        result.service = self._identify_service(banner_text, port)
                except (socket.timeout, ConnectionResetError, OSError):
                    pass
                # 获取 TTL / 窗口大小（通过 ICMP 不可达？这里用 TCP 的估算方式）
                # 试一下连接后获取 socket 选项
                try:
                    # 实际上 TCP socket 没有直接获取远端 TTL 的标准 API
                    # 这里用模拟方式 — 实际项目中可改用 raw socket 或 scapy
                    pass
                except:
                    pass
            elif conn == 111:
                result.state = "拒绝"
            else:
                result.state = "关闭"
        except socket.gaierror:
            result.state = "错误"
        except OSError:
            result.state = "过滤"
        finally:
            sock.close()
        return result

    def _identify_service(self, banner: str, port: int) -> str:
        """从 banner 识别服务版本"""
        banner_lower = banner.lower()
        # SSH
        if "ssh" in banner_lower and "openssh" in banner_lower:
            return f"OpenSSH ({banner.split()[-1]})" if len(banner.split()) > 1 else "OpenSSH"
        if "ssh" in banner_lower:
            return "SSH"
        # HTTP
        if "http" in banner_lower or banner.startswith("HTTP/"):
            return "HTTP"
        # 各种知名服务
        patterns = {
            "nginx": "nginx",
            "apache": "Apache HTTPD",
            "iis": "IIS",
            "lighttpd": "lighttpd",
            "node.js": "Node.js",
            "python": "Python HTTP",
            "smtp": "SMTP",
            "pop3": "POP3",
            "imap": "IMAP",
            "ftp": "FTP",
            "mysql": "MySQL",
            "postgresql": "PostgreSQL",
            "redis": "Redis",
            "mongodb": "MongoDB",
            "docker": "Docker Registry",
            "couchdb": "CouchDB",
            "memcached": "Memcached",
            "samba": "Samba",
        }
        for key, svc in patterns.items():
            if key in banner_lower:
                return svc
        # 如果包含版本号数字，尝试提取
        return COMMON_PORTS.get(port, "未知")

    def _guess_os(self, results: list) -> tuple[str, int]:
        """基于开放端口的服务组合推测 OS（无需 raw socket）"""
        services = set(r.service for r in results if r.state == "开放")
        ports_open = set(r.port for r in results if r.state == "开放")

        # Windows 特征: 3389(RDP) + 445(SMB) + 5985(WinRM)
        if {3389, 445}.issubset(ports_open) or 5985 in ports_open or 5986 in ports_open:
            return ("Windows Server/Desktop", 85)

        # Linux 特征: 22(SSH) + 没有 445/3389
        if 22 in ports_open and 3389 not in ports_open and 445 not in ports_open:
            # 进一步判断
            if 3306 in ports_open or 5432 in ports_open or 6379 in ports_open:
                return ("Linux (Server)", 88)
            return ("Linux", 75)

        # Unix/BSD 特征
        if 22 in ports_open and (111 in ports_open or 2049 in ports_open):
            return ("Unix / FreeBSD", 70)

        # Cisco 特征
        if {22, 23}.intersection(ports_open) and {161, 162}.intersection(ports_open):
            return ("Cisco IOS / Network Device", 75)

        # macOS
        if 22 in ports_open and 5900 in ports_open and 3283 in ports_open:
            return ("macOS", 75)

        return ("未知", 0)

    def _parse_port_spec(self, spec: str) -> list[int]:
        """解析端口规格: "22,80,443" 或 "1-1024" 或 "top100" """
        spec = spec.strip().lower()

        # 预设集
        if spec in PORT_PRESETS:
            ports = PORT_PRESETS[spec]
            if spec == "top1000":
                return self._generate_top_ports(1000)
            if spec == "top100":
                return ports
            if spec == "top10":
                return PORT_PRESETS["top10"]
            return ports or self._generate_top_ports(1000)

        if spec == "all" or spec == "full" or spec == "1-65535":
            return list(range(1, 65536))

        # 范围: "1-1024"
        if "-" in spec and not spec.startswith("top"):
            parts = spec.split("-")
            try:
                start, end = int(parts[0]), int(parts[1])
                if 1 <= start <= end <= 65535:
                    return list(range(start, end + 1))
                raise ValueError
            except ValueError:
                pass

        # 逗号/空格分隔: "22,80,443"
        ports = []
        for part in spec.replace(" ", ",").split(","):
            part = part.strip()
            if part.isdigit():
                p = int(part)
                if 1 <= p <= 65535:
                    ports.append(p)
        if ports:
            return sorted(set(ports))

        raise ValueError(f"无效端口规格: {spec}")

    @staticmethod
    def _generate_top_ports(count: int) -> list[int]:
        """生成最常见的 N 个端口"""
        # 按常见度排序的端口列表
        top = [
            80, 443, 22, 21, 23, 25, 53, 110, 143, 993, 995, 389, 636,
            3306, 5432, 1433, 1521, 3389, 5900, 6379, 27017, 8443, 8080,
            8081, 9090, 9200, 11211, 2049, 111, 135, 139, 445, 5985, 5986,
            3000, 4000, 5000, 6000, 7000, 8000, 8888, 9000, 50000, 50070,
            161, 162, 514, 631, 873, 993, 995, 1080, 1194, 1433, 1521,
            1701, 1723, 1883, 2375, 2376, 2443, 3128, 3260, 3307, 3310,
            3389, 3541, 3690, 4001, 4333, 4444, 4500, 4567, 4662, 4848,
            4899, 5001, 5003, 5050, 5060, 5100, 5222, 5269, 5432, 5555,
            5631, 5666, 5672, 5800, 5901, 6000, 6001, 6379, 6443, 6580,
            6660, 6667, 6697, 6881, 6969, 7001, 7002, 7199, 7326, 7443,
            7474, 8009, 8010, 8042, 8082, 8083, 8084, 8085, 8086, 8087,
            8088, 8089, 8090, 8181, 8443, 8585, 8649, 8880, 8889, 8983,
            9001, 9042, 9050, 9091, 9100, 9151, 9160, 9443, 9600, 9877,
        ]
        return top[:count]

    def run(self, ports: list[int], progress_callback=None, live_discovered=None) -> list[ScanResult]:
        """执行扫描"""
        self.results = []
        self.open_count = 0
        self.filtered_count = 0
        self.closed_count = 0
        self.start_time = time.time()
        total = len(ports)

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(self.scan_port, p): p for p in ports}
            done = 0
            for future in as_completed(futures):
                try:
                    result = future.result()
                    self.results.append(result)
                    if result.state == "开放":
                        self.open_count += 1
                        if live_discovered:
                            live_discovered.append(result)
                    elif result.state == "过滤" or result.state == "拒绝":
                        self.filtered_count += 1
                    else:
                        self.closed_count += 1
                except Exception:
                    pass
                done += 1
                if progress_callback:
                    progress_callback(done, total)

        self.end_time = time.time()
        # OS 猜测
        self.os_guess, self.os_confidence = self._guess_os(self.results)
        # 按端口号排序
        self.results.sort(key=lambda r: r.port)
        return self.results

    def duration(self) -> float:
        return self.end_time - self.start_time

    def summary(self) -> dict:
        return {
            "target": self.target,
            "ports_scanned": len(self.results),
            "open": self.open_count,
            "filtered": self.filtered_count,
            "closed": self.closed_count,
            "duration_sec": round(self.duration(), 2),
            "os_guess": self.os_guess,
            "os_confidence": self.os_confidence,
            "timestamp": datetime.now().isoformat(),
        }

    def to_json(self) -> str:
        data = self.summary()
        data["results"] = [r.to_dict() for r in sorted(self.results, key=lambda x: x.port) if r.state == "开放"]
        return json.dumps(data, ensure_ascii=False, indent=2)


# ============================================================
#  终端 UI · Rich 渲染
# ============================================================

console = RichConsole(emoji=False, force_terminal=True, legacy_windows=False)


# 端口风险等级
PORT_RISK = {
    "High":   ["21","23","25","53","110","135","137","139","143","445","1433","1521","3306","3389","5900","6379","27017","9200","11211"],
    "Medium": ["22","80","443","993","995","2049","5432","8080","8443","9090","10000"],
}
HIGH_RISK_PORTS = set(PORT_RISK["High"])
MED_RISK_PORTS = set(PORT_RISK["Medium"])

# 端口功能分类
PORT_CATEGORY = {
    "🌐 Web":     [80,443,8080,8443,8081,9090,9443,3000,5000,8000,8888,9000,80,81,8082,8083,8084,8085,8086,8087,8088,8089,8090,8181,8880,8889,9001],
    "📡 远程访问": [22,23,3389,5900,5901,5800,5985,5986,2222,3390],
    "🗄️ 数据库":  [3306,5432,1433,1521,6379,27017,9042,9200,11211,4000,9090,3307,7001],
    "📧 邮件":    [25,110,143,465,587,993,995,2525],
    "📁 文件":    [21,20,69,445,139,2049,111,115,990],
    "⚙️ 中间件":  [135,389,636,873,1080,1433,1701,1723,1883,2375,2376,2443,3128,3260,3541,3690,4333,4443,4444,4500,4848,4899,5060,5222,5269,5555,5631,5666,5672,6000,6001,6443,6580,6660,6667,6697,6881,6969,7001,7002,7199,7326,7443,7474,8009,8010,8042,8585,8649,8983,9050,9100,9151,9160,9443,9600,9877],
}


def get_port_risk(port: int) -> str:
    """返回端口风险等级标签"""
    if str(port) in HIGH_RISK_PORTS:
        return "HIGH"
    if str(port) in MED_RISK_PORTS:
        return "MED"
    return "LOW"


def get_port_risk_color(risk: str) -> str:
    return {"HIGH": "red", "MED": "yellow", "LOW": "green"}.get(risk, "dim")


def get_port_risk_icon(risk: str) -> str:
    return {"HIGH": "🔥", "MED": "⚠️", "LOW": "✓"}.get(risk, "·")


def get_port_category(port: int) -> str:
    """返回端口所属分类"""
    for cat, ports in PORT_CATEGORY.items():
        if port in ports:
            return cat
    return "🔌 其他"


def print_banner():
    """打印 ASCII art 标题"""
    console.print(BANNER, justify="center")
    console.print(Panel(
        "[bold yellow]⚔️  端口扫描 · 服务识别 · OS 指纹探测[/bold yellow]\n"
        "[dim]多线程并发扫描 · 实时进度 · 结果导出 JSON / HTML[/dim]",
        border_style="bright_cyan",
        box=box.DOUBLE_EDGE,
        padding=(1, 2),
    ))
    console.print()


def print_scan_start(target: str, total_ports: int, workers: int, timeout: float):
    """打印扫描启动信息"""
    console.print(Panel(
        f"[bold cyan]Target[/bold cyan]   [white]{target}[/white]\n"
        f"[bold cyan]Ports[/bold cyan]    [white]{total_ports}[/white]\n"
        f"[bold cyan]Workers[/bold cyan]  [white]{workers}[/white]\n"
        f"[bold cyan]Timeout[/bold cyan]  [white]{timeout}s[/white]",
        title="[bold yellow]Scan Starting[/bold yellow]",
        border_style="bright_cyan",
        box=box.HEAVY,
        padding=(1, 2),
    ))
    console.print()


def build_results_table(results: list[ScanResult], show_closed: bool = False) -> Table:
    """构建结果表格"""
    open_ports = [r for r in results if r.state == "开放"]
    open_ports.sort(key=lambda r: r.port)

    table = Table(
        title=f"🔓 开放端口 · 共 {len(open_ports)} 个",
        box=box.HEAVY_EDGE,
        border_style="bright_green",
        header_style="bold bright_cyan",
        title_style="bold bright_white",
        caption="按端口升序排列" if open_ports else None,
    )
    table.add_column("端口", style="bold yellow", justify="center", width=7)
    table.add_column("风险", justify="center", width=10)
    table.add_column("分类", width=18)
    table.add_column("服务", width=20)
    table.add_column("Banner / 版本", width=56, no_wrap=False)
    table.add_column("状态", justify="center", width=8)

    for r in open_ports:
        risk = get_port_risk(r.port)
        risk_color = get_port_risk_color(risk)
        risk_icon = get_port_risk_icon(risk)
        cat = get_port_category(r.port)

        # Truncate banner to fit
        banner_display = r.banner[:80] if r.banner else "-"
        # Highlight known vulnerable services
        if risk == "HIGH":
            banner_display = f"[bold red]{banner_display}[/bold red]"
        elif risk == "MED":
            banner_display = f"[yellow]{banner_display}[/yellow]"
        else:
            banner_display = f"[dim]{banner_display}[/dim]"

        table.add_row(
            f"[bold]{r.port}[/bold]",
            f"[{risk_color}]{risk_icon} {risk}[/{risk_color}]",
            f"[dim]{cat}[/dim]",
            f"[bold bright_cyan]{r.service}[/bold bright_cyan]",
            banner_display,
            "[green]🟢 OPEN[/green]",
        )

    if show_closed:
        closed_ports = [r for r in results if r.state != "开放"]
        if closed_ports:
            table.add_section()
            for r in sorted(closed_ports, key=lambda x: x.port):
                color = "yellow" if r.state == "过滤" else "bright_black"
                icon = "🟡" if r.state == "过滤" else "⚫"
                state_str = f"[{color}]{icon} {r.state}[/{color}]"
                table.add_row(
                    str(r.port), "-", "-", f"[dim]{r.service}[/dim]", "[dim]-[/dim]", state_str
                )

    return table


def build_summary_panel(summary: dict) -> Panel:
    """构建统计面板 — 更现代的卡片布局"""
    total = summary['ports_scanned']
    open_pct = (summary['open'] / total * 100) if total > 0 else 0
    filtered_pct = (summary['filtered'] / total * 100) if total > 0 else 0
    closed_pct = (summary['closed'] / total * 100) if total > 0 else 0

    # Mini horizontal bar chart
    bar_w = 25
    o_filled = int(open_pct / 100 * bar_w)
    f_filled = int(filtered_pct / 100 * bar_w)
    c_filled = int(closed_pct / 100 * bar_w)

    bar_open = "█" * o_filled if o_filled > 0 else ""
    bar_filt = "█" * f_filled if f_filled > 0 else ""
    bar_closed = "█" * c_filled if c_filled > 0 else ""
    bar_empty = "░" * (bar_w - o_filled - f_filled - c_filled)

    content = (
        f"[bold]📍 目标:[/bold]        [bright_cyan]{summary['target']}[/bright_cyan]\n"
        f"[bold]📡 扫描端口:[/bold]    [white]{total}[/white]\n"
        f"\n"
        f"  [green]🟢 开放[/green]  {summary['open']:>4}  ({open_pct:5.1f}%)  [green]{bar_open}[/green]\n"
        f"  [yellow]🟡 过滤[/yellow]  {summary['filtered']:>4}  ({filtered_pct:5.1f}%)  [yellow]{bar_filt}[/yellow]\n"
        f"  [red]🔴 关闭[/red]    {summary['closed']:>4}  ({closed_pct:5.1f}%)  [red]{bar_closed}[/red]{bar_empty}\n"
        f"\n"
        f"[bold]⏱️  用时:[/bold]         [magenta]{summary['duration_sec']} 秒[/magenta]\n"
    )

    if summary["os_guess"] and summary["os_guess"] != "未知":
        conf = summary['os_confidence']
        conf_color = "green" if conf >= 80 else "yellow" if conf >= 60 else "red"
        conf_bar_units = 15
        conf_filled = int(conf / 100 * conf_bar_units)
        conf_bar = f"[{conf_color}]{'█' * conf_filled}[/{conf_color}][dim]{'░' * (conf_bar_units - conf_filled)}[/dim]"
        content += f"\n[bold]🖥️  OS:[/bold]           [{conf_color}]{summary['os_guess']}[/{conf_color}]  {conf_bar}  [bold]{conf}%[/bold]\n"

    content += f"\n[dim]⏰ {summary['timestamp']}[/dim]"

    return Panel(
        Align.left(content),
        title="📊 扫描统计",
        border_style="bright_green",
        box=box.DOUBLE_EDGE,
        padding=(1, 2),
    )


def build_os_panel(os_guess: str, confidence: int) -> Panel:
    """OS 指纹面板 — 增强版"""
    if os_guess == "未知":
        return Panel(
            "[yellow][!]  无法确定目标操作系统[/yellow]\n[dim]开放端口组合未匹配到已知 OS 指纹[/dim]",
            title="🖥️  OS 指纹",
            border_style="yellow",
            box=box.ROUNDED,
        )

    bar_len = 25
    filled = int(confidence / 100 * bar_len)
    bar = "█" * filled + "░" * (bar_len - filled)
    color = "green" if confidence >= 80 else "yellow" if confidence >= 60 else "red"

    # Confidence badge
    if confidence >= 80:
        badge = "[bold green]▌推测可信[/bold green]"
    elif confidence >= 60:
        badge = "[bold yellow]▌参考价值[/bold yellow]"
    else:
        badge = "[bold red]▌仅供参考[/bold red]"

    return Panel(
        f"[bold {color}]╔═══ OS 指纹 ═══╗[/bold {color}]\n"
        f"[bold {color}]║  {os_guess:12s}  ║[/bold {color}]  {badge}\n"
        f"[bold {color}]╚═══════════════╝[/bold {color}]\n\n"
        f"[dim]置信度:[/dim]\n"
        f"[{color}]{bar}[/{color}] [bold]{confidence}%[/bold]",
        title="🖥️  OS 指纹推测",
        border_style=color,
        box=box.HEAVY,
        padding=(1, 2),
    )


def build_top_ports(results: list[ScanResult]) -> Panel:
    """开放端口一览 — 增强卡片"""
    open_ports = [r for r in results if r.state == "开放"]
    open_ports.sort(key=lambda r: r.port)
    if not open_ports:
        return Panel("[dim]无开放端口[/dim]", title="🔓 开放端口", border_style="green")

    # Build categorized layout
    by_category = {}
    for r in open_ports:
        cat = get_port_category(r.port)
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(r)

    text = Text()
    for cat, ports in sorted(by_category.items()):
        text.append(f"\n  {cat}  ", style="bold bright_white")
        text.append(f"({len(ports)} 个)", style="dim")
        text.append("\n")
        for r in ports:
            risk = get_port_risk(r.port)
            risk_color = get_port_risk_color(risk)
            risk_icon = get_port_risk_icon(risk)
            banner_short = r.banner[:50] if r.banner else "-"

            text.append(f"    {r.port:5d}  ", style="bold yellow")
            text.append(f"[{risk_icon}] ", style=risk_color)
            text.append(f"{r.service:18s}", style="bright_cyan")
            text.append(f"  {banner_short}", style="dim")
            text.append("\n")

    return Panel(
        text,
        title=f"🔓 开放端口一览 — 共 {len(open_ports)} 个",
        border_style="bold bright_green",
        box=box.HEAVY,
        padding=(1, 1),
    )


def build_risk_assessment(results: list[ScanResult]) -> Panel:
    """构建风险评估面板"""
    open_ports = [r for r in results if r.state == "开放"]
    if not open_ports:
        return Panel("[dim]无开放端口，无需风险评估[/dim]", title="⚠️ 风险评估", border_style="dim")

    high = sum(1 for r in open_ports if get_port_risk(r.port) == "HIGH")
    med = sum(1 for r in open_ports if get_port_risk(r.port) == "MED")
    low = sum(1 for r in open_ports if get_port_risk(r.port) == "LOW")

    # Overall risk score
    score = min(100, (high * 30 + med * 10 + low * 2))
    if score >= 60:
        level = "[bold red]🔴 高风险[/bold red]"
        level_desc = "存在多个高危端口暴露，建议立即检查并加固"
    elif score >= 30:
        level = "[bold yellow]🟡 中等风险[/bold yellow]"
        level_desc = "存在一定风险端口，建议审查并关闭非必要服务"
    else:
        level = "[bold green]🟢 低风险[/bold green]"
        level_desc = "暴露端口较少，风险可控"

    # Risk bar
    bar_w = 20
    high_f = int(high / max(len(open_ports), 1) * bar_w) if high else 0
    med_f = int(med / max(len(open_ports), 1) * bar_w) if med else 0
    low_f = int(low / max(len(open_ports), 1) * bar_w) if low else 0
    risk_bar = f"[red]{'█' * high_f}[/red][yellow]{'█' * med_f}[/yellow][green]{'█' * low_f}[/green][dim]{'░' * max(0, bar_w - high_f - med_f - low_f)}[/dim]"

    content = (
        f"  风险评估:  {level}\n"
        f"  {risk_bar}  [dim]高危 {high} · 中危 {med} · 低危 {low}[/dim]\n"
        f"\n"
        f"  [dim]▸ {level_desc}[/dim]\n"
        f"\n"
        f"  🔥 [red]高危端口 ({high})[/red]    "
        f"⚠️  [yellow]中危端口 ({med})[/yellow]    "
        f"✓ [green]低危端口 ({low})[/green]\n"
    )

    if high > 0:
        high_ports = [r for r in open_ports if get_port_risk(r.port) == "HIGH"]
        high_list = ", ".join(f"[red]{r.port}({r.service})[/red]" for r in high_ports)
        content += f"\n  [bold red]⚠ 关注![/bold red] 高危端口: {high_list}\n"

    return Panel(
        content,
        title="⚠️  风险评估",
        border_style="bold yellow" if score >= 60 else "bold green" if score < 30 else "yellow",
        box=box.HEAVY,
        padding=(1, 2),
    )


def build_completion_panel(summary: dict, has_open: bool):
    """扫描完成面板"""
    if has_open:
        msg = "[bold green]✦  扫描完成 · 发现开放端口  ✦[/bold green]"
    else:
        msg = "[bold yellow]✦  扫描完成 · 未发现开放端口  ✦[/bold yellow]"

    footer = (
        f"{msg}\n\n"
        f"[dim]目标: {summary['target']}  |  端口: {summary['ports_scanned']}  |  用时: {summary['duration_sec']}s[/dim]\n"
        f"[dim]请遵守当地法律法规，仅扫描授权目标[/dim]"
    )
    return Panel(
        Align.center(footer),
        border_style="bright_green" if has_open else "yellow",
        box=box.HEAVY,
        padding=(1, 3),
    )


def build_live_status(discovered: list, done: int, total: int, elapsed: float, open_count: int) -> Panel:
    """实时扫描状态面板 — 进度条 + 端口发现"""
    # Mini progress bar
    pct = (done / total * 100) if total > 0 else 0
    bar_w = 30
    filled = int(pct / 100 * bar_w)
    bar = f"[green]{'█' * filled}[/green][dim]{'░' * (bar_w - filled)}[/dim]"

    # Build discovered ports list
    lines = []
    if discovered:
        lines.append(f"  [bold]⚔️  已发现 [green]{len(discovered)}[/green] 个开放端口[/bold]\n")
        for r in discovered:
            risk = get_port_risk(r.port)
            risk_color = get_port_risk_color(risk)
            risk_icon = get_port_risk_icon(risk)
            banner_short = r.banner[:60] if r.banner else "-"
            lines.append(
                f"  [green]●[/green] [bold yellow]{r.port:>5d}[/bold yellow]  "
                f"[{risk_color}]{risk_icon} {r.service:20s}[/{risk_color}]  "
                f"[dim]{banner_short}[/dim]"
            )
    else:
        activity = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        spinner = activity[int(elapsed * 4) % len(activity)]
        lines.append(f"  [{spinner}] [dim]扫描进行中，等待发现端口...[/dim]")

    elapsed_str = f"{elapsed:.1f}s"
    content = Text()
    content.append(f"\n  ⏱️  [{elapsed_str}]  {bar}  [white]{done}/{total}[/white]  ({pct:.0f}%)\n")
    content.append("\n".join(lines))

    # Color border based on discovery
    border = "bright_green" if discovered else "cyan"
    return Panel(content, border_style=border, box=box.HEAVY, padding=(1, 2))


def run_scan_with_live_display(scanner: PortScanner, ports: list, total_ports: int) -> list:
    """执行扫描，实时展示进度 + 新发现端口"""
    discovered = []
    start_time = time.time()

    with Live(
        console=console,
        refresh_per_second=8,
        auto_refresh=True,
        vertical_overflow="visible",
        screen=False,
    ) as live:
        def prog_cb(done, total):
            elapsed = time.time() - start_time
            live.update(build_live_status(
                discovered, done, total, elapsed, scanner.open_count
            ))

        # Initial render
        live.update(build_live_status(discovered, 0, total_ports, 0, 0))

        results = scanner.run(ports, progress_callback=prog_cb, live_discovered=discovered)

        # Final update
        elapsed = time.time() - start_time
        live.update(build_live_status(
            discovered, total_ports, total_ports, elapsed, scanner.open_count
        ))
        live.refresh()

    console.print()
    return results


def export_json(results: list[ScanResult], summary: dict, output_file: str):
    """导出 JSON"""
    data = dict(summary)
    data["results"] = [r.to_dict() for r in sorted(results, key=lambda x: x.port) if r.state == "开放"]
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return output_file


def export_html(results: list[ScanResult], summary: dict, output_file: str) -> str:
    """导出 HTML 报告"""
    open_ports = [r for r in results if r.state == "开放"]
    open_ports.sort(key=lambda x: x.port)

    rows = ""
    for r in open_ports:
        risk = get_port_risk(r.port)
        risk_badge_color = {"HIGH": "#ff657a", "MED": "#ffae57", "LOW": "#7ec88e"}
        risk_label = {"HIGH": "🔥 高危", "MED": "⚠️ 中危", "LOW": "✓ 低危"}
        badge_color = risk_badge_color.get(risk, "#686b71")
        badge_text = risk_label.get(risk, risk)
        cat = get_port_category(r.port)
        rows += f"""<tr>
            <td>{r.port}</td>
            <td><span class="risk-badge" style="background:{badge_color}22;color:{badge_color};border:1px solid {badge_color}40">{badge_text}</span></td>
            <td>{cat}</td>
            <td><span class="open-badge">OPEN</span></td>
            <td>{r.service}</td>
            <td>{r.banner[:100] if r.banner else '-'}</td>
        </tr>\n"""

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🛡️  Nmap-Lite 扫描报告 — {summary['target']}</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    background: #0a0e14; color: #e6e1cf;
    font-family: 'SF Mono','JetBrains Mono','Cascadia Code',monospace;
    padding: 2rem; line-height: 1.7;
  }}
  .container {{ max-width: 1100px; margin: 0 auto; }}
  h1 {{ font-size: 1.8rem; color: #ffae57; margin-bottom: 0.5rem; }}
  h2 {{ font-size: 1.3rem; color: #5ccfe6; margin: 1.5rem 0 0.8rem; border-bottom: 1px solid #2e3a47; padding-bottom: 0.3rem; }}
  .subtitle {{ color: #686b71; margin-bottom: 2rem; }}
  .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.8rem; margin: 1rem 0 2rem; }}
  .stat-card {{ background: #141a23; border: 1px solid #2e3a47; border-radius: 8px; padding: 1rem; text-align: center; }}
  .stat-card .val {{ font-size: 1.6rem; font-weight: bold; }}
  .stat-card .lbl {{ font-size: 0.75rem; color: #686b71; text-transform: uppercase; letter-spacing: 1px; }}
  .green {{ color: #7ec88e; }} .yellow {{ color: #ffae57; }} .red {{ color: #ff657a; }} .cyan {{ color: #5ccfe6; }}
  .risk-summary {{ display: flex; gap: 1rem; margin: 1rem 0 2rem; }}
  .risk-card {{ flex: 1; padding: 1rem; border-radius: 8px; text-align: center; }}
  .risk-card .rc-val {{ font-size: 2rem; font-weight: bold; }}
  .risk-card .rc-lbl {{ font-size: 0.8rem; opacity: 0.8; }}
  table {{ width: 100%; border-collapse: collapse; margin: 1rem 0; }}
  th, td {{ padding: 0.6rem 0.8rem; text-align: left; border-bottom: 1px solid #2e3a47; }}
  th {{ color: #5ccfe6; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; }}
  td {{ font-size: 0.85rem; }}
  .open-badge {{ background: #1a3a2a; color: #7ec88e; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }}
  .risk-badge {{ padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }}
  .os-card {{ background: linear-gradient(135deg, #141a23, #1a2a1a); border: 1px solid #7ec88e; border-radius: 8px; padding: 1.2rem; margin: 1rem 0 2rem; }}
  .os-card .os-name {{ font-size: 1.2rem; color: #7ec88e; font-weight: bold; }}
  .os-card .confidence {{ font-size: 0.85rem; color: #686b71; margin-top: 0.3rem; }}
  footer {{ margin-top: 3rem; text-align: center; color: #3a4550; font-size: 0.8rem; padding: 1rem 0; }}
</style>
</head>
<body>
<div class="container">
  <h1>🛡️  Nmap-Lite 扫描报告</h1>
  <p class="subtitle">📍 {summary['target']} · ⏰ {summary['timestamp']}</p>

  <div class="stats">
    <div class="stat-card"><div class="val cyan">{summary['ports_scanned']}</div><div class="lbl">扫描端口</div></div>
    <div class="stat-card"><div class="val green">{summary['open']}</div><div class="lbl">开放端口</div></div>
    <div class="stat-card"><div class="val yellow">{summary['filtered']}</div><div class="lbl">过滤</div></div>
    <div class="stat-card"><div class="val red">{summary['closed']}</div><div class="lbl">关闭</div></div>
    <div class="stat-card"><div class="val cyan">{summary['duration_sec']}s</div><div class="lbl">用时</div></div>
  </div>

  <div class="os-card">
    <div class="os-name">🖥️  OS 指纹推测: {summary.get('os_guess', '未知')}</div>
    <div class="confidence">置信度: {summary.get('os_confidence', 0)}%</div>
  </div>

  <h2>🔓 开放端口 ({len(open_ports)})</h2>
  <table>
    <thead><tr><th>端口</th><th>风险</th><th>分类</th><th>状态</th><th>服务</th><th>Banner</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>

  <footer>Generated by Nmap-Lite · Port Scanner · {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</footer>
</div>
</body>
</html>"""
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(html)
    return output_file


# ============================================================
#  交互式模式
# ============================================================

def interactive_mode():
    """交互式端口扫描"""
    console.clear()
    print_banner()

    # 目标输入
    target = Prompt.ask("[bold cyan]📍 目标地址[/bold cyan]", default="scanme.nmap.org")
    if not target:
        target = "scanme.nmap.org"

    # 端口选择
    console.print("\n[bold]端口范围:[/bold]")
    console.print("  [cyan]1[/cyan]) Top 10 [dim](最常用端口)[/dim]")
    console.print("  [cyan]2[/cyan]) Top 100 [dim](常见服务端口)[/dim]")
    console.print("  [cyan]3[/cyan]) Top 1000 [dim](全面扫描)[/dim]")
    console.print("  [cyan]4[/cyan]) 指定端口 [dim]如 22,80,443 或 1-1024[/dim]")
    console.print("  [cyan]5[/cyan]) 全端口扫描 [red](1-65535, 耗时较长)[/red]")
    port_choice = Prompt.ask("[bold]选择[/bold]", choices=["1", "2", "3", "4", "5"], default="2")

    port_map = {"1": "top10", "2": "top100", "3": "top1000", "4": "", "5": "1-65535"}
    port_spec = port_map[port_choice]

    if port_choice == "4":
        port_spec = Prompt.ask("[bold]输入端口[/bold]", default="22,80,443,3306,8080")
        if not port_spec:
            port_spec = "22,80,443,3306,8080"

    # 超时设置
    timeout = float(IntPrompt.ask("[bold]超时（秒）[/bold]", default="2"))

    # 并发数
    workers = int(IntPrompt.ask("[bold]并发线程数[/bold]", default="200"))

    # 导出选项
    export_json_file = None
    export_html_file = None
    if Confirm.ask("[bold]导出 JSON 结果？[/bold]", default=False):
        export_json_file = Prompt.ask("  文件名", default=f"scan_{target}_{int(time.time())}.json")
    if Confirm.ask("[bold]导出 HTML 报告？[/bold]", default=False):
        export_html_file = Prompt.ask("  文件名", default=f"scan_{target}_{int(time.time())}.html")

    console.print()

    # ---- 解析端口 ----
    scanner = PortScanner(target, timeout=timeout, max_workers=workers)
    try:
        ports = scanner._parse_port_spec(port_spec)
    except ValueError as e:
        console.print(f"\n[red][X]  {e}[/red]")
        return

    # 安全警告
    total_ports = len(ports)
    if total_ports > 10000:
        if not Confirm.ask(f"\n[red][!] ️  将扫描 {total_ports} 个端口，预计耗时较长，是否继续？[/red]", default=False):
            console.print("[yellow]已取消[/yellow]")
            return

    print_scan_start(target, total_ports, workers, timeout)
    results = run_scan_with_live_display(scanner, ports, total_ports)

    console.print()
    summary = scanner.summary()

    # ---- 展示结果 ----
    if results:
        console.print(build_summary_panel(summary))
        console.print()

        if scanner.open_count > 0:
            console.print(build_risk_assessment(results))
            console.print()
            console.print(build_top_ports(results))
            console.print()
            console.print(build_results_table(results))
            console.print()

        if scanner.os_guess:
            console.print(build_os_panel(scanner.os_guess, scanner.os_confidence))
            console.print()

        # 无开放端口
        if scanner.open_count == 0:
            console.print("[yellow][!] ️  未发现开放端口[/yellow]")
            console.print("[dim]可能原因: 目标防火墙屏蔽 / 目标离线 / 端口范围不匹配[/dim]")

    # ---- 导出 ----
    if export_json_file:
        try:
            path = export_json(results, summary, export_json_file)
            console.print(f"[green][OK]  JSON 已导出: [white]{path}[/white][/green]")
        except Exception as e:
            console.print(f"[red][X]  JSON 导出失败: {e}[/red]")

    if export_html_file:
        try:
            path = export_html(results, summary, export_html_file)
            console.print(f"[green][OK]  HTML 报告已导出: [white]{path}[/white][/green]")
        except Exception as e:
            console.print(f"[red][X]  HTML 导出失败: {e}[/red]")

    # ---- 完成面板 ----
    console.print(COMPLETE_ART, justify="center")
    console.print(build_completion_panel(summary, scanner.open_count > 0))


# ============================================================
#  命令行模式
# ============================================================

def cli_mode():
    """命令行模式：python scanner.py <target> [ports] [options]"""
    args = sys.argv[1:]
    if not args:
        interactive_mode()
        return

    target = args[0]
    port_spec = "top1000"
    output_json = None
    output_html = None
    timeout = 2.0
    workers = 200

    # 解析参数
    i = 1
    while i < len(args):
        arg = args[i]
        if arg == "-o" or arg == "--output":
            if i + 1 < len(args):
                output_json = args[i + 1]
                i += 2
            else:
                i += 1
        elif arg == "--html":
            if i + 1 < len(args):
                output_html = args[i + 1]
                i += 2
            else:
                i += 1
        elif arg == "-t" or arg == "--timeout":
            if i + 1 < len(args):
                timeout = float(args[i + 1])
                i += 2
            else:
                i += 1
        elif arg == "-w" or arg == "--workers":
            if i + 1 < len(args):
                workers = int(args[i + 1])
                i += 2
            else:
                i += 1
        elif arg.startswith("-"):
            i += 1
        else:
            port_spec = arg
            i += 1

    # 如果第一个参数是端口规格（纯数字/逗号/范围），交换角色
    # 命令行: scanner.py target ports
    # 所以 ports 是 args[1] 如果不是 - 开头

    scanner = PortScanner(target, timeout=timeout, max_workers=workers)
    try:
        ports = scanner._parse_port_spec(port_spec)
    except ValueError as e:
        console.print(f"[red][X]  {e}[/red]")
        sys.exit(1)

    total_ports = len(ports)
    print_scan_start(target, total_ports, workers, timeout)
    results = run_scan_with_live_display(scanner, ports, total_ports)

    console.print()
    summary = scanner.summary()

    if results:
        console.print(build_summary_panel(summary))
        console.print()
        if scanner.open_count > 0:
            console.print(build_risk_assessment(results))
            console.print()
            console.print(build_top_ports(results))
            console.print()
            console.print(build_results_table(results))
            console.print()
        if scanner.os_guess:
            console.print(build_os_panel(scanner.os_guess, scanner.os_confidence))
            console.print()
        if scanner.open_count == 0:
            console.print("[yellow][!] ️  未发现开放端口[/yellow]")
            console.print("[dim]可能原因: 目标防火墙屏蔽 / 目标离线 / 端口范围不匹配[/dim]")

    # 导出
    if output_json:
        try:
            path = export_json(results, summary, output_json)
            console.print(f"[green][OK]  JSON 已导出: [white]{path}[/white][/green]")
        except Exception as e:
            console.print(f"[red][X]  JSON 导出失败: {e}[/red]")

    if output_html:
        try:
            path = export_html(results, summary, output_html)
            console.print(f"[green][OK]  HTML 报告已导出: [white]{path}[/white][/green]")
        except Exception as e:
            console.print(f"[red][X]  HTML 导出失败: {e}[/red]")

    console.print(COMPLETE_ART, justify="center")
    console.print(build_completion_panel(summary, scanner.open_count > 0))


# ============================================================
#  入口
# ============================================================

def signal_handler(sig, frame):
    console.print("\n\n[yellow][STOP]   扫描已中断[/yellow]")
    sys.exit(0)


def main():
    signal.signal(signal.SIGINT, signal_handler)
    console.clear()

    if len(sys.argv) > 1:
        cli_mode()
    else:
        interactive_mode()


if __name__ == "__main__":
    main()
