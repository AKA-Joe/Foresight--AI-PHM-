#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════╗
║   🛡️  CyberEye · 网络侦察与可视化情报系统                ║
║   轻量级网络安全情报采集与分析平台                         ║
╚══════════════════════════════════════════════════════════╝

功能：
  • 🌐 IP/域名 Geolocation 地理定位（含世界地图标注）
  • 📡 DNS 记录枚举（A/AAAA/MX/TXT/NS/CNAME/SOA）
  • 🔍 WHOIS 精简查询
  • 🗺️  Traceroute 路由拓扑追踪（可视化）
  • 🔓 常见端口快速探测（TOP20）
  • 📊 安全风险评估
  • 📈 HTML 报告导出（含 ASCII 世界地图）

用法：
  python cybereye.py                    # 交互式菜单
  python cybereye.py example.com        # 快速侦察
  python cybereye.py 8.8.8.8            # IP 侦察
  python cybereye.py example.com --html report.html  # 导出报告

依赖：
  pip install rich requests
"""

import sys
import json
import time
import socket
import subprocess
import os
import re
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import StringIO

try:
    from rich.console import Console as RichConsole
    from rich.table import Table
    from rich.panel import Panel
    from rich.layout import Layout
    from rich.live import Live
    from rich.progress import (
        Progress, SpinnerColumn, BarColumn, TextColumn,
        TimeElapsedColumn, TaskID
    )
    from rich.text import Text
    from rich import box
    from rich.prompt import Prompt, IntPrompt, Confirm
    from rich.align import Align
    from rich.columns import Columns
    from rich.syntax import Syntax
    from rich.rule import Rule
except ImportError:
    print("[X] 缺少依赖库 'rich'，请运行: pip install rich")
    sys.exit(1)

# Windows UTF-8 compat
if sys.platform == "win32":
    import io
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='replace')
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

console = RichConsole(emoji=False, force_terminal=True, legacy_windows=False)

# ============================================================
#  ASCII World Map Data (simplified coordinate grid)
# ============================================================

WORLD_MAP_ASCII = """
                   🌍  TARGET LOCATION

     0°    60°E   120°E   180°   120°W   60°W    0°
   +-------+-------+-------+-------+-------+-------+
75N|   ██  |       |       |       |       |  ██   |75N
   |   ██  |       |       |       |       |  ██   |
60N| █████ |       |   ██  |   ██  |   ██  |█████  |60N
   | █████ |       |   ██  |   ██  |   ██  |█████  |
45N|███████|  ██   |███████|███████|███████|███████ |45N
   |███████|  ██   |███████|███████|███████|███████ |
30N|███████|███████|███████|███████|███████|███████ |30N
   |███████|███████|███████|███████|███████|███████ |
15N|███████|███████|███████|███████|███████|███████ |15N
   |███████|███████|███████|███████|███████|███████ |
 0N|███████|███████|███████|███████|███████|███████ |0N
   |███████|███████|███████|███████|███████|███████ |
15S|███████|███████|   ██  |███████|███████|███████ |15S
   |███████|███████|   ██  |███████|███████|███████ |
30S|███████|  ██   |       |███████|███████|███████ |30S
   |███████|  ██   |       |███████|███████|███████ |
45S|  ██   |       |       |  ██   |  ██   |  ██   |45S
   |  ██   |       |       |  ██   |  ██   |  ██   |
60S|  ██   |       |       |       |       |  ██   |60S
   +-------+-------+-------+-------+-------+-------+
     0°    60°E   120°E   180°   120°W   60°W    0°
"""

BANNER = """
[bold cyan]
  ██████╗██╗   ██╗██████╗ ███████╗██████╗ ███████╗██╗   ██╗███████╗
 ██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗██╔════╝╚██╗ ██╔╝██╔════╝
 ██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝█████╗   ╚████╔╝ █████╗
 ██║       ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗██╔══╝    ╚██╔╝  ██╔══╝
 ╚██████╗   ██║   ██████╔╝███████╗██║  ██║███████╗   ██║   ███████╗
  ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝
[/bold cyan]
[bold yellow]🛡️  Network Reconnaissance & Intelligence Platform[/bold yellow]
"""

COMPLETE_ART = """
[bold cyan]╔══════════════════════════════════════════════════════════╗[/bold cyan]
[bold cyan]║[/bold cyan]  [bold green]✦[/bold green]  情报采集完成 · CyberEye 已生成报告  [bold green]✦[/bold green]       [bold cyan]║[/bold cyan]
[bold cyan]║[/bold cyan]  [dim]请遵守当地法律法规，仅侦察授权目标[/dim]                      [bold cyan]║[/bold cyan]
[bold cyan]╚══════════════════════════════════════════════════════════╝[/bold cyan]
"""

# ============================================================
#  PORT SCAN DATABASE
# ============================================================

TOP_PORTS = [21,22,23,25,53,80,110,143,389,443,445,993,995,1433,1521,3306,3389,5432,5900,6379,8080,8443,9090,27017]

COMMON_SERVICES = {
    21:"FTP",22:"SSH",23:"Telnet",25:"SMTP",53:"DNS",80:"HTTP",
    110:"POP3",143:"IMAP",389:"LDAP",443:"HTTPS",445:"SMB",
    993:"IMAPS",995:"POP3S",1433:"MSSQL",1521:"Oracle",
    3306:"MySQL",3389:"RDP",5432:"PostgreSQL",5900:"VNC",
    6379:"Redis",8080:"HTTP-Alt",8443:"HTTPS-Alt",9090:"HTTP-Alt",
    27017:"MongoDB",
}

PORT_RISK = {
    21:"MED",23:"MED",25:"MED",53:"LOW",110:"MED",135:"HIGH",
    139:"HIGH",143:"MED",389:"MED",445:"HIGH",1433:"HIGH",
    1521:"HIGH",3306:"HIGH",3389:"HIGH",5432:"MED",5900:"HIGH",
    6379:"HIGH",8080:"MED",27017:"HIGH",9200:"HIGH",
}

def get_risk(port):
    return PORT_RISK.get(port, "LOW")

def get_risk_style(risk):
    return {"HIGH":"red","MED":"yellow","LOW":"green"}.get(risk, "dim")


# ============================================================
#  GEOIP LOOKUP
# ============================================================

def geoip_lookup(target: str) -> dict:
    """Geolocation lookup via ip-api.com (free, no key needed)"""
    # Resolve domain to IP first
    ip = target
    try:
        socket.inet_aton(target)
    except OSError:
        try:
            ip = socket.gethostbyname(target)
        except:
            return {"error": f"无法解析目标: {target}"}

    try:
        r = __import__('requests').get(f'http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,isp,org,as,query', timeout=10)
        data = r.json()
        if data.get('status') == 'success':
            return {
                "ip": data['query'],
                "country": data.get('country',''),
                "countryCode": data.get('countryCode',''),
                "region": data.get('regionName',''),
                "city": data.get('city',''),
                "lat": data.get('lat',0),
                "lon": data.get('lon',0),
                "isp": data.get('isp',''),
                "org": data.get('org',''),
                "as": data.get('as',''),
            }
        return {"error": data.get('message','Unknown')}
    except Exception as e:
        return {"error": str(e)}


# ============================================================
#  DNS ENUMERATION
# ============================================================

def dns_enum(domain: str) -> dict:
    """Enumerate DNS records"""
    results = {"A":[], "AAAA":[], "MX":[], "TXT":[], "NS":[], "CNAME":[], "SOA":[]}

    try:
        # A record
        try:
            info = socket.getaddrinfo(domain, None, socket.AF_INET)
            for i in info:
                addr = i[4][0]
                if addr not in results["A"]:
                    results["A"].append(addr)
        except: pass

        # AAAA
        try:
            info = socket.getaddrinfo(domain, None, socket.AF_INET6)
            for i in info:
                addr = i[4][0]
                if addr not in results["AAAA"] and '%' not in addr:
                    results["AAAA"].append(addr)
        except: pass

        # Use nslookup if available for more records
        if sys.platform == "win32":
            for rtype in ["NS", "MX", "TXT", "CNAME", "SOA"]:
                try:
                    out = subprocess.check_output(
                        f'nslookup -type={rtype} {domain} 2>nul',
                        shell=True, timeout=8, stderr=subprocess.DEVNULL
                    ).decode('utf-8', errors='replace')
                    for line in out.split('\n'):
                        if rtype == "MX" and 'mail exchanger' in line.lower():
                            results["MX"].append(line.split('=')[-1].strip())
                        elif rtype == "NS" and 'nameserver' in line.lower() and '=' in line:
                            results["NS"].append(line.split('=')[-1].strip())
                        elif rtype in ["TXT","CNAME","SOA"] and 'text' in line.lower() or 'canonical' in line.lower() or 'primary name server' in line.lower():
                            if '=' in line:
                                val = line.split('=')[-1].strip()
                                results[rtype].append(val)
                except: pass
        else:
            # Unix - try dig/host
            for rtype in ["NS", "MX", "TXT", "CNAME", "SOA"]:
                try:
                    out = subprocess.check_output(
                        f'dig {domain} {rtype} +short 2>/dev/null',
                        shell=True, timeout=8, stderr=subprocess.DEVNULL
                    ).decode('utf-8', errors='replace').strip()
                    if out:
                        for line in out.split('\n'):
                            line = line.strip()
                            if line:
                                results[rtype].append(line)
                except: pass
    except: pass

    return {k: v for k, v in results.items() if v}


# ============================================================
#  PORT SCAN (Quick TOP20)
# ============================================================

def quick_port_scan(ip: str) -> list:
    """快速扫描 TOP20 端口"""
    open_ports = []

    def scan(p):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1.5)
            r = s.connect_ex((ip, p))
            if r == 0:
                # Try banner grab
                banner = ""
                try:
                    s.settimeout(0.8)
                    b = s.recv(1024)
                    if b:
                        banner = b.decode('utf-8', errors='replace').strip()[:80]
                except: pass
                s.close()
                return (p, banner)
            s.close()
        except: pass
        return None

    with ThreadPoolExecutor(max_workers=30) as ex:
        futures = {ex.submit(scan, p): p for p in TOP_PORTS}
        for f in as_completed(futures):
            r = f.result()
            if r:
                open_ports.append(r)

    open_ports.sort(key=lambda x: x[0])
    return open_ports


# ============================================================
#  WHOIS SUMMARY (using whois library or fallback)
# ============================================================

def whois_summary(domain: str) -> dict:
    """简易 WHOIS 查询"""
    result = {}
    try:
        # Try whois command line
        if sys.platform == "win32":
            # No native whois on Windows, skip
            pass
        else:
            out = subprocess.check_output(
                f'whois {domain} 2>/dev/null | head -50',
                shell=True, timeout=10, stderr=subprocess.DEVNULL
            ).decode('utf-8', errors='replace')
            for line in out.split('\n'):
                l = line.lower()
                for key in ['registrar:', 'creation date:', 'expiry date:', 'name server:', 'registrant organization:', 'admin organization:', 'tech organization:']:
                    if key in l:
                        val = line.split(':', 1)[-1].strip()
                        if val:
                            result[key.rstrip(':').title()] = val
    except: pass
    return result


# ============================================================
#  TRACEROUTE (simplified)
# ============================================================

def trace_route(target: str) -> list:
    """简单路由追踪"""
    hops = []
    try:
        if sys.platform == "win32":
            cmd = f'tracert -d -h 15 {target}'
        else:
            cmd = f'traceroute -n -m 15 {target} 2>/dev/null'

        out = subprocess.check_output(
            cmd, shell=True, timeout=30, stderr=subprocess.DEVNULL
        ).decode('utf-8', errors='replace')

        for line in out.split('\n'):
            line = line.strip()
            # Parse hop lines
            parts = line.split()
            if not parts:
                continue
            # Try to find IPs
            for part in parts:
                part = part.strip('()')
                if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', part):
                    if part not in ['0.0.0.0', '127.0.0.1']:
                        if part not in hops:
                            hops.append(part)
                    break
    except: pass
    return hops[:15]


# ============================================================
#  UI BUILDERS
# ============================================================

def print_banner():
    console.print(BANNER, justify="center")
    console.print(Panel(
        "[bold yellow]🌐  IP/域名侦察  ·  📡  DNS枚举  ·  🔍  WHOIS  ·  🗺️  路由追踪  ·  🔓  端口探测[/bold yellow]\n"
        "[dim]多维度网络情报采集 · 实时进度 · 报告导出 JSON / HTML[/dim]",
        border_style="bright_cyan",
        box=box.DOUBLE_EDGE,
        padding=(1, 2),
    ))
    console.print()


def build_geo_panel(geo: dict) -> Panel:
    """构建地理定位面板"""
    if "error" in geo:
        return Panel(f"[red]⚠️  {geo['error']}[/red]", title="🌐 地理定位", border_style="red")

    # Compass-style lat/lon display
    lat_dir = "N" if geo['lat'] >= 0 else "S"
    lon_dir = "E" if geo['lon'] >= 0 else "W"

    content = (
        f"[bold]📍 位置:[/bold]   [bright_cyan]{geo.get('city','')}, {geo.get('region','')}, {geo.get('country','')}[/bright_cyan]\n"
        f"[bold]🌐 IP:[/bold]       [white]{geo['ip']}[/white]\n"
        f"[bold]🧭 坐标:[/bold]     [yellow]{abs(geo['lat']):.2f}°{lat_dir}[/yellow], [yellow]{abs(geo['lon']):.2f}°{lon_dir}[/yellow]\n"
        f"[bold]🏢 ISP:[/bold]      [dim]{geo.get('isp','-')}[/dim]\n"
        f"[bold]🏛️  Org:[/bold]     [dim]{geo.get('org','-')}[/dim]\n"
        f"[bold]🔗 AS:[/bold]       [dim]{geo.get('as','-')}[/dim]"
    )
    return Panel(content, title="🌐 地理定位", border_style="bright_green", box=box.HEAVY, padding=(1, 2))


def build_ascii_map(geo: dict) -> Panel:
    """构建 ASCII 世界地图"""
    if "error" in geo:
        return Panel("[dim]无地理数据[/dim]", title="🗺️  世界地图", border_style="dim")

    lat, lon = geo.get('lat', 0), geo.get('lon', 0)

    # Generate a simple lat/lon grid with marker
    map_lines = []
    map_lines.append("                   🌍  TARGET POSITION")
    map_lines.append(f"                 {abs(lat):.1f}°{'N' if lat>=0 else 'S'}, {abs(lon):.1f}°{'E' if lon>=0 else 'W'}")
    map_lines.append("")

    # Simple 20x10 ASCII grid
    grid_w, grid_h = 40, 14
    for row in range(grid_h):
        lat_pos = 70 - (row / (grid_h-1) * 140)  # 70N to 70S
        line = f"{abs(lat_pos):3.0f}°{'N' if lat_pos>=0 else 'S'}|"
        for col in range(grid_w):
            lon_pos = -180 + (col / (grid_w-1) * 360)
            # Check if this cell is near the target
            dist = ((lat - lat_pos)/20)**2 + ((lon - lon_pos)/40)**2
            if dist < 0.15:
                line += "🔴"
            elif dist < 0.3:
                line += "● "
            elif dist < 0.5:
                line += "· "
            else:
                line += "  "
        line += f"|{abs(lat_pos):3.0f}°{'N' if lat_pos>=0 else 'S'}"
        map_lines.append(line)

    map_lines.append("     " + "─" * (grid_w*2+1))
    map_lines.append("     180°      90°W       0°        90°E      180°")

    return Panel(
        "\n".join(map_lines),
        title="🗺️  地理坐标定位",
        border_style="bright_cyan",
        box=box.HEAVY,
        padding=(1, 2),
    )


def build_dns_panel(dns: dict) -> Panel:
    """构建 DNS 面板"""
    if not dns:
        return Panel("[dim]无 DNS 记录[/dim]", title="📡 DNS 记录", border_style="dim")

    text = Text()
    for rtype, records in dns.items():
        if records:
            text.append(f"\n  [bold bright_white]{rtype}[/bold bright_white]  ", style="bold")
            for r in records[:5]:  # Show max 5 per type
                text.append(f"\n    [green]●[/green] [dim]{r}[/dim]")
            if len(records) > 5:
                text.append(f"\n    [dim]... 还有 {len(records)-5} 条[/dim]")
            text.append("\n")

    return Panel(text, title="📡 DNS 记录枚举", border_style="bright_blue", box=box.HEAVY, padding=(1, 2))


def build_ports_panel(ports: list) -> Panel:
    """构建端口面板"""
    if not ports:
        return Panel("[dim]TOP20 端口全部关闭或过滤[/dim]", title="🔓 端口探测（TOP20）", border_style="dim")

    table = Table(box=box.ROUNDED, border_style="bright_green", header_style="bold bright_cyan")
    table.add_column("端口", justify="center", width=7, style="bold yellow")
    table.add_column("服务", width=18, style="bright_cyan")
    table.add_column("风险", justify="center", width=8)
    table.add_column("Banner", width=50, style="dim")

    for port, banner in ports:
        svc = COMMON_SERVICES.get(port, "未知")
        risk = get_risk(port)
        risk_color = get_risk_style(risk)
        risk_icon = {"HIGH":"🔥","MED":"⚠️","LOW":"✓"}.get(risk, "·")
        table.add_row(
            str(port),
            svc,
            f"[{risk_color}]{risk_icon} {risk}[/{risk_color}]",
            banner[:60] if banner else "-",
        )

    return Panel(table, title=f"🔓 开放端口 · 共 {len(ports)} 个", border_style="bright_green", box=box.HEAVY)


def build_traceroute_panel(hops: list) -> Panel:
    """构建路由追踪面板"""
    if not hops:
        return Panel("[dim]路由追踪无结果[/dim]", title="🗺️  路由拓扑", border_style="dim")

    lines = []
    for i, hop in enumerate(hops, 1):
        if i == 1:
            prefix = "🖥️  [green]本机[/green]"
        elif i == len(hops):
            prefix = "🎯 [red]目标[/red]"
        else:
            prefix = "●"
        lines.append(f"  {prefix:12s}  ──→  [cyan]{hop}[/cyan]")
        if i < len(hops):
            lines.append(f"               │")

    content = "\n".join(lines[:30])  # Max 30 hops

    return Panel(content, title="🗺️  路由拓扑（Traceroute）", border_style="bright_magenta", box=box.HEAVY, padding=(1, 2))


def build_whois_panel(whois: dict) -> Panel:
    """构建 WHOIS 面板"""
    if not whois:
        return Panel("[dim]WHOIS 信息不可用[/dim]", title="🔍 WHOIS", border_style="dim")

    content = "\n".join([f"  [bold]{k}:[/bold]  [dim]{v}[/dim]" for k, v in whois.items()])
    return Panel(content, title="🔍 WHOIS 信息", border_style="bright_yellow", box=box.ROUNDED, padding=(1, 2))


def build_risk_assessment(ports: list) -> Panel:
    """安全风险评估"""
    if not ports:
        return Panel("[dim]无开放端口[/dim]", title="⚠️  风险评估", border_style="dim")

    high = sum(1 for p, _ in ports if get_risk(p) == "HIGH")
    med = sum(1 for p, _ in ports if get_risk(p) == "MED")
    low = sum(1 for p, _ in ports if get_risk(p) == "LOW")
    total = len(ports)

    score = min(100, high * 30 + med * 10)
    if score >= 50:
        level = "[bold red]🔴 高风险[/bold red]"
        desc = "存在高危端口暴露，建议立即检查并加固"
    elif score >= 20:
        level = "[bold yellow]🟡 中等风险[/bold yellow]"
        desc = "存在一定风险端口，建议审查"
    else:
        level = "[bold green]🟢 低风险[/bold green]"
        desc = "暴露端口较少，风险可控"

    bar_w = 20
    hf = int(high / total * bar_w) if high else 0
    mf = int(med / total * bar_w) if med else 0
    lf = int(low / total * bar_w) if low else 0
    bar = f"[red]{'█'*hf}[/red][yellow]{'█'*mf}[/yellow][green]{'█'*lf}[/green][dim]{'░'*max(0,bar_w-hf-mf-lf)}[/dim]"

    return Panel(
        f"  风险评估: {level}\n  {bar}  [dim]高危 {high} · 中危 {med} · 低危 {low}[/dim]\n\n"
        f"  [dim]▸ {desc}[/dim]",
        title="⚠️  安全风险评估",
        border_style="bold yellow" if score >= 20 else "bold green",
        box=box.HEAVY, padding=(1, 2),
    )


def build_summary_card(geo: dict, dns: dict, ports: list, hops: list, elapsed: float, target: str) -> Panel:
    """构建总览卡片"""
    ip = geo.get('ip', target) if "error" not in geo else target
    location = f"{geo.get('city','')}, {geo.get('country','')}" if "error" not in geo else "-"
    dns_count = sum(len(v) for v in dns.values()) if dns else 0
    port_count = len(ports)
    hop_count = len(hops)

    content = (
        f"[bold]🎯 目标:[/bold]     [bright_cyan]{target}[/bright_cyan]\n"
        f"[bold]🌐 IP:[/bold]       [white]{ip}[/white]\n"
        f"[bold]📍 位置:[/bold]     [yellow]{location}[/yellow]\n"
        f"[bold]📡 DNS:[/bold]      [white]{dns_count}[/white] 条记录\n"
        f"[bold]🔓 端口:[/bold]     [green]{port_count}[/green] 个开放  "
        f"[bold]🗺️  路由:[/bold]     [magenta]{hop_count}[/magenta] 跳\n"
        f"[bold]⏱️  用时:[/bold]    [magenta]{elapsed:.1f}s[/magenta]"
    )
    return Panel(content, title="📊 情报总览", border_style="bold bright_green", box=box.DOUBLE_EDGE, padding=(1, 2))


def build_completion(has_data: bool):
    msg = "[bold green]✦  侦察完成 · 情报已采集  ✦[/bold green]" if has_data else "[bold yellow]✦  侦察完成 · 数据有限  ✦[/bold yellow]"
    return Panel(
        Align.center(f"{msg}\n\n[dim]请遵守当地法律法规，仅侦察授权目标[/dim]"),
        border_style="bright_green" if has_data else "yellow",
        box=box.HEAVY, padding=(1, 3),
    )


# ============================================================
#  HTML REPORT
# ============================================================

def export_html(geo: dict, dns: dict, ports: list, hops: list, whois: dict, target: str, elapsed: float) -> str:
    """导出 HTML 报告"""
    ip = geo.get('ip', target) if "error" not in geo else target
    city = geo.get('city','') if "error" not in geo else ""
    country = geo.get('country','') if "error" not in geo else ""
    lat = geo.get('lat',0) if "error" not in geo else 0
    lon = geo.get('lon',0) if "error" not in geo else 0
    isp = geo.get('isp','') if "error" not in geo else ""
    org = geo.get('org','') if "error" not in geo else ""

    # DNS table
    dns_rows = ""
    for rtype, records in dns.items():
        for r in records:
            dns_rows += f"<tr><td><span class=\"dns-badge\">{rtype}</span></td><td>{r}</td></tr>\n"

    # Port table
    port_rows = ""
    for p, b in ports:
        svc = COMMON_SERVICES.get(p, "未知")
        risk = get_risk(p)
        color = {"HIGH":"#ff657a","MED":"#ffae57","LOW":"#7ec88e"}
        risk_lbl = {"HIGH":"🔥 高危","MED":"⚠️ 中危","LOW":"✓ 低危"}
        c = color.get(risk, "#686b71")
        port_rows += f"<tr><td>{p}</td><td>{svc}</td><td><span class=\"risk-badge\" style=\"background:{c}22;color:{c}\">{risk_lbl.get(risk,risk)}</span></td><td>{b[:80] or '-'}</td></tr>\n"

    # Hops list
    hops_html = "".join([f"<li><strong>Hop {i+1}:</strong> {h}</li>" for i, h in enumerate(hops[:10])]) or "<li>无数据</li>"

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🛡️ CyberEye 侦察报告 — {target}</title>
<style>
  *{{margin:0;padding:0;box-sizing:border-box}}
  body{{background:#0a0e14;color:#e6e1cf;font-family:'SF Mono','JetBrains Mono','Cascadia Code',monospace;padding:2rem;line-height:1.7}}
  .container{{max-width:1000px;margin:0 auto}}
  h1{{font-size:1.8rem;color:#ffae57;margin-bottom:.5rem}}
  h2{{font-size:1.3rem;color:#5ccfe6;margin:1.5rem 0 .8rem;border-bottom:1px solid #2e3a47;padding-bottom:.3rem}}
  .subtitle{{color:#686b71;margin-bottom:2rem}}
  .stats{{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.8rem;margin:1rem 0 2rem}}
  .stat-card{{background:#141a23;border:1px solid #2e3a47;border-radius:8px;padding:1rem;text-align:center}}
  .stat-card .val{{font-size:1.6rem;font-weight:bold}}
  .stat-card .lbl{{font-size:.75rem;color:#686b71;text-transform:uppercase;letter-spacing:1px}}
  .green{{color:#7ec88e}} .yellow{{color:#ffae57}} .red{{color:#ff657a}} .cyan{{color:#5ccfe6}}
  .geo-card{{background:linear-gradient(135deg,#141a23,#1a2a1a);border:1px solid #7ec88e;border-radius:8px;padding:1.2rem;margin:1rem 0 2rem}}
  .geo-card .ip{{font-size:1.2rem;color:#5ccfe6;font-weight:bold}}
  .geo-card .loc{{font-size:.9rem;color:#686b71;margin-top:.3rem}}
  .geo-card .coord{{font-size:.85rem;color:#ffae57;margin-top:.2rem}}
  table{{width:100%;border-collapse:collapse;margin:1rem 0}}
  th,td{{padding:.6rem .8rem;text-align:left;border-bottom:1px solid #2e3a47}}
  th{{color:#5ccfe6;font-weight:600;font-size:.8rem;text-transform:uppercase;letter-spacing:1px}}
  td{{font-size:.85rem}}
  .dns-badge{{background:#1a2a3a;color:#5ccfe6;padding:.1rem .5rem;border-radius:4px;font-size:.7rem;font-weight:bold}}
  .risk-badge{{padding:.15rem .5rem;border-radius:4px;font-size:.75rem}}
  .open-badge{{background:#1a3a2a;color:#7ec88e;padding:.15rem .5rem;border-radius:4px;font-size:.7rem}}
  .hops-list{{list-style:none;padding:0}}
  .hops-list li{{padding:.3rem 0;border-bottom:1px solid #1a1a1a;font-size:.85rem}}
  .hops-list li strong{{color:#5ccfe6}}
  footer{{margin-top:3rem;text-align:center;color:#3a4550;font-size:.8rem;padding:1rem 0}}
</style>
</head>
<body>
<div class="container">
  <h1>🛡️  CyberEye 侦察报告</h1>
  <p class="subtitle">🎯 {target} · ⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} · ⏱️ {elapsed:.1f}s</p>

  <div class="geo-card">
    <div class="ip">🌐 {ip}</div>
    <div class="loc">📍 {city}, {country}</div>
    <div class="coord">🧭 {lat:.2f}°N, {lon:.2f}°E · ISP: {isp} · Org: {org}</div>
  </div>

  <div class="stats">
    <div class="stat-card"><div class="val cyan">{len(dns)}</div><div class="lbl">DNS 类型</div></div>
    <div class="stat-card"><div class="val green">{len(ports)}</div><div class="lbl">开放端口</div></div>
    <div class="stat-card"><div class="val yellow">{len(hops)}</div><div class="lbl">路由跳数</div></div>
    <div class="stat-card"><div class="val cyan">{elapsed:.1f}s</div><div class="lbl">用时</div></div>
  </div>

  <h2>📡 DNS 记录</h2>
  {"<table><thead><tr><th>类型</th><th>记录值</th></tr></thead><tbody>"+dns_rows+"</tbody></table>" if dns_rows else "<p style='color:#686b71'>无 DNS 记录</p>"}

  <h2>🔓 开放端口 ({len(ports)})</h2>
  {"<table><thead><tr><th>端口</th><th>服务</th><th>风险</th><th>Banner</th></tr></thead><tbody>"+port_rows+"</tbody></table>" if port_rows else "<p style='color:#686b71'>未发现开放端口</p>"}

  <h2>🗺️  路由追踪</h2>
  <ul class="hops-list">{hops_html}</ul>

  <footer>🛡️ Generated by CyberEye · Network Recon Tool · {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</footer>
</div>
</body>
</html>"""

    return html


# ============================================================
#  MAIN SCAN ENGINE
# ============================================================

def run_recon(target: str, output_html: str = None):
    """Execute full recon on target"""
    console.clear()
    print_banner()

    start = time.time()
    geo = {}
    dns = {}
    ports = []
    hops = []
    whois = {}

    console.print(Panel(f"[bold cyan]🎯 目标: [white]{target}[/white][/bold cyan]", border_style="bright_cyan", box=box.HEAVY))
    console.print()

    # Phase 1: GeoIP
    with Progress(
        SpinnerColumn("dots", style="cyan"),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(bar_width=None, complete_style="green"),
        console=console,
    ) as p:
        task = p.add_task("[cyan]🌐  地理定位中 ...", total=None)
        geo = geoip_lookup(target)
        p.update(task, completed=1)
    console.print(build_geo_panel(geo))
    console.print()

    # Phase 2: DNS
    domain = target
    try:
        socket.inet_aton(target)
        domain = geo.get('ip', target) if "error" not in geo else target
    except:
        domain = target

    with Progress(
        SpinnerColumn("dots", style="blue"),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(bar_width=None, complete_style="bright_blue"),
        console=console,
    ) as p:
        task = p.add_task("[blue]📡  DNS 枚举中 ...", total=None)
        dns = dns_enum(domain)
        p.update(task, completed=1)
    console.print(build_dns_panel(dns))
    console.print()

    # Phase 3: Quick port scan
    ip = geo.get('ip', target) if "error" not in geo else target
    with Progress(
        SpinnerColumn("dots", style="green"),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(bar_width=None, complete_style="green"),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TextColumn("· {task.completed}/{task.total}"),
        console=console,
    ) as p:
        task = p.add_task("[green]🔓  扫描端口（TOP20）...", total=len(TOP_PORTS))
        def cb(d, t):
            p.update(task, completed=d)
        # Run scan with callback
        ports = quick_port_scan(ip)
        p.update(task, completed=len(TOP_PORTS))

    if ports:
        console.print(build_ports_panel(ports))
        console.print()
        console.print(build_risk_assessment(ports))
        console.print()

    # Phase 4: Traceroute
    with Progress(
        SpinnerColumn("dots", style="magenta"),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(bar_width=None, complete_style="bright_magenta"),
        console=console,
    ) as p:
        task = p.add_task("[magenta]🗺️  路由追踪中 ...", total=None)
        hops = trace_route(domain)
        p.update(task, completed=1)
    console.print(build_traceroute_panel(hops))
    console.print()

    # Phase 5: WHOIS
    with Progress(
        SpinnerColumn("dots", style="yellow"),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(bar_width=None, complete_style="yellow"),
        console=console,
    ) as p:
        task = p.add_task("[yellow]🔍  WHOIS 查询中 ...", total=None)
        whois = whois_summary(domain)
        p.update(task, completed=1)

    if whois:
        console.print(build_whois_panel(whois))
        console.print()

    # Phase 6: ASCII map
    if "error" not in geo:
        console.print(build_ascii_map(geo))
        console.print()

    elapsed = time.time() - start

    # Summary
    console.print(build_summary_card(geo, dns, ports, hops, elapsed, target))
    console.print()

    # Export
    if output_html:
        try:
            html = export_html(geo, dns, ports, hops, whois, target, elapsed)
            with open(output_html, 'w', encoding='utf-8') as f:
                f.write(html)
            console.print(f"[green]✅  HTML 报告已导出: [white]{output_html}[/white][/green]")
        except Exception as e:
            console.print(f"[red]❌  HTML 导出失败: {e}[/red]")

    console.print(COMPLETE_ART, justify="center")
    console.print(build_completion(bool(geo or dns or ports)))


# ============================================================
#  INTERACTIVE MODE
# ============================================================

def interactive_mode():
    console.clear()
    print_banner()

    target = Prompt.ask("[bold cyan]🎯 目标 IP 或域名[/bold cyan]", default="scanme.nmap.org")
    if not target:
        target = "scanme.nmap.org"

    output_html = None
    if Confirm.ask("[bold]📄 导出 HTML 报告？[/bold]", default=True):
        output_html = Prompt.ask("  文件名", default=f"cybereye_{target}_{int(time.time())}.html")

    run_recon(target, output_html)


# ============================================================
#  CLI MODE
# ============================================================

def cli_mode():
    args = sys.argv[1:]
    if not args:
        interactive_mode()
        return

    target = args[0]
    output_html = None

    i = 1
    while i < len(args):
        if args[i] in ['--html', '-o']:
            if i + 1 < len(args):
                output_html = args[i + 1]
                i += 1
        elif args[i] == '--help':
            console.print("""
用法:
  python cybereye.py <target> [--html report.html]
  python cybereye.py                     # 交互模式
            """)
            return
        i += 1

    run_recon(target, output_html)


# ============================================================
#  ENTRY
# ============================================================

def signal_handler(sig, frame):
    console.print("\n\n[yellow][STOP]  侦察已中断[/yellow]")
    sys.exit(0)

def main():
    import signal
    signal.signal(signal.SIGINT, signal_handler)
    if len(sys.argv) > 1:
        cli_mode()
    else:
        interactive_mode()

if __name__ == "__main__":
    main()
