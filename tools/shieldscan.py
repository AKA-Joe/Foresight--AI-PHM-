#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║   🛡️  ShieldScan · 网站安全盾牌扫描器                         ║
║   Web 安全头检测 · TLS 证书审查 · 安全评分                      ║
╚══════════════════════════════════════════════════════════════╝

功能：
  • 🔒 HTTP 安全头检测（HSTS / CSP / XFO / XSS 等 12 项）
  • 📜 TLS/SSL 证书审查（签发者、有效期、SANs、协议版本）
  • 🍪 Cookie 安全分析（HttpOnly / Secure / SameSite）
  • 🌐 CORS 跨域配置检查
  • 🏆 安全评分（A+ ~ F 六级评级）
  • 📋 每项安全配置的详细建议
  • 📊 实时扫描仪表盘
  • 📄 HTML 报告导出

用法：
  python shieldscan.py                          # 交互模式
  python shieldscan.py https://example.com      # 快速扫描
  python shieldscan.py example.com --html report.html  # 导出报告

依赖：
  pip install rich requests cryptography
"""

import sys
import json
import ssl
import socket
import time
import re
import os
import signal
from datetime import datetime
from urllib.parse import urlparse

if sys.platform == "win32":
    import io
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='replace')
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

try:
    from rich.console import Console as RichConsole
    from rich.table import Table
    from rich.panel import Panel
    from rich.layout import Layout
    from rich.live import Live
    from rich.progress import Progress, BarColumn, TextColumn, TimeElapsedColumn, SpinnerColumn
    from rich.text import Text
    from rich import box
    from rich.prompt import Prompt, Confirm
    from rich.align import Align
    from rich.rule import Rule
    from rich.columns import Columns
    from rich.syntax import Syntax
except ImportError:
    print("[X] 缺少依赖库 'rich'，请运行: pip install rich requests cryptography")
    sys.exit(1)

try:
    import requests
    from cryptography import x509
    from cryptography.hazmat.backends import default_backend
except ImportError:
    print("[X] 缺少依赖库，请运行: pip install rich requests cryptography")
    sys.exit(1)

console = RichConsole(emoji=False, force_terminal=True, legacy_windows=False)

BANNER = """
[bold bright_cyan]╔══════════════════════════════════════════════════════════════╗[/bold bright_cyan]
[bold bright_cyan]║[/bold bright_cyan]       [bold green]🛡️  SHIELD SCAN[/bold green]       [bold white]网站安全盾牌扫描器[/bold white]        [bold bright_cyan]║[/bold bright_cyan]
[bold bright_cyan]║[/bold bright_cyan]   [dim]Web Security Scanner · TLS Inspector · Grade Report[/dim]   [bold bright_cyan]║[/bold bright_cyan]
[bold bright_cyan]╚══════════════════════════════════════════════════════════════╝[/bold bright_cyan]
"""

COMPLETE_ART = """
[bold bright_cyan]╔══════════════════════════════════════════════════════════════╗[/bold bright_cyan]
[bold bright_cyan]║[/bold bright_cyan]  [bold green]✦[/bold green]  扫描完成 · 安全报告已生成  [bold green]✦[/bold green]                        [bold bright_cyan]║[/bold bright_cyan]
[bold bright_cyan]║[/bold bright_cyan]  [dim]ShieldScan · Web Security Analyzer[/dim]                        [bold bright_cyan]║[/bold bright_cyan]
[bold bright_cyan]╚══════════════════════════════════════════════════════════════╝[/bold bright_cyan]
"""


# ============================================================
#  SECURITY HEADER DATABASE
# ============================================================

SECURITY_HEADERS = {
    "Strict-Transport-Security": {
        "name": "HTTP 严格传输安全 (HSTS)",
        "desc": "强制浏览器使用 HTTPS 连接，防止 SSL Stripping 攻击",
        "weight": 15,
        "check": lambda v: "max-age" in (v or "").lower() and "max-age=" in (v or "").lower(),
        "good": lambda v: any(x in (v or "").lower() for x in ["max-age=31536000", "max-age=63072000", "preload"]),
        "fix": "添加: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
    },
    "X-Frame-Options": {
        "name": "点击劫持防护 (XFO)",
        "desc": "防止页面被嵌入 iframe，抵御点击劫持攻击",
        "weight": 10,
        "check": lambda v: (v or "").upper() in ["DENY", "SAMEORIGIN"],
        "good": lambda v: (v or "").upper() == "DENY",
        "fix": "添加: X-Frame-Options: DENY",
    },
    "X-Content-Type-Options": {
        "name": "MIME 类型嗅探防护",
        "desc": "禁止浏览器 MIME 类型嗅探，降低脚本注入风险",
        "weight": 8,
        "check": lambda v: (v or "").lower() == "nosniff",
        "good": lambda v: True,
        "fix": "添加: X-Content-Type-Options: nosniff",
    },
    "Content-Security-Policy": {
        "name": "内容安全策略 (CSP)",
        "desc": "白名单控制可加载的资源，防御 XSS 和数据注入",
        "weight": 20,
        "check": lambda v: bool(v and len(v) > 10),
        "good": lambda v: "script-src" in (v or "") and "unsafe-inline" not in (v or ""),
        "fix": "添加 CSP 头，限制脚本来源，避免使用 unsafe-inline",
    },
    "Referrer-Policy": {
        "name": "引用来源策略",
        "desc": "控制 HTTP Referer 头的发送策略，防止信息泄漏",
        "weight": 5,
        "check": lambda v: bool(v and v.strip()),
        "good": lambda v: (v or "").lower() in ["strict-origin-when-cross-origin", "same-origin", "no-referrer"],
        "fix": "添加: Referrer-Policy: strict-origin-when-cross-origin",
    },
    "Permissions-Policy": {
        "name": "权限策略",
        "desc": "控制浏览器 API 权限（摄像头、麦克风等），最小化攻击面",
        "weight": 5,
        "check": lambda v: bool(v and len(v) > 5),
        "good": lambda v: True,
        "fix": "添加 Permissions-Policy 头，限制不需要的 API 权限",
    },
    "X-XSS-Protection": {
        "name": "XSS 过滤器",
        "desc": "启用浏览器内置 XSS 过滤器（现代浏览器已弃用，但作为纵深防御）",
        "weight": 3,
        "check": lambda v: (v or "").startswith("1") or (v or "").lower() == "0",
        "good": lambda v: (v or "").startswith("1"),
        "fix": "添加: X-XSS-Protection: 1; mode=block",
    },
    "X-Powered-By": {
        "name": "技术栈信息泄漏",
        "desc": "移除 X-Powered-By 头可防止攻击者识别服务器技术栈",
        "weight": 5,
        "check": lambda v: not v,
        "good": lambda v: True,
        "fix": "在服务器配置中移除 X-Powered-By 响应头",
    },
    "Access-Control-Allow-Origin": {
        "name": "CORS 跨域配置",
        "desc": "控制跨域资源共享策略，星号(*)允许任意域访问",
        "weight": 10,
        "check": lambda v: not v or v != "*",
        "good": lambda v: not v or v != "*",
        "fix": "避免使用通配符 '*'，指定具体的可信域名",
    },
    "Set-Cookie": {
        "name": "Cookie 安全标志",
        "desc": "Cookie 应设置 HttpOnly、Secure、SameSite 标志",
        "weight": 10,
        "check": lambda v: True,  # checked separately
        "good": lambda v: True,
        "fix": "在 Cookie 中设置 HttpOnly; Secure; SameSite=Lax",
    },
}

# Header check order for display
HEADER_ORDER = [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "X-XSS-Protection",
    "Access-Control-Allow-Origin",
    "X-Powered-By",
    "Set-Cookie",
]

GRADE_THRESHOLDS = [
    (95, "A+", "🏆", "[bold bright_green]", "卓越的安全配置，几乎无懈可击"),
    (85, "A", "🛡️", "[bold green]", "良好的安全配置，仅有轻微改进空间"),
    (75, "B", "👍", "[bold cyan]", "基础安全配置达标，建议增强"),
    (60, "C", "⚠️", "[bold yellow]", "安全配置不足，存在明显风险"),
    (40, "D", "🔴", "[bold red]", "安全配置薄弱，多处需要改进"),
    (0, "F", "💀", "[bold bright_red]", "严重缺乏安全防护，极易受到攻击"),
]


# ============================================================
#  SCANNING ENGINE
# ============================================================

class ShieldScan:
    """ShieldScan 扫描引擎"""

    def __init__(self, url: str, timeout: int = 15):
        self.raw_url = url
        self.url = self._normalize(url)
        self.domain = urlparse(self.url).netloc
        self.timeout = timeout
        self.headers = {}
        self.cookies_raw = ""
        self.cert_info = {}
        self.results = {}
        self.start_time = 0
        self.end_time = 0

    def _normalize(self, url: str) -> str:
        """规范化 URL"""
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        return url

    def scan_headers(self) -> dict:
        """扫描 HTTP 安全头"""
        result = {}
        try:
            resp = requests.get(
                self.url,
                timeout=self.timeout,
                headers={"User-Agent": "ShieldScan/1.0 Security Analyzer"},
                allow_redirects=True,
                verify=False,  # We check TLS separately
            )
            self.headers = dict(resp.headers)
            self.cookies_raw = str(resp.headers.get("Set-Cookie", ""))

            for key in HEADER_ORDER:
                if key == "Set-Cookie":
                    val = self.cookies_raw
                else:
                    val = resp.headers.get(key, "")
                    # Check case-insensitive
                    if not val:
                        for hk, hv in resp.headers.items():
                            if hk.lower() == key.lower():
                                val = hv
                                break

                info = SECURITY_HEADERS.get(key, {})
                present = bool(val)
                secure = info.get("check", lambda x: False)(val) if info else False
                excellent = info.get("good", lambda x: False)(val) if info else False

                result[key] = {
                    "present": present,
                    "value": val or "（缺失）",
                    "secure": secure,
                    "excellent": excellent,
                    "desc": info.get("desc", ""),
                    "fix": info.get("fix", ""),
                    "weight": info.get("weight", 0),
                }

            # Extra: server banner info
            server = resp.headers.get("Server", "")
            if server:
                result["Server"] = {
                    "present": True,
                    "value": server,
                    "secure": False,
                    "weight": 0,
                    "desc": "服务器标识信息，建议隐藏具体版本号",
                    "fix": "配置服务器隐藏版本号",
                }

        except requests.exceptions.SSLError as e:
            result["_error"] = f"SSL 连接错误: {e}"
        except requests.exceptions.ConnectionError as e:
            result["_error"] = f"连接失败: {e}"
        except requests.exceptions.Timeout:
            result["_error"] = "请求超时"
        except Exception as e:
            result["_error"] = str(e)

        self.results = result
        return result

    def scan_tls(self) -> dict:
        """扫描 TLS 证书信息"""
        info = {"valid": False, "error": None}

        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            host = self.domain
            port = 443

            with socket.create_connection((host, port), timeout=self.timeout) as sock:
                with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                    cert_bin = ssock.getpeercert(binary_form=True)
                    if not cert_bin:
                        info["error"] = "无法获取证书"
                        self.cert_info = info
                        return info

                    cert = x509.load_der_x509_certificate(cert_bin, default_backend())

                    # Subject
                    subject = cert.subject.rfc4514_string()

                    # Issuer
                    issuer = cert.issuer.rfc4514_string()

                    # Validity
                    not_before = cert.not_valid_before_utc
                    not_after = cert.not_valid_after_utc
                    now = datetime.now().astimezone()

                    days_left = (not_after - now).days if not_after > now else 0
                    expired = now > not_after
                    expiring = 0 < days_left < 30

                    # SANs
                    sans = []
                    try:
                        ext = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName)
                        sans = ext.value.get_values_for_type(x509.DNSName)
                    except x509.ExtensionNotFound:
                        pass

                    # Protocol version
                    version = ssock.version()

                    # Cipher
                    cipher = ssock.cipher()

                    info = {
                        "valid": True,
                        "subject": subject,
                        "issuer": issuer,
                        "not_before": not_before.strftime("%Y-%m-%d %H:%M:%S UTC"),
                        "not_after": not_after.strftime("%Y-%m-%d %H:%M:%S UTC"),
                        "days_left": days_left,
                        "expired": expired,
                        "expiring": expiring,
                        "sans": sans[:10],  # Max 10 SANs
                        "sans_count": len(sans),
                        "version": version,
                        "cipher": cipher[0],
                        "cipher_bits": cipher[1],
                        "serial": hex(cert.serial_number),
                    }

        except ssl.SSLError as e:
            info["error"] = f"SSL 错误: {e}"
        except socket.timeout:
            info["error"] = "连接超时"
        except socket.gaierror:
            info["error"] = f"域名解析失败: {self.domain}"
        except ImportError:
            info["error"] = "缺少 cryptography 库，请安装: pip install cryptography"
        except Exception as e:
            info["error"] = str(e)

        self.cert_info = info
        return info

    def scan_cookies(self) -> list:
        """分析 Cookie 安全设置"""
        if not self.cookies_raw:
            return []

        cookies = []
        for c in self.cookies_raw.split(","):
            c = c.strip()
            if not c:
                continue
            # Split by semicolon
            parts = [p.strip() for p in c.split(";")]
            name = parts[0].split("=")[0] if "=" in parts[0] else parts[0]
            has_httponly = any(p.lower() == "httponly" for p in parts)
            has_secure = any(p.lower() == "secure" for p in parts)
            has_samesite = any("samesite" in p.lower() for p in parts)
            samesite_val = ""
            for p in parts:
                if "samesite" in p.lower():
                    samesite_val = p.split("=")[-1].strip() if "=" in p else ""

            cookies.append({
                "name": name,
                "httponly": has_httponly,
                "secure": has_secure,
                "samesite": has_samesite,
                "samesite_value": samesite_val,
                "flags": f"{'HttpOnly ' if has_httponly else ''}{'Secure ' if has_secure else ''}{'SameSite=' + samesite_val if has_samesite else ''}",
            })
        return cookies

    def calculate_score(self) -> dict:
        """计算安全评分"""
        if "_error" in self.results:
            return {"score": 0, "grade": "F", "badge": "💀", "detail": "扫描失败", "max": 100}

        total = 0
        max_score = 0
        details = []

        for key in HEADER_ORDER:
            r = self.results.get(key)
            if not r:
                continue
            w = r.get("weight", 0)
            max_score += w

            if key == "Set-Cookie":
                # Cookie check: analyze separately
                cookies = self.scan_cookies()
                if cookies:
                    all_httponly = all(c["httponly"] for c in cookies) if cookies else False
                    all_secure = all(c["secure"] for c in cookies) if cookies else False
                    has_samesite = any(c["samesite"] for c in cookies) if cookies else False
                    if all_httponly and all_secure and has_samesite:
                        total += w
                        details.append((key, w, "✅"))
                    elif all_httponly and all_secure:
                        total += w * 0.7
                        details.append((key, w * 0.7, "⚠️"))
                    else:
                        total += w * 0.3
                        details.append((key, w * 0.3, "❌"))
                else:
                    total += w
                    details.append((key, w, "✅"))
            elif r.get("excellent"):
                total += w
                details.append((key, w, "✅"))
            elif r.get("secure"):
                total += w * 0.8
                details.append((key, w * 0.8, "⚠️"))
            elif r.get("present") and key != "X-Powered-By":
                total += w * 0.4
                details.append((key, w * 0.4, "❌"))
            else:
                details.append((key, 0, "❌"))

        # TLS score bonus
        tls = self.cert_info
        if tls.get("valid"):
            max_score += 10
            if not tls.get("expired"):
                total += 5
            if tls.get("days_left", 0) > 90:
                total += 3
            if tls.get("days_left", 0) > 30:
                total += 2

        score = int((total / max_score * 100)) if max_score else 0
        score = min(100, max(0, score))

        grade_info = GRADE_THRESHOLDS[0]
        for threshold, grade, badge, color, desc in GRADE_THRESHOLDS:
            if score >= threshold:
                grade_info = (threshold, grade, badge, color, desc)
                break

        return {
            "score": score,
            "grade": grade_info[1],
            "badge": grade_info[2],
            "color": grade_info[3],
            "description": grade_info[4],
            "max": max_score,
            "details": details,
        }


# ============================================================
#  UI BUILDERS
# ============================================================

def print_banner():
    console.print(BANNER, justify="center")
    console.print(Rule(style="bright_cyan"))

def build_target_panel(url: str) -> Panel:
    return Panel(
        f"[bold cyan]🎯 目标:[/bold cyan] [white]{url}[/white]\n"
        f"[bold cyan]🔗 域名:[/bold cyan] [white]{urlparse(url).netloc}[/white]",
        title="[bold yellow]🚀 扫描启动[/bold yellow]",
        border_style="bright_cyan", box=box.HEAVY, padding=(1, 2),
    )


def build_header_table(results: dict) -> Table:
    """安全头检测结果表"""
    table = Table(
        box=box.HEAVY_EDGE, border_style="bright_blue",
        header_style="bold bright_cyan",
        title="[bold]🔒 HTTP 安全头检测[/bold]",
        caption="✅=安全  ⚠️=基本  ❌=缺失/危险",
    )
    table.add_column("安全头", width=28)
    table.add_column("状态", justify="center", width=12)
    table.add_column("风险条", width=20)
    table.add_column("当前值", width=55)

    for key in HEADER_ORDER:
        r = results.get(key)
        if not r:
            continue
        name = SECURITY_HEADERS.get(key, {}).get("name", key)
        w = r.get("weight", 0)

        # Status and bar
        if r.get("excellent"):
            status = "[bold green]✅ 优秀[/bold green]"
            bar = f"[green]{'█' * 10}[/green]"
        elif r.get("secure"):
            status = "[bold yellow]⚠️  基本[/bold yellow]"
            bar = f"[yellow]{'█' * 8}{'░' * 2}[/yellow]"
        elif r.get("present") and key not in ("X-Powered-By",):
            status = "[bold red]❌ 危险[/bold red]"
            bar = f"[red]{'█' * 4}{'░' * 6}[/red]"
        elif r.get("present") and key == "X-Powered-By":
            status = "[red]❌ 暴露[/red]"
            bar = f"[red]{'█' * 3}{'░' * 7}[/red]"
        else:
            status = "[bold red]❌ 缺失[/bold red]"
            bar = f"[red]{'░' * 10}[/red]"

        val = r.get("value", "-")
        if len(str(val)) > 55:
            val = str(val)[:52] + "..."

        # Add weight indicator
        weight_str = f"[dim]{'●' * (w // 5)}[/dim]" if w > 0 else ""

        table.add_row(
            f"{name}  {weight_str}",
            status,
            bar,
            f"[dim]{val}[/dim]",
        )

    return table


def build_tls_panel(tls: dict) -> Panel:
    """TLS 证书面板 — 增强版"""
    if tls.get("error"):
        return Panel(
            f"[red]⚠️  {tls['error']}[/red]",
            title="📜 TLS/SSL 证书", border_style="red", box=box.ROUNDED,
        )

    if not tls.get("valid"):
        return Panel("[dim]无法获取证书信息[/dim]", title="📜 TLS/SSL 证书", border_style="dim")

    # Certificate validity indicator
    if tls.get("expired"):
        validity = "[bold red]💀 已过期[/bold red]"
        v_color = "red"
        v_icon = "💀"
    elif tls.get("days_left", 0) < 7:
        validity = f"[bold red]🔴 {tls['days_left']} 天后过期[/bold red]"
        v_color = "red"
        v_icon = "🚨"
    elif tls.get("days_left", 0) < 30:
        validity = f"[bold yellow]⚠️ {tls['days_left']} 天后过期[/bold yellow]"
        v_color = "yellow"
        v_icon = "⚠️"
    elif tls.get("days_left", 0) < 90:
        validity = f"[bold cyan]🟢 {tls['days_left']} 天后过期[/bold cyan]"
        v_color = "cyan"
        v_icon = "📅"
    else:
        validity = f"[bold green]✅ {tls['days_left']} 天后过期[/bold green]"
        v_color = "green"
        v_icon = "🔒"

    # Days bar
    bar_w = 25
    total_days = 365
    days = max(min(tls.get("days_left", 365), total_days), 0)
    used_days = total_days - days
    filled = int(days / total_days * bar_w) if days > 0 else 0
    used_filled = int(used_days / total_days * bar_w) if used_days > 0 else 0
    bar = f"[green]{'█' * filled}[/green][red]{'█' * used_filled}[/red][dim]{'░' * max(0, bar_w - filled - used_filled)}[/dim]"

    content = Text()
    content.append(f"\n  {v_icon} [bold]证书状态:[/bold]  {validity}\n")
    content.append(f"  [dim]有效期剩余:[/dim] {bar}  [dim]已用 {used_days}/共 {total_days} 天[/dim]\n")
    content.append(f"  [dim]  生效: {tls.get('not_before', '-')}[/dim]\n")
    content.append(f"  [dim]  到期: {tls.get('not_after', '-')}[/dim]\n\n")

    # Certificate details in mini-table style
    content.append(f"  ┌─────────────────────────────────────┐\n")
    content.append(f"  │ [bold]📋 主题[/bold]                                 │\n")
    content.append(f"  │  [dim]{tls.get('subject', '-')}[/dim]  │\n")
    content.append(f"  ├─────────────────────────────────────┤\n")
    content.append(f"  │ [bold]🏛️  签发者[/bold]                               │\n")
    content.append(f"  │  [dim]{tls.get('issuer', '-')}[/dim]  │\n")
    content.append(f"  ├─────────────────────────────────────┤\n")
    content.append(f"  │ [bold]🔗 SANs: {tls.get('sans_count', 0)} 个[/bold]                        │\n")

    sans = tls.get("sans", [])
    if sans:
        for s in sans[:4]:
            content.append(f"  │  [dim]● {s}[/dim]  │\n")
        if len(sans) > 4:
            content.append(f"  │  [dim]... 还有 {len(sans) - 4} 个[/dim]           │\n")
    content.append(f"  ├─────────────────────────────────────┤\n")
    content.append(f"  │ [bold]🔐 协议:[/bold] {tls.get('version', '-')}                        │\n")
    content.append(f"  │ [bold]🔑 加密:[/bold] [dim]{tls.get('cipher', '-')}[/dim]  │\n")
    content.append(f"  └─────────────────────────────────────┘\n")

    return Panel(content, title="📜 TLS/SSL 证书审查", border_style=f"bold {v_color}", box=box.HEAVY, padding=(1, 2))


def build_cookie_panel(cookies: list) -> Panel:
    """Cookie 安全面板"""
    if not cookies:
        return Panel("[green]✅ 无 Cookie，无风险[/green]", title="🍪 Cookie 安全分析", border_style="green")

    table = Table(box=box.ROUNDED, border_style="bright_yellow", header_style="bold bright_yellow")
    table.add_column("Cookie 名", width=20)
    table.add_column("HttpOnly", justify="center", width=10)
    table.add_column("Secure", justify="center", width=10)
    table.add_column("SameSite", justify="center", width=18)
    table.add_column("整体", justify="center", width=8)

    for c in cookies:
        hp = "[green]✅[/green]" if c["httponly"] else "[red]❌[/red]"
        sp = "[green]✅[/green]" if c["secure"] else "[red]❌[/red]"
        ss = f"[green]{c['samesite_value']}[/green]" if c["samesite"] else "[red]❌[/red]"
        all_ok = c["httponly"] and c["secure"] and c["samesite"]
        overall = "[green]✅[/green]" if all_ok else "[yellow]⚠️[/yellow]"
        table.add_row(c["name"], hp, sp, ss, overall)

    return Panel(table, title="🍪 Cookie 安全分析", border_style="bright_yellow", box=box.HEAVY)


def build_score_panel(score_info: dict) -> Panel:
    """安全评分面板 — 增强版"""
    s = score_info
    grade = s["grade"]
    score = s["score"]
    color = s["color"]
    badge = s["badge"]

    # Large ASCII grade block
    grade_art = {
        "A+": f"""{color}   ▄▄▄██████▄▄▄       ▄▄▄▄▄▄▄▄▄▄▄
  ██████████████   ▄████████████████
 ██  ██  ██  ██   ██  ██  ██  ██  ██
 ██  ██  ██  ██   ██  ██  ██  ██  ██
 ██████████████   ████████████████
   ▀▀██████▀▀▀     ▀▀▀██████▀▀▀[/]""",
        "A": f"""{color}   ▄▄▄██████▄▄▄
  ██████████████
 ██  ██  ██  ██
 ██  ██  ██  ██
 ██████████████
   ▀▀██████▀▀▀[/]""",
        "B": f"""{color}  ▄▄▄▄▄▄▄▄▄▄▄
 ████████████████
 ██  ██  ██  ██
 ████████████████
 ██  ██  ██  ██
  ▀▀▀▀▀▀▀▀▀▀▀[/]""",
        "C": f"""{color}   ▄▄▄▄▄▄▄▄▄
 ████████████████
 ██
 ██
 ████████████████
   ▀▀▀▀▀▀▀▀▀[/]""",
        "D": f"""{color}  ▄▄▄▄▄▄▄▄▄▄▄
 ████████████████
 ██  ██████  ██
 ██  ██████  ██
 ████████████████
  ▀▀▀▀▀▀▀▀▀▀▀[/]""",
        "F": f"""{color}  ▄▄▄▄▄▄▄▄▄▄▄
 ████████████████
 ██  ██████  ██
 ██  ██████  ██
 ██  ██████  ██
  ▀▀▀▀▀▀▀▀▀▀▀[/]"""
    }

    # Use the best match
    grade_key = grade if grade in grade_art else grade[0] if grade[0] in grade_art else "C"
    ascii_grade = grade_art.get(grade_key, "")

    content = Text()
    # Big grade display
    content.append(f"\n{ascii_grade}\n\n")

    # Score bar with percentage
    bar_w = 30
    filled = int(score / 100 * bar_w)
    bar = f"{color}{'█' * filled}[/]{color}{'░' * (bar_w - filled)}[/]"
    content.append(f"  [bold]安全评分:[/bold]  {bar}  [bold]{score}/100[/bold]\n\n")

    # Grade description
    content.append(f"  {color}{badge} {grade} —[/] [dim]{s.get('description', '')}[/dim]\n\n")

    # Sub-scores with better bars
    content.append(f"  [bold]📊 各项详细得分:[/bold]\n")
    for key, score_val, icon in s.get("details", []):
        name = SECURITY_HEADERS.get(key, {}).get("name", key)
        total_w = SECURITY_HEADERS.get(key, {}).get("weight", 10) or 1
        pct = int(score_val / total_w * 100)
        bar_w2 = 15
        filled2 = int(pct / 100 * bar_w2)
        if icon == "✅":
            bar2 = f"[green]{'█' * filled2}{'░' * (bar_w2 - filled2)}[/green]"
        elif icon == "⚠️":
            bar2 = f"[yellow]{'█' * filled2}{'░' * (bar_w2 - filled2)}[/yellow]"
        else:
            bar2 = f"[red]{'█' * filled2}{'░' * (bar_w2 - filled2)}[/red]"

        pct_color = "green" if pct >= 80 else "yellow" if pct >= 40 else "red"
        content.append(f"    {icon} {bar2}  [dim]{name}[/dim]  ([{pct_color}]{pct}%[/{pct_color}])\n")

    # TLS bonus
    tls = score_info.get("_tls", {})
    if tls.get("valid"):
        content.append(f"\n  [bold]🔐 TLS 加分:[/bold]\n")
        if not tls.get("expired"):
            content.append(f"    [green]✅[/green] [dim]证书有效 (+5)[/dim]\n")
        if tls.get("days_left", 0) > 90:
            content.append(f"    [green]✅[/green] [dim]有效期充足 (+3)[/dim]\n")
        elif tls.get("days_left", 0) > 30:
            content.append(f"    [yellow]⚠️[/yellow] [dim]有效期较短 (+2)[/dim]\n")

    return Panel(content, title="[bold]🏆 安全综合评分[/bold]", border_style="bold", box=box.HEAVY, padding=(1, 2))


def build_recommendation_panel(results: dict) -> Panel:
    """改进建议面板"""
    recs = []
    for key in HEADER_ORDER:
        r = results.get(key)
        if not r or r.get("weight", 0) == 0:
            continue
        if not r.get("secure"):
            fix = r.get("fix", "")
            name = SECURITY_HEADERS.get(key, {}).get("name", key)
            if fix:
                recs.append((key, name, fix))

    if not recs:
        return Panel("[green]✅ 所有安全配置均已达标[/green]", title="📋 改进建议", border_style="green")

    content = Text()
    for i, (key, name, fix) in enumerate(recs, 1):
        severity = "🔴" if SECURITY_HEADERS.get(key, {}).get("weight", 0) >= 10 else "🟡"
        content.append(f"  {i}. {severity} [bold]{name}[/bold]\n")
        content.append(f"     [dim]{fix}[/dim]\n\n")

    return Panel(content, title="📋 安全改进建议", border_style="bold yellow", box=box.HEAVY, padding=(1, 2))


def build_summary_panel(url: str, score_info: dict, tls: dict, cookies: list, elapsed: float) -> Panel:
    """扫描总览 — 增强版"""
    header_good = sum(1 for _, _, icon in score_info.get("details", []) if icon == "✅")
    header_warn = sum(1 for _, _, icon in score_info.get("details", []) if icon == "⚠️")
    header_bad = sum(1 for _, _, icon in score_info.get("details", []) if icon != "✅" and icon != "⚠️")
    total = len(HEADER_ORDER)

    # Mini header bar
    bar_w = 20
    good_f = int(header_good / total * bar_w)
    warn_f = int(header_warn / total * bar_w)
    bad_f = max(0, bar_w - good_f - warn_f)
    header_bar = f"[green]{'█' * good_f}[/green][yellow]{'█' * warn_f}[/yellow][red]{'█' * bad_f}[/red]"

    cookie_count = len(cookies)
    cookie_all_safe = all(c.get("httponly") and c.get("secure") for c in cookies) if cookies else True
    tls_ok = tls.get("valid") and not tls.get("expired")

    grade = score_info['grade']
    score = score_info['score']

    content = Text()
    content.append(f"\n  [bold]🎯 目标:[/bold]       [white]{urlparse(url).netloc}[/white]\n")
    content.append(f"  [bold]🔒 安全头:[/bold]     {header_bar}  [green]✅{header_good}[/green] [yellow]⚠️{header_warn}[/yellow] [red]❌{header_bad}[/red]\n")
    content.append(f"  [bold]📜 TLS:[/bold]        {'[green]✅ 证书有效[/green]' if tls_ok else '[red]❌ 证书异常[/red]'}  ")
    content.append(f"{'[yellow]⚠️ 即将过期[/yellow]' if tls.get('expiring') else ''}")
    content.append(f"{'[red]💀 已过期[/red]' if tls.get('expired') else ''}\n")
    content.append(f"  [bold]🍪 Cookie:[/bold]     {'[green]✅ 安全[/green]' if cookie_all_safe else '[yellow]⚠️ 部分不安全[/yellow]'}  [dim]{cookie_count} 个[/dim]\n")
    content.append(f"  [bold]🏆 评级:[/bold]       {score_info['color']}{score_info['badge']} {grade} ( {score}/100 )[/]\n")

    # Mini gauge
    gauge_w = 25
    gauge_f = int(score / 100 * gauge_w)
    gauge_color = "red" if score < 40 else "yellow" if score < 70 else "green"
    gauge = f"[{gauge_color}]{'█' * gauge_f}[/{gauge_color}][dim]{'░' * (gauge_w - gauge_f)}[/dim]"
    content.append(f"  [bold]⏱️  用时:[/bold]       [magenta]{elapsed:.1f}s[/magenta]     {gauge}\n")

    return Panel(content, title="[bold bright_white]📊 扫描总览[/bold bright_white]", border_style="bold bright_green", box=box.DOUBLE_EDGE, padding=(1, 2))


# ============================================================
#  HTML REPORT
# ============================================================

def export_html(url: str, results: dict, tls: dict, cookies: list, score_info: dict, elapsed: float, filename: str):
    """导出 HTML 报告"""
    # Header rows
    header_rows = ""
    for key in HEADER_ORDER:
        r = results.get(key)
        if not r:
            continue
        name = SECURITY_HEADERS.get(key, {}).get("name", key)

        if r.get("excellent"):
            status = "✅ 优秀"
            color = "#7ec88e"
        elif r.get("secure"):
            status = "⚠️ 基本"
            color = "#ffae57"
        elif r.get("present"):
            status = "❌ 不安全"
            color = "#ff657a"
        else:
            status = "❌ 缺失"
            color = "#ff657a"

        val = r.get("value", "-")
        header_rows += f"<tr><td>{name}</td><td><span style='color:{color}'>{status}</span></td><td style='font-size:.8rem;color:#686b71'>{val}</td></tr>\n"

    # Cookie rows
    cookie_rows = ""
    for c in cookies:
        hp = "✅" if c["httponly"] else "❌"
        sp = "✅" if c["secure"] else "❌"
        ss = c["samesite_value"] if c["samesite"] else "❌"
        cookie_rows += f"<tr><td>{c['name']}</td><td>{hp}</td><td>{sp}</td><td>{ss}</td></tr>\n"

    # TLS cert info
    tls_html = ""
    if tls.get("valid"):
        tls_html = f"""<div class="geo-card">
            <div class="ip">📜 TLS 证书信息</div>
            <div class="loc">签发者: {tls.get('issuer','-')}</div>
            <div class="coord">主题: {tls.get('subject','-')}</div>
            <div class="loc">有效期: {tls.get('not_before','-')} ~ {tls.get('not_after','-')} ({tls.get('days_left',0)} 天)</div>
            <div class="coord">协议: {tls.get('version','-')} · 加密: {tls.get('cipher','-')} · SANs: {tls.get('sans_count',0)} 个</div>
        </div>"""

    # Grade color
    grade_colors = {"A+": "#7ec88e", "A": "#7ec88e", "B": "#5ccfe6", "C": "#ffae57", "D": "#ff657a", "F": "#ff3b3b"}
    gc = grade_colors.get(score_info["grade"], "#686b71")

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🛡️ ShieldScan 安全报告 — {url}</title>
<style>
  *{{margin:0;padding:0;box-sizing:border-box}}
  body{{background:#0a0e14;color:#e6e1cf;font-family:'SF Mono','JetBrains Mono',monospace;padding:2rem;line-height:1.7}}
  .container{{max-width:1100px;margin:0 auto}}
  h1{{font-size:1.8rem;color:#ffae57;margin-bottom:.5rem}}
  h2{{font-size:1.3rem;color:#5ccfe6;margin:1.5rem 0 .8rem;border-bottom:1px solid #2e3a47;padding-bottom:.3rem}}
  .subtitle{{color:#686b71;margin-bottom:2rem}}
  .grade-badge{{font-size:3rem;text-align:center;padding:2rem;margin:1rem 0;border-radius:12px;border:2px solid {gc};background:linear-gradient(135deg,#141a23,#1a1a1a)}}
  .grade-badge .letter{{font-size:4rem;font-weight:bold;color:{gc}}}
  .grade-badge .score{{font-size:1rem;color:#686b71;margin-top:.5rem}}
  .stats{{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.8rem;margin:1rem 0 2rem}}
  .stat-card{{background:#141a23;border:1px solid #2e3a47;border-radius:8px;padding:1rem;text-align:center}}
  .stat-card .val{{font-size:1.6rem;font-weight:bold}}
  .stat-card .lbl{{font-size:.7rem;color:#686b71;text-transform:uppercase;letter-spacing:1px}}
  .geo-card{{background:linear-gradient(135deg,#141a23,#1a1a1a);border:1px solid #5ccfe6;border-radius:8px;padding:1.2rem;margin:1rem 0 2rem}}
  .geo-card .ip{{font-size:1.1rem;color:#5ccfe6;font-weight:bold;margin-bottom:.5rem}}
  .geo-card .loc{{font-size:.85rem;color:#686b71;margin-top:.2rem}}
  .geo-card .coord{{font-size:.8rem;color:#ffae57;margin-top:.2rem}}
  table{{width:100%;border-collapse:collapse;margin:1rem 0}}
  th,td{{padding:.6rem .8rem;text-align:left;border-bottom:1px solid #2e3a47}}
  th{{color:#5ccfe6;font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:1px}}
  td{{font-size:.82rem}}
  footer{{margin-top:3rem;text-align:center;color:#3a4550;font-size:.8rem;padding:1rem 0}}
</style>
</head>
<body>
<div class="container">
  <h1>🛡️ ShieldScan 安全报告</h1>
  <p class="subtitle">🎯 {url} · ⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} · ⏱️ {elapsed:.1f}s</p>

  <div class="grade-badge">
    <div class="letter">{score_info['badge']} {score_info['grade']}</div>
    <div class="score">安全评分 · {score_info['score']}/100 · {score_info['description']}</div>
  </div>

  <div class="stats">
    <div class="stat-card"><div class="val cyan">{len(HEADER_ORDER)}</div><div class="lbl">检测项</div></div>
    <div class="stat-card"><div class="val green">{sum(1 for r in results.values() if isinstance(r,dict) and r.get('secure'))}</div><div class="lbl">通过</div></div>
    <div class="stat-card"><div class="val red">{sum(1 for r in results.values() if isinstance(r,dict) and not r.get('secure') and r.get('weight',0) > 0)}</div><div class="lbl">未通过</div></div>
    <div class="stat-card"><div class="val yellow">{len(cookies)}</div><div class="lbl">Cookie</div></div>
    <div class="stat-card"><div class="val cyan">{elapsed:.1f}s</div><div class="lbl">用时</div></div>
  </div>

  {tls_html}

  <h2>🔒 HTTP 安全头</h2>
  <table><thead><tr><th>安全头</th><th>状态</th><th>当前值</th></tr></thead><tbody>{header_rows}</tbody></table>

  {"<h2>🍪 Cookie 安全</h2><table><thead><tr><th>名称</th><th>HttpOnly</th><th>Secure</th><th>SameSite</th></tr></thead><tbody>" + cookie_rows + "</tbody></table>" if cookie_rows else ""}

  <h2>📋 改进建议</h2>
  <ul style="color:#686b71;font-size:.85rem">
    {''.join(f"<li style='padding:.3rem 0;border-bottom:1px solid #1a1a1a'><strong>{SECURITY_HEADERS.get(k,{}).get('name',k)}</strong>: {v.get('fix','')}</li>" for k,v in results.items() if isinstance(v,dict) and not v.get('secure') and v.get('weight',0) > 0)}
  </ul>

  <footer>🛡️ Generated by ShieldScan · Web Security Analyzer · {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</footer>
</div>
</body>
</html>"""

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(html)
    return filename


# ============================================================
#  MAIN
# ============================================================

def run_scan(target_url: str, output_html: str = None):
    """执行扫描"""
    console.clear()
    print_banner()
    scanner = ShieldScan(target_url)
    scanner.start_time = time.time()
    console.print(build_target_panel(scanner.url))
    console.print()

    # Phase 1: HTTP Headers
    with Progress(
        SpinnerColumn("dots", style="bright_cyan"),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(bar_width=None, complete_style="bright_green"),
        TimeElapsedColumn(),
        console=console,
    ) as p:
        task = p.add_task("[bright_cyan]🔒  扫描 HTTP 安全头 ...", total=None)
        results = scanner.scan_headers()
        p.update(task, completed=1)

    if "_error" in results:
        console.print(f"[red]❌ 扫描失败: {results['_error']}[/red]")
        return

    console.print(build_header_table(results))
    console.print()

    # Phase 2: TLS
    with Progress(
        SpinnerColumn("dots", style="green"),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(bar_width=None, complete_style="green"),
        TimeElapsedColumn(),
        console=console,
    ) as p:
        task = p.add_task("[green]📜  审查 TLS 证书 ...", total=None)
        tls = scanner.scan_tls()
        p.update(task, completed=1)

    console.print(build_tls_panel(tls))
    console.print()

    # Phase 3: Cookies
    cookies = scanner.scan_cookies()
    if cookies:
        console.print(build_cookie_panel(cookies))
        console.print()

    # Phase 4: Score
    score_info = scanner.calculate_score()
    score_info["_tls"] = tls
    console.print(build_score_panel(score_info))
    console.print()

    # Phase 5: Recommendations
    console.print(build_recommendation_panel(results))
    console.print()

    elapsed = time.time() - scanner.start_time

    # Summary
    console.print(build_summary_panel(scanner.url, score_info, tls, cookies, elapsed))
    console.print()

    # Export
    if output_html:
        try:
            path = export_html(scanner.url, results, tls, cookies, score_info, elapsed, output_html)
            console.print(f"[green]✅  HTML 报告已导出: [white]{path}[/white][/green]")
        except Exception as e:
            console.print(f"[red]❌  HTML 导出失败: {e}[/red]")

    console.print(COMPLETE_ART, justify="center")


def interactive_mode():
    console.clear()
    console.print(BANNER, justify="center")
    console.print(Rule(style="bright_cyan"))
    url = Prompt.ask("[bold cyan]🎯 目标网站 URL[/bold cyan]", default="https://example.com")
    output_html = None
    if Confirm.ask("[bold cyan]📄 导出 HTML 报告？[/bold cyan]", default=True):
        output_html = Prompt.ask("  文件名", default=f"shieldscan_{int(time.time())}.html")
    run_scan(url, output_html)


def cli_mode():
    args = sys.argv[1:]
    if not args:
        interactive_mode()
        return
    target = args[0]
    output_html = None
    for i, a in enumerate(args):
        if a in ['--html', '-o'] and i + 1 < len(args):
            output_html = args[i + 1]
    run_scan(target, output_html)


def signal_handler(sig, frame):
    console.print("\n\n[yellow][STOP]  扫描已中断[/yellow]")
    sys.exit(0)

def main():
    signal.signal(signal.SIGINT, signal_handler)
    if len(sys.argv) > 1:
        cli_mode()
    else:
        interactive_mode()

if __name__ == "__main__":
    main()
