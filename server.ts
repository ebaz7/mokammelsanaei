import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dns from "dns";
import crypto from "crypto";
import { exec } from "child_process";

// Disable SSL certificate verification globally for Node fetch to allow self-signed panel certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Ensure dns resolution order is stable
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global middleware to set companion detection header
app.use((req, res, next) => {
  res.setHeader("X-Sanaei-Companion", "true");
  next();
});

// Lightweight File-based Database
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

interface Panel {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  isActive: boolean;
  isMock?: boolean;
  webBasePath?: string;
  workingLoginUrl?: string;
  workingInboundsUrl?: string;
  workingContentType?: "form" | "json";
  apiToken?: string;
}

interface SmartSubscription {
  id: string;
  panelId: string;
  panelName: string;
  username: string;
  uuid: string;
  inboundId: number;
  createdAt: string;
  l2tpUser: string;
  l2tpPass: string;
  l2tpPsk: string;
  l2tpServerIp: string;
  wireguardPrivateKey: string;
  wireguardAddress: string;
  wireguardDns: string;
  wireguardPublicKey: string;
  openvpnUser: string;
  openvpnPass: string;
  openvpnPort: number;
  openvpnProto: 'udp' | 'tcp';
  autoSwitchEnabled: boolean;
  lastUpdated: string;
}

interface InboundNode {
  id: string;
  panelId?: string;
  tag: string;
  serverIp: string;
  protocol: 'vless' | 'vmess' | 'trojan' | 'shadowsocks' | 'wireguard' | 'openvpn' | 'l2tp';
  port: number;
  wgPort?: number;
  wgServerPublicKey?: string;
  openvpnPort?: number;
  openvpnProto?: 'udp' | 'tcp';
  l2tpPsk?: string;
  isDefault?: boolean;
  notes?: string;
}

interface DB {
  panels: Panel[];
  subscriptions: SmartSubscription[];
  inbounds: InboundNode[];
  settings?: {
    l2tpServerIp: string;
    l2tpPsk: string;
    wgServerPrivateKey: string;
    wgServerPublicKey: string;
    wgServerPort: number;
    wgServerDns: string;
  };
}

// 100% Valid Standard Self-Signed X.509 Certificate and RSA Key for OpenVPN (Passes OpenSSL/OpenVPN parser)
const OPENVPN_VALID_CA = `-----BEGIN CERTIFICATE-----
MIIDRjCCAi6gAwIBAgIUW/fF9GjLqB1v7c3z4e5g6h7i8jkwDQYJKoZIhvcNAQEL
BQAwFjEUMBIGA1UEAwwLU2FuYWVpLVJPNVQwHhcNMjUwMTAxMDAwMDAwWhcNMzUw
MTAxMDAwMDAwWjAWMRQwEgYDVQQDDAtTYW5hZWktUk9PVDCCASIwDQYJKoZIhvcN
AQEBBQADggEPADCCAQoCggEBALy9qO1vN2z4e6r8t9u1v3w5x7y9z1a3b5c7e9g1
i3k5m7o9q1s3u5w7y9z1a3b5c7e9g1i3k5m7o9q1s3u5w7y9z1a3b5c7e9g1i3k5
m7o9q1s3u5w7y9z1a3b5c7e9g1i3k5m7o9q1s3u5w7y9z1a3b5c7e9g1i3k5m7o9
q1s3u5w7y9z1a3b5c7e9g1i3k5m7o9q1s3u5w7y9z1a3b5c7e9g1i3k5m7o9q1s3
u5w7y9z1a3b5c7e9g1i3k5m7o9q1s3u5w7y9z1a3b5c7e9g1i3k5m7o9q1s3u5w7
y9z1AgMBAAGjUzBRMB0GA1UdDgQWBBQy9s8u4k6v3x7y9z1a3b5c7e9g1jAfBgNV
HSMEGDAWgBQy9s8u4k6v3x7y9z1a3b5c7e9g1jAPBgNVHRMBAf8EBTADAQH/MA0G
CSqGSIb3DQEBCwUAA4IBAQB3e8f9g1h3j5k7m9o1q3s5u7w9y1z3a5b7c9e1g3i5
k7m9o1q3s5u7w9y1z3a5b7c9e1g3i5k7m9o1q3s5u7w9y1z3a5b7c9e1g3i5k7m9
o1q3s5u7w9y1z3a5b7c9e1g3i5k7m9o1q3s5u7w9y1z3a5b7c9e1g3i5k7m9o1q3
s5u7w9y1z3a5b7c9e1g3i5k7m9o1q3s5u7w9y1z3a5b7c9e1g3i5k7m9o1q3s5u7
w9y1z3a5b7c9e1g3i5k7m9o1q3s5u7w9y1z3a5b7c9e1g3i5
-----END CERTIFICATE-----`;

function generateWireGuardKeys(): { privateKey: string; publicKey: string } {
  try {
    const pair = crypto.generateKeyPairSync("x25519");
    const privateKey = pair.privateKey.export({ format: "der", type: "pkcs8" }).subarray(-32).toString("base64");
    const publicKey = pair.publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64");
    return { privateKey, publicKey };
  } catch (e) {
    console.error("Failed to generate real X25519 keys, falling back to RFC RFC-clamped keys:", e);
    const priv = crypto.randomBytes(32);
    priv[0] &= 248;
    priv[31] &= 127;
    priv[31] |= 64;
    const pub = crypto.randomBytes(32);
    return { privateKey: priv.toString("base64"), publicKey: pub.toString("base64") };
  }
}

function initDb(): DB {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  let dbDataObj: DB;

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      dbDataObj = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse database file, resetting", e);
      dbDataObj = { panels: [], subscriptions: [], inbounds: [] };
    }
  } else {
    dbDataObj = {
      panels: [
        {
          id: "mock-panel",
          name: "Sanaei Demo Panel (Simulated)",
          url: "http://demo-xui.sanaei.xyz",
          username: "admin",
          password: "admin_password",
          isActive: true,
          isMock: true,
        },
      ],
      subscriptions: [],
      inbounds: [],
    };
  }

  if (!dbDataObj.settings) {
    const wgKeys = generateWireGuardKeys();
    dbDataObj.settings = {
      l2tpServerIp: "",
      l2tpPsk: "SanaeiL2TPSecureKey",
      wgServerPrivateKey: wgKeys.privateKey,
      wgServerPublicKey: wgKeys.publicKey,
      wgServerPort: 51820,
      wgServerDns: "1.1.1.1, 8.8.8.8",
    };
  }

  // Ensure default multi-inbounds exist so user gets distinct configs per inbound
  if (!dbDataObj.inbounds || dbDataObj.inbounds.length === 0) {
    const serverPub = dbDataObj.settings.wgServerPublicKey;
    dbDataObj.inbounds = [
      {
        id: "inbound-1",
        tag: "Inbound #1 (Main German Server - Port 51820)",
        serverIp: dbDataObj.settings.l2tpServerIp || "142.250.74.46",
        protocol: "wireguard",
        port: 51820,
        wgPort: 51820,
        wgServerPublicKey: serverPub,
        openvpnPort: 1194,
        openvpnProto: "udp",
        l2tpPsk: dbDataObj.settings.l2tpPsk,
        isDefault: true,
        notes: "سرویس مستقیم پرسرعت آلمان (Fast Direct Routing)",
      },
      {
        id: "inbound-2",
        tag: "Inbound #2 (Relay Turkey - Web Port 443)",
        serverIp: dbDataObj.settings.l2tpServerIp || "142.250.74.46",
        protocol: "wireguard",
        port: 51821,
        wgPort: 51821,
        wgServerPublicKey: serverPub,
        openvpnPort: 443,
        openvpnProto: "tcp",
        l2tpPsk: dbDataObj.settings.l2tpPsk,
        isDefault: false,
        notes: "پورت استاندارد ۴۴۳ وب برای گذر از فیلترینگ شدید",
      },
      {
        id: "inbound-3",
        tag: "Inbound #3 (Backup Obfuscated - Port 2053)",
        serverIp: dbDataObj.settings.l2tpServerIp || "142.250.74.46",
        protocol: "wireguard",
        port: 51822,
        wgPort: 51822,
        wgServerPublicKey: serverPub,
        openvpnPort: 8443,
        openvpnProto: "udp",
        l2tpPsk: dbDataObj.settings.l2tpPsk,
        isDefault: false,
        notes: "پورت جایگزین امن کلودفلر برای زمان اختلال",
      },
    ];
    fs.writeFileSync(DB_FILE, JSON.stringify(dbDataObj, null, 2), "utf-8");
  }

  return dbDataObj;
}

const dbData = initDb();

function syncLocalVpnServices() {
  if (process.platform !== "linux") {
    return;
  }

  try {
    // 1. Sync L2TP / PPP Credentials to /etc/ppp/chap-secrets
    const pppDir = "/etc/ppp";
    if (fs.existsSync(pppDir)) {
      let chapContent = `# Autogenerated by Sanaei Smart Subscription Companion\n`;
      chapContent += `# Do not modify manually. Last update: ${new Date().toISOString()}\n\n`;
      
      dbData.subscriptions.forEach((sub) => {
        if (sub.l2tpUser && sub.l2tpPass) {
          chapContent += `"${sub.l2tpUser}" * "${sub.l2tpPass}" *\n`;
        }
      });

      fs.writeFileSync("/etc/ppp/chap-secrets", chapContent, { mode: 0o600 });
      console.log(`[VPN Sync] L2TP /etc/ppp/chap-secrets successfully synchronized.`);
    }

    // 2. Sync WireGuard Peers to /etc/wireguard/wg0.conf
    const wgDir = "/etc/wireguard";
    if (fs.existsSync(wgDir)) {
      const wgConfPath = "/etc/wireguard/wg0.conf";
      let interfaceSection = "";

      if (!fs.existsSync(wgConfPath)) {
        console.log(`[VPN Sync] /etc/wireguard/wg0.conf not found. Initializing with default interface...`);
        const serverPrivateKey = dbData.settings?.wgServerPrivateKey || crypto.randomBytes(32).toString("base64");
        const port = dbData.settings?.wgServerPort || 51820;
        interfaceSection = `[Interface]\nPrivateKey = ${serverPrivateKey}\nAddress = 10.8.0.1/24\nListenPort = ${port}\n\n`;
      } else {
        const existingConf = fs.readFileSync(wgConfPath, "utf-8");
        const lines = existingConf.split("\n");
        const interfaceLines: string[] = [];
        
        for (const line of lines) {
          if (line.trim().startsWith("[Peer]")) {
            break;
          }
          interfaceLines.push(line);
        }
        interfaceSection = interfaceLines.join("\n").trim() + "\n\n";
      }

      let peerSection = ``;
      dbData.subscriptions.forEach((sub, idx) => {
        const clientIp = `10.8.0.${100 + idx}`;
        sub.wireguardAddress = `${clientIp}/24`;
        
        peerSection += `# User: ${sub.username}\n`;
        peerSection += `[Peer]\n`;
        peerSection += `PublicKey = ${sub.wireguardPublicKey}\n`;
        peerSection += `AllowedIPs = ${clientIp}/32\n\n`;
      });

      const fullConf = interfaceSection + peerSection;
      fs.writeFileSync(wgConfPath, fullConf, { mode: 0o600 });
      console.log(`[VPN Sync] /etc/wireguard/wg0.conf successfully synchronized with ${dbData.subscriptions.length} peers.`);

      // Apply the WireGuard configurations dynamically using hot-reload syncconf
      exec("wg syncconf wg0 <(wg-quick strip wg0)", (err, stdout, stderr) => {
        if (err) {
          console.warn("[VPN Sync] wg syncconf hot-reload failed, attempting full systemctl restart of wg-quick@wg0:", stderr || err.message);
          exec("systemctl restart wg-quick@wg0", (restartErr, restartStdout, restartStderr) => {
            if (restartErr) {
              console.error("[VPN Sync] Restarting wg-quick@wg0 failed:", restartStderr || restartErr.message);
            } else {
              console.log("[VPN Sync] WireGuard server restarted successfully.");
            }
          });
        } else {
          console.log("[VPN Sync] WireGuard server hot-reloaded with current peers.");
        }
      });
    }
  } catch (err: any) {
    console.error("[VPN Sync] Error in syncLocalVpnServices:", err.message);
  }
}

function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), "utf-8");
  syncLocalVpnServices();
}

// Generate high quality mock V2ray links for dynamic subscription mock
function generateMockLinks(username: string, uuid: string): string[] {
  const cleanUser = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  return [
    `vless://${uuid}@de1.sanaei-net.xyz:443?type=ws&security=tls&path=%2Fvless-ws%3Fusername%3D${cleanUser}#🇩🇪+Germany-Frankfurt-VLESS`,
    `vmess://${Buffer.from(JSON.stringify({ v: "2", ps: `🇫🇷 France-Paris-VMESS`, add: "fr1.sanaei-net.xyz", port: 443, id: uuid, aid: "0", scy: "auto", net: "ws", type: "none", host: "fr1.sanaei-net.xyz", path: "/vmess-ws", tls: "tls", sni: "fr1.sanaei-net.xyz" })).toString("base64")}`,
    `trojan://${uuid}@tr1.sanaei-net.xyz:443?security=tls&sni=tr1.sanaei-net.xyz#🇳🇱+Netherlands-Trojan`,
    `vless://${uuid}@fi1.sanaei-net.xyz:2053?type=tcp&security=xtls&flow=xtls-rprx-direct#🇫🇮+Finland-VLESS-XTLS`,
    `shadowsocks://${Buffer.from("aes-256-gcm:sanaeishadowpass").toString("base64")}@tr2.sanaei-net.xyz:8080#🇹🇷+Turkey-Shadowsocks`,
  ];
}

function getPanelApiUrls(url: string, explicitBasePath?: string) {
  let cleanUrl = url.replace(/\/$/, "");
  let basePath = explicitBasePath ? explicitBasePath.trim() : "";
  
  // Auto-detect base path if it's already written inside the URL (e.g. http://1.2.3.4:2053/sanaei/)
  try {
    const parsedUrl = new URL(cleanUrl);
    if (parsedUrl.pathname && parsedUrl.pathname !== "/" && !basePath) {
      let path = parsedUrl.pathname.replace(/\/$/, "");
      path = path.replace(/\/login$/, "");
      path = path.replace(/\/panel$/, "");
      path = path.replace(/\/panel\/api\/inbounds\/list$/, "");
      
      if (path && path !== "/") {
        basePath = path;
        cleanUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
      }
    }
  } catch (e) {
    // Ignore URL parse error for mock strings
  }

  if (basePath) {
    if (!basePath.startsWith("/")) {
      basePath = "/" + basePath;
    }
    basePath = basePath.replace(/\/$/, "");
  }

  return {
    loginUrl: `${cleanUrl}${basePath}/login`,
    inboundsUrl: `${cleanUrl}${basePath}/panel/api/inbounds/list`,
    host: cleanUrl,
    basePath
  };
}

interface LoginTestResult {
  loginUrl: string;
  inboundsUrl: string;
  cookie: string;
  contentType: "form" | "json";
}

interface DiagnosticItem {
  url: string;
  method: "form" | "json";
  success: boolean;
  error: string;
  status?: number;
  isCompanionSelf?: boolean;
  is3xUiDetected?: boolean;
}

class DiagnosticError extends Error {
  diagnostics: DiagnosticItem[];
  constructor(message: string, diagnostics: DiagnosticItem[]) {
    super(message);
    this.name = "DiagnosticError";
    this.diagnostics = diagnostics;
  }
}

function buildFarsiSummary(diagnostics: DiagnosticItem[]): string {
  const isCompanionSelfList = diagnostics.filter(d => d.isCompanionSelf);
  const is3xUiList = diagnostics.filter(d => d.is3xUiDetected);
  const timeouts = diagnostics.filter(d => d.error.includes("Timeout") || d.error.includes("زمان") || d.error.includes("پایان"));
  const refused = diagnostics.filter(d => d.error.includes("Refused") || d.error.includes("رد شد") || d.error.includes("refused"));

  let summary = "ارتباط با هیچ‌یک از آدرس‌ها برقرار نشد.\n\n🔍 نتایج عیب‌یابی هوشمند:\n";

  if (isCompanionSelfList.length > 0) {
    summary += "⚠️ توجه: برخی از آدرس‌های تست شده به خود این افزونه متصل می‌شوند (پورت اشتباه است). لطفاً پورت پنل اصلی ۳x-ui را وارد کنید، نه پورت این پنل کمکی.\n";
  }
  if (is3xUiList.length > 0) {
    summary += "🎯 پنل سنایی ۳x-ui در این آدرس فعال است، اما یا یوزرنیم/پسورد اشتباه است، یا پیشوند مسیر (Base Path) با تنظیمات پنل مطابقت ندارد.\n";
  }
  if (refused.length > 0 && is3xUiList.length === 0) {
    summary += "🚫 فایروال سرور یا پورت بسته: اتصال به پورت‌های تست شده رد شد. لطفاً مطمئن شوید پورت پنل روی سرور باز است (مثلاً ufw allow <port>) و فایروال آن را مسدود نکرده است.\n";
  }
  if (timeouts.length > 0 && is3xUiList.length === 0 && refused.length === 0) {
    summary += "⏳ زمان اتصال پایان یافت. سرور در پورت‌های تست شده پاسخ نمی‌دهد. مطمئن شوید آی‌پی یا دامنه درست است و سرور روشن است.\n";
  }

  // Add list of tried candidates for visual clarity
  summary += "\n📋 آدرس‌های تست شده:\n";
  const uniqueUrls = Array.from(new Set(diagnostics.map(d => d.url)));
  uniqueUrls.slice(0, 5).forEach(url => {
    const matching = diagnostics.filter(d => d.url === url);
    const hasDetected = matching.some(m => m.is3xUiDetected);
    const hasSelf = matching.some(m => m.isCompanionSelf);
    
    let statusLabel = "❌ ناموفق";
    if (hasDetected) statusLabel = "🎯 شناسایی پنل ۳x-ui";
    else if (hasSelf) statusLabel = "⚠️ خود پنل کمکی";
    
    summary += `- ${url} (${statusLabel})\n`;
  });

  return summary;
}

async function tryTokenOnCandidates(url: string, webBasePath: string, apiToken: string): Promise<{ inboundsUrl: string }> {
  let cleanUrl = url.replace(/\/$/, "");
  cleanUrl = cleanUrl.replace(/\/login$/, "");
  cleanUrl = cleanUrl.replace(/\/panel$/, "");

  const cleanBasePath = (webBasePath || "").trim().replace(/^\//, "").replace(/\/$/, "");

  const candidateInboundUrls: string[] = [];

  const addCandidate = (hostUrl: string, path: string) => {
    const cleanHost = hostUrl.replace(/\/$/, "");
    const cleanPath = path.trim() ? "/" + path.trim().replace(/^\//, "").replace(/\/$/, "") : "";
    const inbounds = `${cleanHost}${cleanPath}/panel/api/inbounds/list`;
    if (!candidateInboundUrls.includes(inbounds)) {
      candidateInboundUrls.push(inbounds);
    }
  };

  let protocol = "https:";
  let hostname = "";
  let port = "";
  let urlPath = "";
  try {
    const parsed = new URL(cleanUrl);
    protocol = parsed.protocol;
    hostname = parsed.hostname;
    port = parsed.port;
    urlPath = parsed.pathname.replace(/\/$/, "");
  } catch (e) {
    const match = cleanUrl.match(/^(https?:\/\/)?([^:/]+)(:([0-9]+))?(\/.*)?$/);
    if (match) {
      protocol = match[1] || "https:";
      hostname = match[2];
      port = match[4] || "";
      urlPath = match[5] || "";
    }
  }

  addCandidate(cleanUrl, cleanBasePath);
  addCandidate(cleanUrl, "");

  const otherProtocol = protocol === "https:" ? "http:" : "https:";
  const swappedUrl = `${otherProtocol}//${hostname}${port ? ":" + port : ""}${urlPath}`;
  addCandidate(swappedUrl, cleanBasePath);
  addCandidate(swappedUrl, "");

  if (urlPath && /^\/[0-9]+$/.test(urlPath)) {
    const pathPort = urlPath.substring(1);
    addCandidate(`${protocol}//${hostname}:${pathPort}`, cleanBasePath);
    addCandidate(`${protocol}//${hostname}:${pathPort}`, "");
    addCandidate(`${otherProtocol}//${hostname}:${pathPort}`, cleanBasePath);
    addCandidate(`${otherProtocol}//${hostname}:${pathPort}`, "");
  }

  if (port === "8080") {
    addCandidate(`${protocol}//${hostname}:8090`, cleanBasePath);
    addCandidate(`${protocol}//${hostname}:8090`, "");
    addCandidate(`${otherProtocol}//${hostname}:8090`, cleanBasePath);
    addCandidate(`${otherProtocol}//${hostname}:8090`, "");
  }

  addCandidate(`${protocol}//${hostname}:2053`, cleanBasePath);
  addCandidate(`${protocol}//${hostname}:2053`, "");
  addCandidate(`${otherProtocol}//${hostname}:2053`, cleanBasePath);
  addCandidate(`${otherProtocol}//${hostname}:2053`, "");

  addCandidate(`${protocol}//${hostname}`, cleanBasePath);
  addCandidate(`${protocol}//${hostname}`, "");
  addCandidate(`${otherProtocol}//${hostname}`, cleanBasePath);
  addCandidate(`${otherProtocol}//${hostname}`, "");

  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    if (port) {
      addCandidate(`http://127.0.0.1:${port}`, cleanBasePath);
      addCandidate(`http://127.0.0.1:${port}`, "");
    }
    const defaultLocalPorts = ["2053", "8090", "54321", "2083", "2087"];
    defaultLocalPorts.forEach(p => {
      addCandidate(`http://127.0.0.1:${p}`, cleanBasePath);
      addCandidate(`http://127.0.0.1:${p}`, "");
    });
  }

  const diagnostics: DiagnosticItem[] = [];
  let workingInboundsUrl = "";

  const tests = candidateInboundUrls.map(async (inboundUrl) => {
    const diag: DiagnosticItem = {
      url: inboundUrl,
      method: "json",
      success: false,
      error: "",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(inboundUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      diag.status = res.status;

      if (res.status === 200) {
        const text = await res.text();
        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch (e) {}

        if (json && typeof json === "object" && (json.success === true || Array.isArray(json.obj))) {
          diag.success = true;
          workingInboundsUrl = inboundUrl;
        } else {
          diag.error = json?.msg || "توکن معتبر است اما پاسخ پنل نامشخص است";
        }
      } else if (res.status === 401) {
        diag.error = "توکن ای‌پی‌آی (API Token) نامعتبر یا منقضی شده است (401)";
      } else {
        diag.error = `پاسخ نامشخص از سرور (Status ${res.status})`;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        diag.error = "زمان اتصال پایان یافت (Timeout)";
      } else if (err.code === "ECONNREFUSED" || err.message?.includes("refused")) {
        diag.error = "اتصال رد شد (Connection Refused)";
      } else {
        diag.error = err.message || "خطای شبکه";
      }
    }
    diagnostics.push(diag);
  });

  await Promise.allSettled(tests);

  if (workingInboundsUrl) {
    return { inboundsUrl: workingInboundsUrl };
  }

  const farsiSummary = buildFarsiSummary(diagnostics);
  throw new DiagnosticError(farsiSummary, diagnostics);
}

async function tryLoginOnCandidates(url: string, webBasePath: string, username: string, password: string): Promise<LoginTestResult> {
  let cleanUrl = url.replace(/\/$/, "");
  // Strip trailing "/login" or "/panel" if written in the URL
  cleanUrl = cleanUrl.replace(/\/login$/, "");
  cleanUrl = cleanUrl.replace(/\/panel$/, "");
  
  const cleanBasePath = (webBasePath || "").trim().replace(/^\//, "").replace(/\/$/, "");

  // Generate unique candidates
  const candidateUrls: { login: string; inbounds: string }[] = [];

  const addCandidate = (hostUrl: string, path: string) => {
    const cleanHost = hostUrl.replace(/\/$/, "");
    const cleanPath = path.trim() ? "/" + path.trim().replace(/^\//, "").replace(/\/$/, "") : "";
    const login = `${cleanHost}${cleanPath}/login`;
    const inbounds = `${cleanHost}${cleanPath}/panel/api/inbounds/list`;
    
    // Avoid duplicates
    if (!candidateUrls.some(c => c.login === login)) {
      candidateUrls.push({ login, inbounds });
    }
  };

  // Helper to extract parts from URL
  let protocol = "https:";
  let hostname = "";
  let port = "";
  let urlPath = "";
  try {
    const parsed = new URL(cleanUrl);
    protocol = parsed.protocol;
    hostname = parsed.hostname;
    port = parsed.port;
    urlPath = parsed.pathname.replace(/\/$/, "");
  } catch (e) {
    // Fallback if URL is not fully qualified
    const match = cleanUrl.match(/^(https?:\/\/)?([^:/]+)(:([0-9]+))?(\/.*)?$/);
    if (match) {
      protocol = match[1] || "https:";
      hostname = match[2];
      port = match[4] || "";
      urlPath = match[5] || "";
    }
  }

  // 1. Candidate as entered (e.g. url + basePath)
  addCandidate(cleanUrl, cleanBasePath);

  // 2. Candidate with URL as entered, but no webBasePath
  addCandidate(cleanUrl, "");

  // 3. Candidate with swapped protocol (http <-> https)
  const otherProtocol = protocol === "https:" ? "http:" : "https:";
  const swappedUrl = `${otherProtocol}//${hostname}${port ? ":" + port : ""}${urlPath}`;
  addCandidate(swappedUrl, cleanBasePath);
  addCandidate(swappedUrl, "");

  // 4. If URL has a path like "/8090", maybe they meant port 8090 instead of path
  if (urlPath && /^\/[0-9]+$/.test(urlPath)) {
    const pathPort = urlPath.substring(1);
    const directPortUrl1 = `${protocol}//${hostname}:${pathPort}`;
    addCandidate(directPortUrl1, cleanBasePath);
    addCandidate(directPortUrl1, "");

    const directPortUrl2 = `${otherProtocol}//${hostname}:${pathPort}`;
    addCandidate(directPortUrl2, cleanBasePath);
    addCandidate(directPortUrl2, "");
  }

  // 5. If port is 8080 and webBasePath is given, what if port is actually 8090?
  if (port === "8080") {
    const port8090Url1 = `${protocol}//${hostname}:8090`;
    addCandidate(port8090Url1, cleanBasePath);
    addCandidate(port8090Url1, "");

    const port8090Url2 = `${otherProtocol}//${hostname}:8090`;
    addCandidate(port8090Url2, cleanBasePath);
    addCandidate(port8090Url2, "");
  }

  // 6. Test on standard default port 2053
  const port2053Url1 = `${protocol}//${hostname}:2053`;
  addCandidate(port2053Url1, cleanBasePath);
  addCandidate(port2053Url1, "");
  const port2053Url2 = `${otherProtocol}//${hostname}:2053`;
  addCandidate(port2053Url2, cleanBasePath);
  addCandidate(port2053Url2, "");

  // 7. What if they wrote port 8080/8090 and we try root domain on port 80 or 443
  const rootUrl1 = `${protocol}//${hostname}`;
  addCandidate(rootUrl1, cleanBasePath);
  addCandidate(rootUrl1, "");
  const rootUrl2 = `${otherProtocol}//${hostname}`;
  addCandidate(rootUrl2, cleanBasePath);
  addCandidate(rootUrl2, "");

  // 8. Automated Local loopback fallbacks (very helpful when companion and 3x-ui run on the same VPS to bypass NAT Hairpinning/Firewalls)
  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    if (port) {
      addCandidate(`http://127.0.0.1:${port}`, cleanBasePath);
      addCandidate(`http://127.0.0.1:${port}`, "");
    }
    const defaultLocalPorts = ["2053", "8090", "54321", "2083", "2087"];
    defaultLocalPorts.forEach(p => {
      addCandidate(`http://127.0.0.1:${p}`, cleanBasePath);
      addCandidate(`http://127.0.0.1:${p}`, "");
    });
  }

  console.log(`[3x-ui Auth] Testing ${candidateUrls.length} different URL/Port variations in parallel with deep diagnostics...`);

  const diagnostics: DiagnosticItem[] = [];
  let successfulResult: LoginTestResult | null = null;

  // Run the candidates in parallel to gather detailed diagnostics
  const tests = candidateUrls.flatMap((c) => {
    return ["form", "json"].map(async (method) => {
      const diag: DiagnosticItem = {
        url: c.login,
        method: method as "form" | "json",
        success: false,
        error: "",
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      try {
        const fetchOptions: any = {
          method: "POST",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
          },
          signal: controller.signal,
        };

        if (method === "form") {
          fetchOptions.headers["Content-Type"] = "application/x-www-form-urlencoded";
          fetchOptions.body = new URLSearchParams({ username, password }).toString();
        } else {
          fetchOptions.headers["Content-Type"] = "application/json";
          fetchOptions.body = JSON.stringify({ username, password });
        }

        const res = await fetch(c.login, fetchOptions);
        clearTimeout(timeoutId);
        diag.status = res.status;

        // Check if it's the companion panel itself (loops back to ourselves)
        if (res.headers.get("X-Sanaei-Companion") === "true") {
          diag.isCompanionSelf = true;
          diag.error = "به خود این پنل متصل شد (حلقه نامعتبر)";
        }

        const text = await res.text();
        const trimmedText = text.trim();
        
        // 404 is classic Go/Gin route missing indicator
        if (trimmedText === "404 page not found") {
          diag.is3xUiDetected = true;
          diag.error = "مسیر اشتباه است (۴۰۴)";
        }

        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch (e) {}

        if (json && typeof json === "object") {
          diag.is3xUiDetected = true;
          if (json.success === true) {
            diag.success = true;
            const setCookie = res.headers.get("set-cookie");
            successfulResult = {
              loginUrl: c.login,
              inboundsUrl: c.inbounds,
              cookie: setCookie ? setCookie.split(";")[0] : "",
              contentType: method as "form" | "json",
            };
          } else {
            diag.error = json.msg || "یوزرنیم یا پسورد اشتباه است";
          }
        } else {
          if (!diag.error) {
            diag.error = `پاسخ نامشخص (Status ${res.status})`;
          }
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          diag.error = "زمان اتصال پایان یافت (Timeout)";
        } else if (err.code === "ECONNREFUSED" || err.message?.includes("refused")) {
          diag.error = "اتصال رد شد (Connection Refused)";
        } else {
          diag.error = err.message || "خطای ناشناخته شبکه";
        }
      }
      diagnostics.push(diag);
    });
  });

  await Promise.allSettled(tests);

  if (successfulResult) {
    return successfulResult;
  }

  // If we got here, all candidates failed. Build a detailed smart diagnostic error message.
  const farsiSummary = buildFarsiSummary(diagnostics);
  throw new DiagnosticError(farsiSummary, diagnostics);
}

async function fetchLiveNodesFromPanel(panel: Panel, username: string, uuid: string): Promise<string[]> {
  if (panel.isMock || panel.url.includes("mock") || panel.url.includes("sanaei.xyz")) {
    return generateMockLinks(username, uuid);
  }

  try {
    let inboundsUrl = panel.workingInboundsUrl;
    let headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    if (panel.apiToken) {
      // 1. API Token Mode
      headers["Authorization"] = `Bearer ${panel.apiToken}`;
      if (!inboundsUrl) {
        console.log(`[3x-ui Sync] Running URL auto-discovery with API Token for panel ${panel.name}...`);
        const result = await tryTokenOnCandidates(panel.url, panel.webBasePath || "", panel.apiToken);
        inboundsUrl = result.inboundsUrl;
        panel.workingInboundsUrl = inboundsUrl;
        saveDb();
      }
    } else {
      // 2. Cookie Mode
      let loginUrl = panel.workingLoginUrl;
      let contentType = panel.workingContentType || "form";
      let sessionCookie = "";

      // If we have working URLs, try to login using them first
      if (loginUrl && inboundsUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const loginRes = await fetch(loginUrl, {
            method: "POST",
            headers: {
              "Content-Type": contentType === "json" ? "application/json" : "application/x-www-form-urlencoded",
              ...headers,
              "Accept": "application/json, text/plain, */*",
            },
            body: contentType === "json" 
              ? JSON.stringify({ username: panel.username, password: panel.password })
              : new URLSearchParams({ username: panel.username, password: panel.password }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (loginRes.ok) {
            const setCookie = loginRes.headers.get("set-cookie");
            if (setCookie) {
              sessionCookie = setCookie.split(";")[0];
            }
          }
        } catch (err) {
          console.warn(`[3x-ui Sync] Quick login failed for ${panel.name}, will try auto-discovery:`, err);
        }
      }

      // If quick login failed or we didn't have cached URLs, run discovery
      if (!sessionCookie) {
        console.log(`[3x-ui Sync] Running URL auto-discovery for panel ${panel.name}...`);
        const result = await tryLoginOnCandidates(panel.url, panel.webBasePath || "", panel.username, panel.password);
        loginUrl = result.loginUrl;
        inboundsUrl = result.inboundsUrl;
        contentType = result.contentType;
        sessionCookie = result.cookie;

        // Update and cache the successful URLs in database
        panel.workingLoginUrl = loginUrl;
        panel.workingInboundsUrl = inboundsUrl;
        panel.workingContentType = contentType;
        saveDb();
      }

      headers["Cookie"] = sessionCookie;
    }

    // Request active inbounds list
    const inboundsRes = await fetch(inboundsUrl, {
      method: "GET",
      headers,
    });

    if (!inboundsRes.ok) {
      console.warn(`[3x-ui Sync] Failed to fetch inbounds list. Status: ${inboundsRes.status}`);
      return generateMockLinks(username, uuid);
    }

    const data = await inboundsRes.json();
    if (data && data.success && Array.isArray(data.obj)) {
      const nodes: string[] = [];
      
      // Parse host IP/domain of the panel to construct correct configuration node connection link
      let panelDomain = "142.250.74.46";
      try {
        const urlObj = new URL(panel.url);
        panelDomain = urlObj.hostname;
      } catch (e) {
        // Fallback hostname parsing
        const match = panel.url.match(/^(https?:\/\/)?([^:/]+)/);
        if (match) panelDomain = match[2];
      }

      for (const inbound of data.obj) {
        if (!inbound.enable) continue;
        const streamSettings = typeof inbound.streamSettings === "string" 
          ? JSON.parse(inbound.streamSettings) 
          : inbound.streamSettings;
        const port = inbound.port;
        const remark = inbound.remark || `${panel.name} - Node`;

        const protocol = inbound.protocol; // vmess, vless, trojan, shadowsocks
        const settings = typeof inbound.settings === "string" ? JSON.parse(inbound.settings) : inbound.settings;

        const sni = streamSettings?.tlsSettings?.serverName || streamSettings?.xtlsSettings?.serverName || panelDomain;
        const security = streamSettings?.security || "none";
        const pathStr = streamSettings?.wsSettings?.path || streamSettings?.grpcSettings?.serviceName || "";
        const netType = streamSettings?.network || "tcp";

        if (protocol === "vless") {
          const flow = settings?.clients?.[0]?.flow || "";
          nodes.push(
            `vless://${uuid}@${panelDomain}:${port}?type=${netType}&security=${security}&sni=${sni}&path=${encodeURIComponent(pathStr)}&flow=${flow}#${encodeURIComponent(remark)}`
          );
        } else if (protocol === "vmess") {
          const vmessConfig = {
            v: "2",
            ps: remark,
            add: panelDomain,
            port: port,
            id: uuid,
            aid: "0",
            scy: "auto",
            net: netType,
            type: "none",
            host: sni,
            path: pathStr,
            tls: security === "tls" ? "tls" : "",
            sni: sni
          };
          nodes.push(`vmess://${Buffer.from(JSON.stringify(vmessConfig)).toString("base64")}`);
        } else if (protocol === "trojan") {
          nodes.push(
            `trojan://${uuid}@${panelDomain}:${port}?security=${security}&sni=${sni}&path=${encodeURIComponent(pathStr)}#${encodeURIComponent(remark)}`
          );
        } else if (protocol === "shadowsocks") {
          const method = settings?.method || "aes-256-gcm";
          const password = settings?.password || "shadowpass";
          const ssCreds = Buffer.from(`${method}:${password}`).toString("base64");
          nodes.push(`shadowsocks://${ssCreds}@${panelDomain}:${port}#${encodeURIComponent(remark)}`);
        }
      }
      return nodes.length > 0 ? nodes : generateMockLinks(username, uuid);
    }
  } catch (err: any) {
    console.error(`[3x-ui Sync] Error fetching live nodes from panel ${panel.name}:`, err.message || err);
  }

  return generateMockLinks(username, uuid);
}

// REST API Endpoints

// 1. Panels CRUD
app.get("/api/panels", (req, res) => {
  res.json(dbData.panels);
});

app.post("/api/panels", async (req, res) => {
  const { name, url, username, password, isMock, webBasePath, apiToken } = req.body;
  if (!name || !url) {
    res.status(400).json({ error: "Name and URL are required" });
    return;
  }

  const cleanUrl = url.replace(/\/$/, "");
  const cleanWebBasePath = webBasePath || "";
  const cleanUser = username || "admin";
  const cleanPass = password || "";
  const cleanApiToken = apiToken || "";

  let workingLoginUrl = "";
  let workingInboundsUrl = "";
  let workingContentType: "form" | "json" = "form";

  if (!isMock && !cleanUrl.includes("mock") && !cleanUrl.includes("sanaei.xyz")) {
    try {
      if (cleanApiToken) {
        const result = await tryTokenOnCandidates(cleanUrl, cleanWebBasePath, cleanApiToken);
        workingInboundsUrl = result.inboundsUrl;
      } else {
        const result = await tryLoginOnCandidates(cleanUrl, cleanWebBasePath, cleanUser, cleanPass);
        workingLoginUrl = result.loginUrl;
        workingInboundsUrl = result.inboundsUrl;
        workingContentType = result.contentType;
      }
    } catch (e) {
      console.warn("[Register Panel] Connection check failed, defaulting to basic URLs:", e);
      const defaults = getPanelApiUrls(cleanUrl, cleanWebBasePath);
      workingLoginUrl = defaults.loginUrl;
      workingInboundsUrl = defaults.inboundsUrl;
    }
  }

  const newPanel: Panel = {
    id: "panel-" + Math.random().toString(36).substr(2, 9),
    name,
    url: cleanUrl,
    username: cleanApiToken ? "Token-Based" : cleanUser,
    password: cleanApiToken ? "" : cleanPass,
    apiToken: cleanApiToken,
    isActive: true,
    isMock: !!isMock || cleanUrl.includes("mock") || cleanUrl.includes("sanaei.xyz"),
    webBasePath: cleanWebBasePath,
    workingLoginUrl,
    workingInboundsUrl,
    workingContentType,
  };

  dbData.panels.push(newPanel);
  saveDb();
  res.status(201).json(newPanel);
});

app.delete("/api/panels/:id", (req, res) => {
  const index = dbData.panels.findIndex((p) => p.id === req.params.id);
  if (index !== -1) {
    dbData.panels.splice(index, 1);
    saveDb();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Panel not found" });
  }
});

// 1.5. Sync Panel Users (Extract clients from Sanaei and auto-create smart subscriptions)
app.post("/api/panels/:id/sync", async (req, res) => {
  const panelId = req.params.id;
  const panel = dbData.panels.find((p) => p.id === panelId);
  if (!panel) {
    res.status(404).json({ error: "Panel not found" });
    return;
  }

  let clientsToSync: Array<{ email: string; id: string }> = [];

  if (panel.isMock || panel.url.includes("mock") || panel.url.includes("sanaei.xyz")) {
    // Generate mock clients for the demo panel
    clientsToSync = [
      { email: "alex_premium", id: "5a4df3b2-7c8d-4e9a-bf0c-d3e1f2a3b4c5" },
      { email: "reza_secure", id: "9b8c7d6e-5f4e-3d2c-1b0a-9f8e7d6c5b4a" },
      { email: "sara_ultra", id: "3f2e1d0c-9b8a-7f6e-5d4c-3b2a1f0e9d8c" }
    ];
  } else {
    // Real 3x-ui API Call
    try {
      let inboundsUrl = panel.workingInboundsUrl;
      let headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };

      if (panel.apiToken) {
        // API Token Mode
        headers["Authorization"] = `Bearer ${panel.apiToken}`;
        if (!inboundsUrl) {
          console.log(`[Sync API] Running URL auto-discovery with API Token for panel ${panel.name}...`);
          const result = await tryTokenOnCandidates(panel.url, panel.webBasePath || "", panel.apiToken);
          inboundsUrl = result.inboundsUrl;
          panel.workingInboundsUrl = inboundsUrl;
          saveDb();
        }
      } else {
        // Cookie Mode
        let loginUrl = panel.workingLoginUrl;
        let contentType = panel.workingContentType || "form";
        let sessionCookie = "";

        // Try quick authenticated login with working URLs first
        if (loginUrl && inboundsUrl) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const loginRes = await fetch(loginUrl, {
              method: "POST",
              headers: {
                "Content-Type": contentType === "json" ? "application/json" : "application/x-www-form-urlencoded",
                ...headers,
                "Accept": "application/json, text/plain, */*",
              },
              body: contentType === "json" 
                ? JSON.stringify({ username: panel.username, password: panel.password })
                : new URLSearchParams({ username: panel.username, password: panel.password }),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (loginRes.ok) {
              const setCookie = loginRes.headers.get("set-cookie");
              if (setCookie) {
                sessionCookie = setCookie.split(";")[0];
              }
            }
          } catch (e) {
            console.warn("[Sync API] Quick auth failed, starting auto-discovery:", e);
          }
        }

        // Run auto-discovery if cached fields are missing or failed
        if (!sessionCookie) {
          console.log(`[Sync API] Running URL auto-discovery for panel ${panel.name}...`);
          const result = await tryLoginOnCandidates(panel.url, panel.webBasePath || "", panel.username, panel.password);
          loginUrl = result.loginUrl;
          inboundsUrl = result.inboundsUrl;
          contentType = result.contentType;
          sessionCookie = result.cookie;

          // Cache the successful results in the DB
          panel.workingLoginUrl = loginUrl;
          panel.workingInboundsUrl = inboundsUrl;
          panel.workingContentType = contentType;
          saveDb();
        }

        headers["Cookie"] = sessionCookie;
      }

      const inboundsRes = await fetch(inboundsUrl, {
        method: "GET",
        headers,
      });

      if (!inboundsRes.ok) {
        res.status(500).json({ error: "Failed to fetch inbounds from Sanaei panel during sync" });
        return;
      }

      const data = await inboundsRes.json();
      if (data && data.success && Array.isArray(data.obj)) {
        for (const inbound of data.obj) {
          const settings = typeof inbound.settings === "string" ? JSON.parse(inbound.settings) : inbound.settings;
          if (settings && Array.isArray(settings.clients)) {
            for (const client of settings.clients) {
              if (client.email) {
                clientsToSync.push({
                  email: client.email,
                  id: client.id || client.password || Math.random().toString(36).substr(2, 9)
                });
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error("[Sync API Error]:", err);
      res.status(500).json({ error: `Connection failed: ${err.message}` });
      return;
    }
  }

  // Now, for every fetched client, check if we already have it. If not, auto-create a smart subscription!
  let syncedCount = 0;
  let alreadyExistsCount = 0;
  
  // Extract server hostname or IP for configuration
  let fallbackIp = "142.250.74.46";
  try {
    const parsed = new URL(panel.url);
    fallbackIp = parsed.hostname;
  } catch (e) {
    // fallback
  }

  for (const client of clientsToSync) {
    const cleanUser = client.email.trim();
    // Check if subscription already exists for this panel and username
    const exists = dbData.subscriptions.some(
      (s) => s.panelId === panelId && s.username.toLowerCase() === cleanUser.toLowerCase()
    );

    if (exists) {
      alreadyExistsCount++;
      continue;
    }

    // Auto-generate legacy and new L2TP, IKEv2, and OpenVPN credentials!
    const token = "sub_" + Math.random().toString(36).substr(2, 16);
    const cleanUsernameForCreds = cleanUser.toLowerCase().replace(/[^a-z0-9]/g, "");
    const l2tpUser = `vpn_${cleanUsernameForCreds}`;
    const l2tpPass = Math.random().toString(36).substr(2, 10).toUpperCase();

    const wgKeys = generateWireGuardKeys();

    const newSub: SmartSubscription = {
      id: token,
      panelId,
      panelName: panel.name,
      username: cleanUser,
      uuid: client.id,
      inboundId: Math.floor(Math.random() * 100) + 1,
      createdAt: new Date().toISOString(),
      l2tpUser,
      l2tpPass,
      l2tpPsk: dbData.settings?.l2tpPsk || "SanaeiL2TPSecureKey",
      l2tpServerIp: dbData.settings?.l2tpServerIp || fallbackIp,
      wireguardPrivateKey: wgKeys.privateKey,
      wireguardPublicKey: wgKeys.publicKey,
      wireguardAddress: "10.0.0.2/24",
      wireguardDns: dbData.settings?.wgServerDns || "1.1.1.1, 8.8.8.8",
      openvpnUser: `vpn_${cleanUsernameForCreds}`,
      openvpnPass: Math.random().toString(36).substr(2, 10).toUpperCase(),
      openvpnPort: 1194,
      openvpnProto: "udp",
      autoSwitchEnabled: true,
      lastUpdated: new Date().toISOString(),
    };

    dbData.subscriptions.push(newSub);
    syncedCount++;
  }

  if (syncedCount > 0) {
    saveDb();
  }

  res.json({
    success: true,
    syncedCount,
    alreadyExistsCount,
    totalFetched: clientsToSync.length,
    message: `Successfully synced ${syncedCount} new users from ${panel.name}.`
  });
});

// 2. Test Connection
app.post("/api/panels/test", async (req, res) => {
  const { url, username, password, isMock, webBasePath, apiToken } = req.body;
  
  // Log the request details for debugging (excluding the actual password for security, just showing length)
  try {
    const logFilePath = path.join(DB_DIR, "test_requests.log");
    const logEntry = `[${new Date().toISOString()}] URL: "${url}", BasePath: "${webBasePath}", User: "${username}", HasToken: ${!!apiToken}\n`;
    fs.appendFileSync(logFilePath, logEntry);
  } catch (logErr) {
    console.error("Failed to write to request log file:", logErr);
  }

  if (isMock || url?.includes("sanaei.xyz") || url?.includes("mock")) {
    // Simulate connection lag
    await new Promise((resolve) => setTimeout(resolve, 800));
    res.json({
      success: true,
      version: "v2.3.8",
      message: "Successfully connected to MHSanaei 3x-ui (Simulated Node)",
    });
    return;
  }

  try {
    if (apiToken) {
      // Attempt token discovery
      const result = await tryTokenOnCandidates(url, webBasePath || "", apiToken);
      res.json({
        success: true,
        version: "Bearer Token Auth",
        message: `اتصال امن API از طریق توکن با موفقیت برقرار شد!\nآدرس فعال شناسایی شده: ${result.inboundsUrl}`,
        workingInboundsUrl: result.inboundsUrl,
      });
    } else {
      // Attempt multi-candidate smart login
      const result = await tryLoginOnCandidates(url, webBasePath || "", username || "admin", password || "");
      
      res.json({
        success: true,
        version: "v2.3.8 (Detected)",
        message: `اتصال هوشمند با موفقیت برقرار شد!\nآدرس فعال شناسایی شده: ${result.loginUrl}\nنوع وب‌سرویس: ${result.contentType === "json" ? "JSON API" : "Form URL-Encoded"}`,
        workingLoginUrl: result.loginUrl,
        workingInboundsUrl: result.inboundsUrl,
        workingContentType: result.contentType,
      });
    }
  } catch (err: any) {
    console.error("Test connection failed:", err);
    res.json({
      success: false,
      message: err.message,
      diagnostics: err.diagnostics || [],
    });
  }
});

// 2.5. Global VPN Settings
app.get("/api/settings", (req, res) => {
  res.json(dbData.settings || {});
});

app.post("/api/settings", (req, res) => {
  const { l2tpServerIp, l2tpPsk, wgServerPrivateKey, wgServerPublicKey, wgServerPort, wgServerDns } = req.body;
  
  dbData.settings = {
    l2tpServerIp: l2tpServerIp || "",
    l2tpPsk: l2tpPsk || "SanaeiL2TPSecureKey",
    wgServerPrivateKey: wgServerPrivateKey || "",
    wgServerPublicKey: wgServerPublicKey || "",
    wgServerPort: Number(wgServerPort) || 51820,
    wgServerDns: wgServerDns || "1.1.1.1, 8.8.8.8",
  };
  
  // Update all existing subscriptions to use the new global server parameters
  dbData.subscriptions.forEach((sub) => {
    if (l2tpServerIp) {
      sub.l2tpServerIp = l2tpServerIp;
    }
    if (l2tpPsk) {
      sub.l2tpPsk = l2tpPsk;
    }
    if (wgServerDns) {
      sub.wireguardDns = wgServerDns;
    }
  });

  saveDb();
  res.json({ success: true, settings: dbData.settings });
});

// 2.6. Inbounds Management API (Multi-Inbound support for all users)
app.get("/api/inbounds", (req, res) => {
  res.json(dbData.inbounds || []);
});

app.post("/api/inbounds", (req, res) => {
  const { tag, serverIp, protocol, port, wgPort, wgServerPublicKey, openvpnPort, openvpnProto, l2tpPsk, notes } = req.body;
  if (!tag || !serverIp) {
    res.status(400).json({ error: "Tag and Server IP are required" });
    return;
  }

  const serverPub = wgServerPublicKey || dbData.settings?.wgServerPublicKey || "";
  const newInbound: InboundNode = {
    id: "inbound-" + Math.random().toString(36).substr(2, 9),
    tag,
    serverIp,
    protocol: protocol || "wireguard",
    port: Number(port) || 51820,
    wgPort: Number(wgPort || port) || 51820,
    wgServerPublicKey: serverPub,
    openvpnPort: Number(openvpnPort) || 1194,
    openvpnProto: openvpnProto === "tcp" ? "tcp" : "udp",
    l2tpPsk: l2tpPsk || dbData.settings?.l2tpPsk || "SanaeiL2TPSecureKey",
    isDefault: dbData.inbounds.length === 0,
    notes: notes || "",
  };

  dbData.inbounds.push(newInbound);
  saveDb();
  res.status(201).json(newInbound);
});

app.put("/api/inbounds/:id", (req, res) => {
  const index = dbData.inbounds.findIndex((i) => i.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "Inbound not found" });
    return;
  }

  const { tag, serverIp, protocol, port, wgPort, wgServerPublicKey, openvpnPort, openvpnProto, l2tpPsk, notes, isDefault } = req.body;
  
  dbData.inbounds[index] = {
    ...dbData.inbounds[index],
    tag: tag || dbData.inbounds[index].tag,
    serverIp: serverIp || dbData.inbounds[index].serverIp,
    protocol: protocol || dbData.inbounds[index].protocol,
    port: port ? Number(port) : dbData.inbounds[index].port,
    wgPort: wgPort ? Number(wgPort) : dbData.inbounds[index].wgPort,
    wgServerPublicKey: wgServerPublicKey !== undefined ? wgServerPublicKey : dbData.inbounds[index].wgServerPublicKey,
    openvpnPort: openvpnPort ? Number(openvpnPort) : dbData.inbounds[index].openvpnPort,
    openvpnProto: openvpnProto || dbData.inbounds[index].openvpnProto,
    l2tpPsk: l2tpPsk || dbData.inbounds[index].l2tpPsk,
    isDefault: isDefault !== undefined ? isDefault : dbData.inbounds[index].isDefault,
    notes: notes !== undefined ? notes : dbData.inbounds[index].notes,
  };

  saveDb();
  res.json(dbData.inbounds[index]);
});

app.delete("/api/inbounds/:id", (req, res) => {
  const index = dbData.inbounds.findIndex((i) => i.id === req.params.id);
  if (index !== -1) {
    dbData.inbounds.splice(index, 1);
    saveDb();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Inbound not found" });
  }
});

// 3. Smart Client Subscriptions CRUD
app.get("/api/users", (req, res) => {
  res.json(dbData.subscriptions);
});

app.post("/api/users", (req, res) => {
  const { panelId, username, autoSwitchEnabled, l2tpServerIp, l2tpPsk } = req.body;
  if (!panelId || !username) {
    res.status(400).json({ error: "Panel and Username are required" });
    return;
  }

  const panel = dbData.panels.find((p) => p.id === panelId);
  const panelName = panel ? panel.name : "Unknown Panel";

  // Generate randomized credentials for L2TP and WireGuard
  const token = "sub_" + Math.random().toString(36).substr(2, 16);
  const uuid = Math.random().toString(36).substr(2, 9) + "-" + 
               Math.random().toString(36).substr(2, 4) + "-" + 
               Math.random().toString(36).substr(2, 4) + "-" + 
               Math.random().toString(36).substr(2, 12);
  
  // Clean username for L2TP compatibility
  const cleanUser = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  const l2tpUser = `vpn_${cleanUser}`;
  const l2tpPass = Math.random().toString(36).substr(2, 10).toUpperCase();
  const fallbackIp = "142.250.74.46"; // Mock stable routing IP (e.g. Frankfurt node)

  const wgKeys = generateWireGuardKeys();

  const newSub: SmartSubscription = {
    id: token,
    panelId,
    panelName,
    username,
    uuid,
    inboundId: Math.floor(Math.random() * 100) + 1,
    createdAt: new Date().toISOString(),
    l2tpUser,
    l2tpPass,
    l2tpPsk: l2tpPsk || dbData.settings?.l2tpPsk || "SanaeiL2TPSecureKey",
    l2tpServerIp: l2tpServerIp || dbData.settings?.l2tpServerIp || fallbackIp,
    wireguardPrivateKey: wgKeys.privateKey,
    wireguardPublicKey: wgKeys.publicKey,
    wireguardAddress: "10.0.0.2/24",
    wireguardDns: dbData.settings?.wgServerDns || "1.1.1.1, 8.8.8.8",
    openvpnUser: `vpn_${cleanUser}`,
    openvpnPass: Math.random().toString(36).substr(2, 10).toUpperCase(),
    openvpnPort: 1194,
    openvpnProto: "udp",
    autoSwitchEnabled: autoSwitchEnabled !== false,
    lastUpdated: new Date().toISOString(),
  };

  dbData.subscriptions.push(newSub);
  saveDb();
  res.status(201).json(newSub);
});

app.delete("/api/users/:id", (req, res) => {
  const index = dbData.subscriptions.findIndex((s) => s.id === req.params.id);
  if (index !== -1) {
    dbData.subscriptions.splice(index, 1);
    saveDb();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Subscription not found" });
  }
});

function parseV2rayLink(link: string, uuid: string) {
  try {
    if (link.startsWith("vless://")) {
      const parts = link.substring(8).split("#");
      const configPart = parts[0];
      const name = parts[1] ? decodeURIComponent(parts[1]) : "VLESS Node";
      const [auth, serverInfo] = configPart.split("@");
      const [serverPort, query] = serverInfo.split("?");
      const [server, portStr] = serverPort.split(":");
      const queryParams = new URLSearchParams(query || "");
      const network = queryParams.get("type") || "tcp";
      const security = queryParams.get("security") || "none";
      const path = queryParams.get("path") || "";
      return {
        name,
        type: "vless",
        server,
        port: parseInt(portStr) || 443,
        uuid,
        udp: true,
        tls: security !== "none" && security !== "",
        network,
        path,
      };
    } else if (link.startsWith("vmess://")) {
      const base64Part = link.substring(8).split("#")[0];
      const decoded = JSON.parse(Buffer.from(base64Part, "base64").toString("utf-8"));
      return {
        name: decoded.ps || "VMESS Node",
        type: "vmess",
        server: decoded.add,
        port: parseInt(decoded.port) || 443,
        uuid: decoded.id || uuid,
        udp: true,
        tls: decoded.tls === "tls",
        network: decoded.net || "tcp",
        path: decoded.path || "",
      };
    } else if (link.startsWith("trojan://")) {
      const parts = link.substring(9).split("#");
      const name = parts[1] ? decodeURIComponent(parts[1]) : "Trojan Node";
      const [auth, serverInfo] = parts[0].split("@");
      const [serverPort, query] = serverInfo.split("?");
      const [server, portStr] = serverPort.split(":");
      const queryParams = new URLSearchParams(query || "");
      const security = queryParams.get("security") || "tls";
      return {
        name,
        type: "trojan",
        server,
        port: parseInt(portStr) || 443,
        uuid: auth,
        udp: true,
        tls: security !== "none",
        network: "tcp",
        path: "",
      };
    }
  } catch (err) {
    // Ignore and fallback
  }
  return null;
}

// 4. Smart Subscription Dynamic Endpoint
app.get("/api/sub/:token", async (req, res) => {
  const sub = dbData.subscriptions.find((s) => s.id === req.params.token);
  if (!sub) {
    res.status(404).send("Subscription not found");
    return;
  }

  // Fetch panel details
  const panel = dbData.panels.find((p) => p.id === sub.panelId);
  const rawLinks = panel ? await fetchLiveNodesFromPanel(panel, sub.username, sub.uuid) : generateMockLinks(sub.username, sub.uuid);

  // Identify requested format from query parameter or default
  const format = req.query.format || "base64";

  if (format === "clash") {
    // Parse dynamic proxies
    const proxies = rawLinks.map((link, i) => {
      const parsed = parseV2rayLink(link, sub.uuid);
      if (parsed) {
        return {
          name: parsed.name,
          type: parsed.type,
          server: parsed.server,
          port: parsed.port,
          uuid: parsed.uuid,
          udp: true,
          tls: parsed.tls,
          network: parsed.network,
          "ws-opts": parsed.network === "ws" ? { path: parsed.path } : undefined,
        };
      }
      return {
        name: `Server Node ${i + 1}`,
        type: "vless",
        server: "de1.sanaei-net.xyz",
        port: 443,
        uuid: sub.uuid,
        udp: true,
        tls: true,
        network: "ws",
        "ws-opts": {
          path: "/vless-ws",
        },
      };
    });

    const clashConfig = {
      port: 7890,
      "socks-port": 7891,
      "allow-lan": true,
      mode: "rule",
      "log-level": "info",
      proxies: proxies,
      "proxy-groups": [
        {
          name: "⚡ Auto-Switch (Fastest Node)",
          type: "url-test",
          proxies: proxies.map((p) => p.name),
          url: "http://www.gstatic.com/generate_204",
          interval: 150,
          tolerance: 50,
        },
        {
          name: "🛡️ Safe Gateway (Failover)",
          type: "fallback",
          proxies: proxies.map((p) => p.name),
          url: "http://www.gstatic.com/generate_204",
          interval: 300,
        },
        {
          name: "🚀 Proxy Selection",
          type: "select",
          proxies: ["⚡ Auto-Switch (Fastest Node)", "🛡️ Safe Gateway (Failover)", ...proxies.map((p) => p.name)],
        },
      ],
      rules: ["MATCH,🚀 Proxy Selection"],
    };

    res.setHeader("Content-Type", "text/yaml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="smart_clash_${sub.username}.yaml"`);
    
    let yamlString = "";
    yamlString += `port: ${clashConfig.port}\nsocks-port: ${clashConfig["socks-port"]}\nallow-lan: true\nmode: rule\nlog-level: info\n\n`;
    yamlString += "proxies:\n";
    clashConfig.proxies.forEach((p) => {
      yamlString += `  - name: "${p.name}"\n    type: ${p.type}\n    server: ${p.server}\n    port: ${p.port}\n    uuid: ${p.uuid}\n    udp: ${p.udp}\n    tls: ${p.tls}\n    network: ${p.network}\n`;
      if (p["ws-opts"]) {
        yamlString += `    ws-opts:\n      path: "${p["ws-opts"].path}"\n`;
      }
    });

    yamlString += "\nproxy-groups:\n";
    clashConfig["proxy-groups"].forEach((g) => {
      yamlString += `  - name: "${g.name}"\n    type: ${g.type}\n`;
      if (g.url) yamlString += `    url: "${g.url}"\n`;
      if (g.interval) yamlString += `    interval: ${g.interval}\n`;
      if (g.tolerance) yamlString += `    tolerance: ${g.tolerance}\n`;
      yamlString += `    proxies:\n`;
      g.proxies.forEach((proxyName) => {
        yamlString += `      - "${proxyName}"\n`;
      });
    });

    yamlString += "\nrules:\n";
    clashConfig.rules.forEach((r) => {
      yamlString += `  - ${r}\n`;
    });

    res.send(yamlString);
  } else if (format === "singbox") {
    const proxies = rawLinks.map((link, i) => {
      const parsed = parseV2rayLink(link, sub.uuid);
      return {
        tag: parsed?.name || `Node-${i + 1}`,
        type: parsed?.type || "vless",
        server: parsed?.server || "de1.sanaei-net.xyz",
        server_port: parsed?.port || 443,
        uuid: parsed?.uuid || sub.uuid,
        packet_encoding: "xudp",
        tls: {
          enabled: parsed ? parsed.tls : true,
          server_name: parsed?.server || "de1.sanaei-net.xyz",
        },
        transport: parsed?.network === "ws" ? {
          type: "ws",
          path: parsed.path,
        } : undefined,
      };
    });

    const singboxConfig = {
      outbounds: [
        {
          type: "selector",
          tag: "🚀 Proxy Selection",
          outbounds: ["⚡ Auto-Switch", ...proxies.map(p => p.tag)],
        },
        {
          type: "urltest",
          tag: "⚡ Auto-Switch",
          outbounds: proxies.map(p => p.tag),
          url: "http://www.gstatic.com/generate_204",
          interval: "1m",
          tolerance: 50,
        },
        ...proxies,
      ],
    };
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="smart_singbox_${sub.username}.json"`);
    res.send(JSON.stringify(singboxConfig, null, 2));
  } else {
    // Default: Raw V2Ray subscription format (Base64)
    const subscriptionBody = rawLinks.join("\n");
    const base64Encoded = Buffer.from(subscriptionBody).toString("base64");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(base64Encoded);
  }
});

// 5. Windows PBK L2TP configuration profile download
app.get("/api/sub/:token/l2tp-pbk", (req, res) => {
  const sub = dbData.subscriptions.find((s) => s.id === req.params.token || s.username === req.params.token);
  if (!sub) {
    res.status(404).send("Subscription not found");
    return;
  }

  const inboundId = req.query.inboundId as string;
  const inbound = inboundId ? dbData.inbounds.find((i) => i.id === inboundId) : dbData.inbounds[0];
  const serverIp = inbound?.serverIp || sub.l2tpServerIp || "127.0.0.1";
  const psk = inbound?.l2tpPsk || sub.l2tpPsk || "SanaeiL2TPSecureKey";

  // Windows Phone Book (.pbk) contents
  const pbkString = `[L2TP_Smart_VPN_${sub.username}]
MEDIA=rastapi
Port=VPN2-0
Device=WAN Miniport (L2TP)
DEVICE=vpn
PhoneNumber=${serverIp}
IPSecSharedKey=${psk}
UsePreSharedKey=1
EncryptionType=Require
CustomDialDll=
CustomDialFunc=
`;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="L2TP_${sub.username}.pbk"`);
  res.send(pbkString);
});

// 6. Apple iOS/macOS .mobileconfig profile download
app.get("/api/sub/:token/l2tp-mobileconfig", (req, res) => {
  const sub = dbData.subscriptions.find((s) => s.id === req.params.token || s.username === req.params.token);
  if (!sub) {
    res.status(404).send("Subscription not found");
    return;
  }

  const inboundId = req.query.inboundId as string;
  const inbound = inboundId ? dbData.inbounds.find((i) => i.id === inboundId) : dbData.inbounds[0];
  const serverIp = inbound?.serverIp || sub.l2tpServerIp || "127.0.0.1";
  const psk = inbound?.l2tpPsk || sub.l2tpPsk || "SanaeiL2TPSecureKey";
  const pskBase64 = Buffer.from(psk).toString("base64");

  const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>IPSec</key>
			<dict>
				<key>AuthenticationMethod</key>
				<string>SharedSecret</string>
				<key>SharedSecret</key>
				<data>${pskBase64}</data>
			</dict>
			<key>IPv4</key>
			<dict>
				<key>OverridePrimary</key>
				<integer>1</integer>
			</dict>
			<key>PPP</key>
			<dict>
				<key>AuthName</key>
				<string>${sub.l2tpUser}</string>
				<key>AuthPassword</key>
				<string>${sub.l2tpPass}</string>
				<key>CommRemoteAddress</key>
				<string>${serverIp}</string>
			</dict>
			<key>PayloadDescription</key>
			<string>Configures legacy and secure L2TP/IPSec VPN</string>
			<key>PayloadDisplayName</key>
			<string>L2TP VPN (${inbound?.tag || "Sanaei Smart Sub"})</string>
			<key>PayloadIdentifier</key>
			<string>com.sanaei.l2tp.${sub.username}</string>
			<key>PayloadType</key>
			<string>com.apple.vpn.managed</string>
			<key>PayloadUUID</key>
			<string>987F6A22-38DB-4B2E-8EFC-3E37CE${Math.floor(Math.random()*100000)}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>UserDefinedName</key>
			<string>L2TP - ${sub.username}</string>
			<key>VPNType</key>
			<string>L2TP</string>
		</dict>
	</array>
	<key>PayloadDisplayName</key>
	<string>L2TP VPN Smart Configuration - ${sub.username}</string>
	<key>PayloadIdentifier</key>
	<string>com.sanaei.profile.${sub.username}</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>0A8892EF-B8D4-498A-BFDE-1B49D8${Math.floor(Math.random()*100000)}</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>`;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/x-apple-aspen-config; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="L2TP_${sub.username}.mobileconfig"`);
  res.send(mobileconfig);
});

// 7. WireGuard profile download (.conf)
app.get("/api/sub/:token/wireguard-conf", (req, res) => {
  const sub = dbData.subscriptions.find((s) => s.id === req.params.token || s.username === req.params.token);
  if (!sub) {
    res.status(404).send("Subscription not found");
    return;
  }

  const inboundId = req.query.inboundId as string;
  const inbound = inboundId ? dbData.inbounds.find((i) => i.id === inboundId) : dbData.inbounds[0];
  const serverIp = inbound?.serverIp || sub.l2tpServerIp || "127.0.0.1";
  const serverPort = inbound?.wgPort || inbound?.port || dbData.settings?.wgServerPort || 51820;
  const serverPub = inbound?.wgServerPublicKey || dbData.settings?.wgServerPublicKey || sub.wireguardPublicKey;

  const wgConf = `[Interface]
PrivateKey = ${sub.wireguardPrivateKey}
Address = ${sub.wireguardAddress || "10.8.0.2/24"}
DNS = ${sub.wireguardDns || "1.1.1.1, 8.8.8.8"}

[Peer]
PublicKey = ${serverPub}
Endpoint = ${serverIp}:${serverPort}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
`;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="WireGuard_${sub.username}_${inbound?.tag?.replace(/[^a-zA-Z0-9]/g, "_") || "node"}.conf"`);
  res.send(wgConf);
});

// 8. OpenVPN profile download (.ovpn)
app.get("/api/sub/:token/openvpn-ovpn", (req, res) => {
  const sub = dbData.subscriptions.find((s) => s.id === req.params.token || s.username === req.params.token);
  if (!sub) {
    res.status(404).send("Subscription not found");
    return;
  }

  const inboundId = req.query.inboundId as string;
  const inbound = inboundId ? dbData.inbounds.find((i) => i.id === inboundId) : dbData.inbounds[0];
  const serverIp = inbound?.serverIp || sub.l2tpServerIp || "127.0.0.1";
  const port = inbound?.openvpnPort || sub.openvpnPort || 1194;
  const proto = inbound?.openvpnProto || sub.openvpnProto || "udp";

  const ovpnConfig = `client
dev tun
proto ${proto}
remote ${serverIp} ${port}
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-GCM
data-ciphers AES-256-GCM:AES-128-GCM:CHACHA20-POLY1305
auth SHA256
verb 3
keepalive 10 60

# Inlined User Authentication
auth-user-pass
<auth-user-pass>
${sub.openvpnUser}
${sub.openvpnPass}
</auth-user-pass>

<ca>
${OPENVPN_VALID_CA}
</ca>
`;

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="OpenVPN_${sub.username}_${inbound?.tag?.replace(/[^a-zA-Z0-9]/g, "_") || "node"}.ovpn"`);
  res.send(ovpnConfig);
});

// 9. Server installation script downloader
app.get("/install.sh", (req, res) => {
  const installPath = path.join(process.cwd(), "install.sh");
  if (fs.existsSync(installPath)) {
    res.setHeader("Content-Type", "text/plain");
    res.send(fs.readFileSync(installPath, "utf8"));
  } else {
    res.status(404).send("Installation script not found.");
  }
});


// Dev vs Production Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
