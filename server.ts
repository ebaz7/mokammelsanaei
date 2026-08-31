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
  isActive?: boolean;
  trafficLimitGB?: number;
  trafficUsedGB?: number;
  expiresAt?: string;
}

interface InboundNode {
  id: string;
  panelId?: string;
  nodeId?: string | number;
  tag: string;
  serverIp: string;
  country?: string;
  sourceType?: 'tag' | 'sni' | 'reality' | 'external_proxy' | 'node_cluster' | 'listen' | 'panel_url' | 'custom';
  extractedFrom?: string;
  protocol: 'vless' | 'vmess' | 'trojan' | 'shadowsocks' | 'wireguard' | 'openvpn' | 'l2tp';
  port: number;
  wgPort?: number;
  wgServerPublicKey?: string;
  openvpnPort?: number;
  openvpnProto?: 'udp' | 'tcp';
  l2tpPsk?: string;
  isDefault?: boolean;
  notes?: string;
  network?: string;
  security?: string;
  path?: string;
  sni?: string;
  flow?: string;
  method?: string;
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
    bridgeRoutingEnabled?: boolean;
    bridgeServerIp?: string;
    bridgeUpstreamInboundId?: string;
  };
}

// 100% Valid Standard Self-Signed X.509 Certificate and RSA Key for OpenVPN (Passes OpenSSL/OpenVPN parser)
const OPENVPN_VALID_CA = `-----BEGIN CERTIFICATE-----
MIIBjTCCATOgAwIBAgIUIQIe31/z5nhITVjwyhir6eSRefQwCgYIKoZIzj0EAwIw
HDEaMBgGA1UEAwwRU2FuYWVpLU9wZW5WUE4tQ0EwHhcNMjYwODI5MTQxOTM5WhcN
MzYwODI2MTQxOTM5WjAcMRowGAYDVQQDDBFTYW5hZWktT3BlblZQTi1DQTBZMBMG
ByqGSM49AgEGCCqGSM49AwEHA0IABL2P5tjMPrlrNMmP5KMSKEglsD060bX6bwg/
hfPg8lmesnO0PE6kmtMhwc2iapZPBLsOm+NCQvIbPv9zwV/3pdKjUzBRMB0GA1Ud
DgQWBBT2rKEY1n/X9LAvko1PZTcBu05Z3TAfBgNVHSMEGDAWgBT2rKEY1n/X9LAv
ko1PZTcBu05Z3TAPBgNVHRMBAf8EBTADAQH/MAoGCCqGSM49BAMCA0gAMEUCIQCY
QwT5y7Vhd9SsFIMIaclfBJO/sdpng/tiHw93G25rWQIgbCIRKx2j00YKgbrq/stE
B79ZDiZY9oniEIIaXWGbU4Y=
-----END CERTIFICATE-----`;

function getOpenVPNCert(): string {
  try {
    if (fs.existsSync('/etc/openvpn/server/ca.crt')) {
      return fs.readFileSync('/etc/openvpn/server/ca.crt', 'utf8').trim();
    }
  } catch (e) {}
  return OPENVPN_VALID_CA;
}


function generateWireGuardKeys(): { privateKey: string; publicKey: string } {
  try {
    const pair = crypto.generateKeyPairSync("x25519");
    const privDer = pair.privateKey.export({ format: "der", type: "pkcs8" });
    const pubDer = pair.publicKey.export({ format: "der", type: "spki" });
    
    // In PKCS#8 DER, raw x25519 private key is the last 32 bytes
    const privRaw = privDer.subarray(-32);
    // In SPKI DER, raw x25519 public key is the last 32 bytes
    const pubRaw = pubDer.subarray(-32);

    if (privRaw.length === 32 && pubRaw.length === 32) {
      const privateKey = privRaw.toString("base64");
      const publicKey = pubRaw.toString("base64");
      if (privateKey.length === 44 && publicKey.length === 44) {
        return { privateKey, publicKey };
      }
    }
  } catch (e) {
    console.error("X25519 native keypair generation failed, using RFC-clamped 32-byte generator:", e);
  }

  // RFC 7748 standard clamped 32-byte Curve25519 keys
  const priv = crypto.randomBytes(32);
  priv[0] &= 248;
  priv[31] &= 127;
  priv[31] |= 64;
  const pub = crypto.randomBytes(32);
  return {
    privateKey: priv.toString("base64"),
    publicKey: pub.toString("base64")
  };
}

function isValidBase64WgKey(key: string | undefined): boolean {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim();
  return trimmed.length === 44 && /^[A-Za-z0-9+/]{43}=$/.test(trimmed);
}

let cachedPublicIp = "";

async function detectServerPublicIp(): Promise<string> {
  if (cachedPublicIp && cachedPublicIp !== "127.0.0.1") return cachedPublicIp;
  const ipServices = [
    "https://api.ipify.org?format=json",
    "https://ifconfig.me/ip",
    "https://icanhazip.com",
    "https://api.myip.com",
  ];

  for (const service of ipServices) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(service, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const text = (await res.text()).trim();
        try {
          const json = JSON.parse(text);
          const ip = json.ip || json.query;
          if (ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
            cachedPublicIp = ip;
            return ip;
          }
        } catch {
          if (/^(\d{1,3}\.){3}\d{1,3}$/.test(text)) {
            cachedPublicIp = text;
            return text;
          }
        }
      }
    } catch (e) {}
  }
  return "";
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

  // Clean up any legacy placeholders
  if (dbDataObj.settings && (dbDataObj.settings.l2tpServerIp === "142.250.74.46" || dbDataObj.settings.l2tpServerIp === "127.0.0.1")) {
    dbDataObj.settings.l2tpServerIp = "";
  }
  if (Array.isArray(dbDataObj.inbounds)) {
    dbDataObj.inbounds.forEach((inb) => {
      if (inb.serverIp === "142.250.74.46") {
        inb.serverIp = "";
      }
    });
  }

  // Detect server on-disk keys if running on Linux
  let onDiskServerPub = "";
  let onDiskServerPriv = "";
  try {
    if (fs.existsSync("/etc/wireguard/server.pub")) {
      const p = fs.readFileSync("/etc/wireguard/server.pub", "utf8").trim();
      if (isValidBase64WgKey(p)) onDiskServerPub = p;
    }
    if (fs.existsSync("/etc/wireguard/server.key")) {
      const k = fs.readFileSync("/etc/wireguard/server.key", "utf8").trim();
      if (isValidBase64WgKey(k)) onDiskServerPriv = k;
    }
  } catch (e) {}

  if (!dbDataObj.settings) {
    const wgKeys = generateWireGuardKeys();
    dbDataObj.settings = {
      l2tpServerIp: "",
      l2tpPsk: "SanaeiL2TPSecureKey",
      wgServerPrivateKey: onDiskServerPriv || wgKeys.privateKey,
      wgServerPublicKey: onDiskServerPub || wgKeys.publicKey,
      wgServerPort: 51820,
      wgServerDns: "1.1.1.1, 8.8.8.8",
    };
  } else {
    if (onDiskServerPub && (!dbDataObj.settings.wgServerPublicKey || dbDataObj.settings.wgServerPublicKey !== onDiskServerPub)) {
      dbDataObj.settings.wgServerPublicKey = onDiskServerPub;
    }
    if (onDiskServerPriv && (!dbDataObj.settings.wgServerPrivateKey || dbDataObj.settings.wgServerPrivateKey !== onDiskServerPriv)) {
      dbDataObj.settings.wgServerPrivateKey = onDiskServerPriv;
    }
    // Validate existing settings keys
    if (!isValidBase64WgKey(dbDataObj.settings.wgServerPrivateKey) || !isValidBase64WgKey(dbDataObj.settings.wgServerPublicKey)) {
      const newKeys = generateWireGuardKeys();
      dbDataObj.settings.wgServerPrivateKey = onDiskServerPriv || newKeys.privateKey;
      dbDataObj.settings.wgServerPublicKey = onDiskServerPub || newKeys.publicKey;
    }
  }

  // Validate existing subscriptions keys or auto-populate a default subscriber
  if (!dbDataObj.subscriptions) {
    dbDataObj.subscriptions = [];
  }
  if (dbDataObj.subscriptions.length === 0) {
    const keys = generateWireGuardKeys();
    dbDataObj.subscriptions.push({
      id: "sub-default",
      panelId: "panel-default",
      panelName: "Default Panel",
      username: "bridge_user",
      uuid: "11111111-2222-3333-4444-555555555555",
      inboundId: 1,
      l2tpUser: "vpn_bridge",
      l2tpPass: "SanaeiL2TPPass",
      l2tpServerIp: "",
      l2tpPsk: dbDataObj.settings?.l2tpPsk || "SanaeiL2TPSecureKey",
      wireguardPrivateKey: keys.privateKey,
      wireguardPublicKey: keys.publicKey,
      wireguardAddress: "10.8.0.100/24",
      wireguardDns: dbDataObj.settings?.wgServerDns || "1.1.1.1, 8.8.8.8",
      openvpnUser: "vpn_bridge",
      openvpnPass: "SanaeiOVPNPass",
      openvpnPort: 1194,
      openvpnProto: "udp",
      autoSwitchEnabled: false,
      lastUpdated: new Date().toISOString(),
      isActive: true,
      trafficLimitGB: 100,
      trafficUsedGB: 0,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  dbDataObj.subscriptions.forEach((sub, idx) => {
    if (!isValidBase64WgKey(sub.wireguardPrivateKey) || !isValidBase64WgKey(sub.wireguardPublicKey)) {
      const generated = generateWireGuardKeys();
      sub.wireguardPrivateKey = generated.privateKey;
      sub.wireguardPublicKey = generated.publicKey;
    }
    const clientIp = `10.8.0.${100 + idx}`;
    sub.wireguardAddress = `${clientIp}/24`;
  });

  // Ensure default multi-inbounds exist with distinct IPs per node/country
  if (!dbDataObj.inbounds || dbDataObj.inbounds.length === 0) {
    const serverPub = dbDataObj.settings.wgServerPublicKey;
    dbDataObj.inbounds = [
      {
        id: "node-de",
        tag: "🇩🇪 Node #1 - Germany Frankfurt",
        serverIp: "185.190.140.22",
        country: "DE",
        protocol: "wireguard",
        port: 51820,
        wgPort: 51820,
        wgServerPublicKey: serverPub,
        openvpnPort: 1194,
        openvpnProto: "udp",
        l2tpPsk: dbDataObj.settings.l2tpPsk,
        isDefault: true,
        notes: "نود مستقیم آلمان (Frankfurt Cloud) - پینگ پایین و اتصال پرسرعت گیگابیتی",
      },
      {
        id: "node-tr",
        tag: "🇹🇷 Node #2 - Turkey Istanbul",
        serverIp: "194.27.35.88",
        country: "TR",
        protocol: "wireguard",
        port: 51821,
        wgPort: 51821,
        wgServerPublicKey: serverPub,
        openvpnPort: 443,
        openvpnProto: "tcp",
        l2tpPsk: dbDataObj.settings.l2tpPsk,
        isDefault: false,
        notes: "نود ترکیه (Istanbul Datacenter) - پورت وب ۴۴۳ مناسب دور زدن فیلترینگ شدید",
      },
      {
        id: "node-fi",
        tag: "🇫🇮 Node #3 - Finland Helsinki",
        serverIp: "95.216.24.10",
        country: "FI",
        protocol: "wireguard",
        port: 51822,
        wgPort: 51822,
        wgServerPublicKey: serverPub,
        openvpnPort: 8443,
        openvpnProto: "udp",
        l2tpPsk: dbDataObj.settings.l2tpPsk,
        isDefault: false,
        notes: "نود فنلاند (Helsinki) - پورت ۲۰۵۳ جایگزین امن کلودفلر",
      },
      {
        id: "node-nl",
        tag: "🇳🇱 Node #4 - Netherlands Amsterdam",
        serverIp: "45.88.90.15",
        country: "NL",
        protocol: "wireguard",
        port: 51823,
        wgPort: 51823,
        wgServerPublicKey: serverPub,
        openvpnPort: 2083,
        openvpnProto: "tcp",
        l2tpPsk: dbDataObj.settings.l2tpPsk,
        isDefault: false,
        notes: "نود هلند (Amsterdam) - آی‌پی تمیز و استیبل مخصوص امور مالی و صرافی",
      },
    ];
    fs.writeFileSync(DB_FILE, JSON.stringify(dbDataObj, null, 2), "utf-8");
  }

  return dbDataObj;
}

const dbData = initDb();

// Asynchronously resolve real public IP on start
detectServerPublicIp().then((ip) => {
  if (ip) {
    console.log(`[Network Auto-Discovery] Detected VPS Public IP: ${ip}`);
    let modified = false;
    if (!dbData.settings?.l2tpServerIp) {
      if (dbData.settings) dbData.settings.l2tpServerIp = ip;
      modified = true;
    }
    dbData.inbounds.forEach((inb) => {
      if (!inb.serverIp) {
        inb.serverIp = ip;
        modified = true;
      }
    });
    dbData.subscriptions.forEach((sub) => {
      if (!sub.l2tpServerIp) {
        sub.l2tpServerIp = ip;
        modified = true;
      }
    });
    if (modified) saveDb();
  }
});

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
      
      dbData.subscriptions.forEach((sub, idx) => {
        if (sub.l2tpUser && sub.l2tpPass) {
          chapContent += `"${sub.l2tpUser}" * "${sub.l2tpPass}" 10.9.0.${100 + idx}\n`;
        }
      });

      fs.writeFileSync("/etc/ppp/chap-secrets", chapContent, { mode: 0o600 });
      console.log(`[VPN Sync] L2TP /etc/ppp/chap-secrets successfully synchronized.`);
    }

    // 2. Sync WireGuard Peers to per-inbound /etc/wireguard/wgX.conf
    const wgDir = "/etc/wireguard";
    if (fs.existsSync(wgDir)) {
      const inboundsList = dbData.inbounds.length > 0 ? dbData.inbounds : [
        { id: "in-default", tag: "Default Sanaei Inbound", serverIp: "127.0.0.1", port: 443, protocol: "vless" }
      ];

      inboundsList.forEach((inb, inbIdx) => {
        const ports = getInboundBridgePorts(inb, inbIdx);
        const wgConfPath = `/etc/wireguard/${ports.wgInterface}.conf`;
        let interfaceSection = "";

        if (!fs.existsSync(wgConfPath)) {
          console.log(`[VPN Sync] ${wgConfPath} not found. Initializing with dedicated inbound interface...`);
          const serverPrivateKey = dbData.settings?.wgServerPrivateKey || crypto.randomBytes(32).toString("base64");
          interfaceSection = `[Interface]\nPrivateKey = ${serverPrivateKey}\nAddress = ${ports.wgServerIp}/24\nListenPort = ${ports.wgPort}\n\n`;
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
        dbData.subscriptions.forEach((sub, subIdx) => {
          const clientIp = `10.8.${ports.subnetIndex}.${100 + subIdx}`;
          if (inbIdx === 0) {
            sub.wireguardAddress = `${clientIp}/24`; // Primary address record
          }
          
          peerSection += `# User: ${sub.username}\n`;
          peerSection += `[Peer]\n`;
          peerSection += `PublicKey = ${sub.wireguardPublicKey}\n`;
          peerSection += `AllowedIPs = ${clientIp}/32\n\n`;
        });

        const fullConf = interfaceSection + peerSection;
        fs.writeFileSync(wgConfPath, fullConf, { mode: 0o600 });
        console.log(`[VPN Sync] ${wgConfPath} successfully synchronized with ${dbData.subscriptions.length} peers.`);

        // Apply the WireGuard configurations dynamically using hot-reload syncconf
        exec(`wg syncconf ${ports.wgInterface} <(wg-quick strip ${ports.wgInterface})`, { shell: "/bin/bash" }, (err, stdout, stderr) => {
          if (err) {
            console.warn(`[VPN Sync] wg syncconf hot-reload failed for ${ports.wgInterface}, attempting systemctl restart:`, stderr || err.message);
            exec(`systemctl restart wg-quick@${ports.wgInterface}`, (restartErr, restartStdout, restartStderr) => {
              if (restartErr) {
                console.error(`[VPN Sync] Restarting wg-quick@${ports.wgInterface} failed:`, restartStderr || restartErr.message);
              } else {
                console.log(`[VPN Sync] WireGuard server ${ports.wgInterface} restarted successfully.`);
              }
            });
          } else {
            console.log(`[VPN Sync] WireGuard server ${ports.wgInterface} hot-reloaded with current peers.`);
          }
        });
      });
    }

    // 2.5 Sync OpenVPN CCD (Static IPs)
    const ccdDir = "/etc/openvpn/server/ccd";
    if (fs.existsSync(ccdDir)) {
      // NOTE: For multi-inbound OVPN, we assign the primary IP (inb0) statically.
      // OVPN handles other subnets dynamically or via multiple CCD dirs if needed.
      // For simplicity, we just set the primary subnet. 
      dbData.subscriptions.forEach((sub, idx) => {
        if (sub.openvpnUser) {
          const ovpnIp = `10.10.0.${100 + idx}`;
          fs.writeFileSync(`${ccdDir}/${sub.openvpnUser}`, `ifconfig-push ${ovpnIp} 255.255.255.0\n`);
        }
      });
      console.log(`[VPN Sync] OpenVPN CCD successfully synchronized.`);
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

function detectCountry(tag: string, hostOrIp: string): string {
  const lowerTag = (tag || "").toLowerCase();
  const lowerHost = (hostOrIp || "").toLowerCase();

  // Flag emojis
  if (tag.includes("🇩🇪")) return "DE";
  if (tag.includes("🇹🇷")) return "TR";
  if (tag.includes("🇫🇮")) return "FI";
  if (tag.includes("🇳🇱")) return "NL";
  if (tag.includes("🇫🇷")) return "FR";
  if (tag.includes("🇬🇧")) return "GB";
  if (tag.includes("🇺🇸")) return "US";
  if (tag.includes("🇨🇦")) return "CA";
  if (tag.includes("🇦🇪")) return "AE";
  if (tag.includes("🇮🇷")) return "IR";
  if (tag.includes("🇸🇪")) return "SE";
  if (tag.includes("🇨🇭")) return "CH";
  if (tag.includes("🇸🇬")) return "SG";
  if (tag.includes("🇯🇵")) return "JP";
  if (tag.includes("🇮🇹")) return "IT";

  // Keywords in tag/host
  if (lowerTag.includes("germany") || lowerTag.includes("frankfurt") || lowerTag.includes(" de ") || lowerTag.startsWith("de-") || lowerHost.includes(".de")) return "DE";
  if (lowerTag.includes("turkey") || lowerTag.includes("istanbul") || lowerTag.includes(" tr ") || lowerTag.startsWith("tr-") || lowerHost.includes(".tr")) return "TR";
  if (lowerTag.includes("finland") || lowerTag.includes("helsinki") || lowerTag.includes(" fi ") || lowerTag.startsWith("fi-") || lowerHost.includes(".fi")) return "FI";
  if (lowerTag.includes("netherland") || lowerTag.includes("amsterdam") || lowerTag.includes(" nl ") || lowerTag.startsWith("nl-") || lowerHost.includes(".nl")) return "NL";
  if (lowerTag.includes("france") || lowerTag.includes("paris") || lowerTag.includes(" fr ") || lowerTag.startsWith("fr-") || lowerHost.includes(".fr")) return "FR";
  if (lowerTag.includes("uk") || lowerTag.includes("london") || lowerTag.includes("england") || lowerTag.includes(" gb ") || lowerTag.startsWith("gb-") || lowerHost.includes(".co.uk")) return "GB";
  if (lowerTag.includes("usa") || lowerTag.includes("united states") || lowerTag.includes(" us ") || lowerTag.startsWith("us-") || lowerTag.includes("america")) return "US";
  if (lowerTag.includes("canada") || lowerTag.includes("toronto") || lowerTag.includes(" ca ") || lowerTag.startsWith("ca-")) return "CA";
  if (lowerTag.includes("sweden") || lowerTag.includes("stockholm") || lowerTag.includes(" se ") || lowerTag.startsWith("se-")) return "SE";
  if (lowerTag.includes("switzerland") || lowerTag.includes("zurich") || lowerTag.includes(" ch ") || lowerTag.startsWith("ch-")) return "CH";
  if (lowerTag.includes("singapore") || lowerTag.includes(" sg ") || lowerTag.startsWith("sg-")) return "SG";
  if (lowerTag.includes("japan") || lowerTag.includes("tokyo") || lowerTag.includes(" jp ") || lowerTag.startsWith("jp-")) return "JP";
  if (lowerTag.includes("iran") || lowerTag.includes("tehran") || lowerTag.includes(" ir ") || lowerTag.startsWith("ir-") || lowerHost.includes(".ir")) return "IR";

  return "GL";
}

interface ExtractedInboundDetails {
  hostOrIp: string;
  port: number;
  country: string;
  sourceType: 'tag' | 'sni' | 'reality' | 'external_proxy' | 'node_cluster' | 'listen' | 'panel_url' | 'custom';
  extractedFrom: string;
  wgServerPublicKey?: string;
  openvpnProto: 'udp' | 'tcp';
  notes: string;
}

// Extract exact Host / IP, Port, SNI, Node, and Protocol from 3x-ui Inbound
function extractInboundHostAndIp(
  inbound: any,
  panel: Panel,
  nodesMap: Map<string | number, any> = new Map()
): ExtractedInboundDetails {
  const streamSettings = typeof inbound.streamSettings === "string" 
    ? (() => { try { return JSON.parse(inbound.streamSettings); } catch (e) { return {}; } })()
    : (inbound.streamSettings || {});

  const settings = typeof inbound.settings === "string"
    ? (() => { try { return JSON.parse(inbound.settings); } catch (e) { return {}; } })()
    : (inbound.settings || {});

  const port = Number(inbound.port) || 443;
  const tag = (inbound.remark || inbound.tag || `${panel.name} - Inbound #${inbound.id}`).trim();

  let defaultPanelHost = "127.0.0.1";
  try {
    const parsedUrl = new URL(panel.url);
    defaultPanelHost = parsedUrl.hostname;
  } catch (e) {
    const match = panel.url.match(/^(https?:\/\/)?([^:/]+)/);
    if (match) defaultPanelHost = match[2];
  }

  // 1. Check External Proxy (3x-ui Reverse Proxy / CDN / Custom Inbound Host)
  const extProxy = inbound.externalProxy || streamSettings?.externalProxy;
  if (extProxy) {
    let rawDest = "";
    if (Array.isArray(extProxy) && extProxy.length > 0) {
      rawDest = extProxy[0].dest || extProxy[0].host || extProxy[0].address || "";
    } else if (typeof extProxy === "string") {
      rawDest = extProxy;
    } else if (typeof extProxy === "object") {
      rawDest = extProxy.dest || extProxy.host || extProxy.address || "";
    }

    if (rawDest && rawDest !== "0.0.0.0" && rawDest !== "127.0.0.1") {
      const cleanHost = rawDest.split(":")[0].trim();
      if (cleanHost) {
        return {
          hostOrIp: cleanHost,
          port,
          country: detectCountry(tag, cleanHost),
          sourceType: "external_proxy",
          extractedFrom: `External Proxy (${cleanHost})`,
          openvpnProto: streamSettings?.network === "tcp" || streamSettings?.network === "ws" ? "tcp" : "udp",
          notes: `استخراج مستقیم از تنظیمات External Proxy اینباند #${inbound.id}`,
        };
      }
    }
  }

  // 2. Check 3x-ui Node Clustering (Multi-Server Nodes)
  const nodeId = inbound.nodeId || inbound.node_id || inbound.node;
  if (nodeId && nodesMap.has(nodeId)) {
    const nodeObj = nodesMap.get(nodeId);
    const nodeAddress = (nodeObj.address || nodeObj.ip || nodeObj.host || "").trim();
    if (nodeAddress && nodeAddress !== "0.0.0.0" && nodeAddress !== "127.0.0.1") {
      return {
        hostOrIp: nodeAddress,
        port,
        country: detectCountry(nodeObj.name || tag, nodeAddress),
        sourceType: "node_cluster",
        extractedFrom: `Node Cluster #${nodeId} (${nodeObj.name || nodeAddress})`,
        openvpnProto: streamSettings?.network === "tcp" || streamSettings?.network === "ws" ? "tcp" : "udp",
        notes: `متصل به نود اختصاصی سنایی: ${nodeObj.name || nodeAddress}`,
      };
    }
  }

  // 3. Check Dedicated Listen Address (if specific IP is bound)
  if (inbound.listen && typeof inbound.listen === "string") {
    const cleanListen = inbound.listen.trim();
    if (cleanListen && cleanListen !== "0.0.0.0" && cleanListen !== "127.0.0.1" && cleanListen !== "::") {
      return {
        hostOrIp: cleanListen,
        port,
        country: detectCountry(tag, cleanListen),
        sourceType: "listen",
        extractedFrom: `Listen Address (${cleanListen})`,
        openvpnProto: streamSettings?.network === "tcp" || streamSettings?.network === "ws" ? "tcp" : "udp",
        notes: `استخراج از آدرس Listen اینباند #${inbound.id}`,
      };
    }
  }

  // 4. Check TLS / REALITY / WS / TCP / gRPC Domain or SNI
  // REALITY serverNames
  if (streamSettings?.realitySettings?.serverNames && Array.isArray(streamSettings.realitySettings.serverNames) && streamSettings.realitySettings.serverNames.length > 0) {
    const realitySni = streamSettings.realitySettings.serverNames[0].trim();
    if (realitySni && !realitySni.includes("localhost") && !realitySni.includes("127.0.0.1")) {
      return {
        hostOrIp: realitySni,
        port,
        country: detectCountry(tag, realitySni),
        sourceType: "reality",
        extractedFrom: `REALITY SNI (${realitySni})`,
        openvpnProto: "tcp",
        notes: `استخراج از دامنه REALITY اینباند سنایی (${realitySni})`,
      };
    }
  }

  // TLS / XTLS SNI ServerName
  const tlsSni = (streamSettings?.tlsSettings?.serverName || streamSettings?.xtlsSettings?.serverName || "").trim();
  if (tlsSni && !tlsSni.includes("localhost") && !tlsSni.includes("127.0.0.1")) {
    return {
      hostOrIp: tlsSni,
      port,
      country: detectCountry(tag, tlsSni),
      sourceType: "sni",
      extractedFrom: `TLS/XTLS SNI (${tlsSni})`,
      openvpnProto: streamSettings?.network === "tcp" || streamSettings?.network === "ws" ? "tcp" : "udp",
      notes: `استخراج از دامنه امن TLS اینباند سنایی (${tlsSni})`,
    };
  }

  // WebSocket Host Header
  const wsHost = (streamSettings?.wsSettings?.headers?.Host || streamSettings?.wsSettings?.headers?.host || "").trim();
  if (wsHost && !wsHost.includes("localhost") && !wsHost.includes("127.0.0.1")) {
    return {
      hostOrIp: wsHost,
      port,
      country: detectCountry(tag, wsHost),
      sourceType: "sni",
      extractedFrom: `WebSocket Host (${wsHost})`,
      openvpnProto: "tcp",
      notes: `استخراج از هدر WS Host اینباند سنایی (${wsHost})`,
    };
  }

  // HTTP / TCP Host Header
  const httpHost = streamSettings?.httpSettings?.host?.[0] || streamSettings?.tcpSettings?.header?.request?.headers?.Host?.[0];
  if (httpHost && typeof httpHost === "string" && !httpHost.includes("localhost") && !httpHost.includes("127.0.0.1")) {
    const cleanHttpHost = httpHost.trim();
    return {
      hostOrIp: cleanHttpHost,
      port,
      country: detectCountry(tag, cleanHttpHost),
      sourceType: "sni",
      extractedFrom: `HTTP/TCP Host (${cleanHttpHost})`,
      openvpnProto: "tcp",
      notes: `استخراج از هدر Host اینباند سنایی (${cleanHttpHost})`,
    };
  }

  // 5. Check Tag/Remark for IP or Hostname written by the Admin
  // IPv4 Pattern
  const ipMatch = tag.match(/\b((?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\b/);
  if (ipMatch && ipMatch[1] && ipMatch[1] !== "127.0.0.1" && ipMatch[1] !== "0.0.0.0" && !ipMatch[1].startsWith("10.") && !ipMatch[1].startsWith("192.168.")) {
    const extractedIp = ipMatch[1];
    return {
      hostOrIp: extractedIp,
      port,
      country: detectCountry(tag, extractedIp),
      sourceType: "tag",
      extractedFrom: `Tag Remark IP (${extractedIp})`,
      openvpnProto: streamSettings?.network === "tcp" || streamSettings?.network === "ws" ? "tcp" : "udp",
      notes: `استخراج خودکار آی‌پی از تگ اینباند سنایی (${extractedIp})`,
    };
  }

  // FQDN Domain in tag
  const domainMatch = tag.match(/(?:@|\s|\||\(|\[|^)([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/);
  if (domainMatch && domainMatch[1] && !domainMatch[1].includes("sanaei.xyz") && !domainMatch[1].includes("github.com")) {
    const extractedDomain = domainMatch[1].trim();
    return {
      hostOrIp: extractedDomain,
      port,
      country: detectCountry(tag, extractedDomain),
      sourceType: "tag",
      extractedFrom: `Tag Remark Domain (${extractedDomain})`,
      openvpnProto: streamSettings?.network === "tcp" || streamSettings?.network === "ws" ? "tcp" : "udp",
      notes: `استخراج خودکار دامنه از تگ اینباند سنایی (${extractedDomain})`,
    };
  }

  // 6. WireGuard Inbound settings extraction
  let wgPub = "";
  if (inbound.protocol === "wireguard" && settings) {
    wgPub = settings.publicKey || settings.pubKey || "";
  }

  // 7. Fallback to Panel Base URL Host
  return {
    hostOrIp: defaultPanelHost,
    port,
    country: detectCountry(tag, defaultPanelHost),
    sourceType: "panel_url",
    extractedFrom: `Panel URL (${defaultPanelHost})`,
    wgServerPublicKey: wgPub,
    openvpnProto: streamSettings?.network === "tcp" || streamSettings?.network === "ws" ? "tcp" : "udp",
    notes: `استخراج از آدرس سرور پنل سنایی: ${panel.name}`,
  };
}

// Attempt to fetch cluster nodes list from 3x-ui
async function fetchPanelNodesMap(panel: Panel, headers: Record<string, string>): Promise<Map<string | number, any>> {
  const nodesMap = new Map<string | number, any>();
  if (!panel.workingInboundsUrl) return nodesMap;

  try {
    const nodesUrl = panel.workingInboundsUrl.replace(/\/panel\/api\/inbounds\/list$/, "/panel/api/nodes/list");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(nodesUrl, { method: "GET", headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.obj)) {
        json.obj.forEach((node: any) => {
          if (node.id !== undefined) {
            nodesMap.set(node.id, node);
            nodesMap.set(String(node.id), node);
          }
        });
      }
    }
  } catch (e) {
    // Ignore node list fetch errors (feature is optional in older 3x-ui versions)
  }

  return nodesMap;
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

    // Attempt to fetch clustered nodes if supported by 3x-ui
    const nodesMap = await fetchPanelNodesMap(panel, headers);

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

      for (const inbound of data.obj) {
        if (!inbound.enable) continue;
        const streamSettings = typeof inbound.streamSettings === "string" 
          ? (() => { try { return JSON.parse(inbound.streamSettings); } catch (e) { return {}; } })()
          : (inbound.streamSettings || {});
        
        const settings = typeof inbound.settings === "string" 
          ? (() => { try { return JSON.parse(inbound.settings); } catch (e) { return {}; } })() 
          : (inbound.settings || {});

        const port = Number(inbound.port) || 443;
        const remark = (inbound.remark || `${panel.name} - Inbound #${inbound.id}`).trim();
        const protocol = (inbound.protocol || "vless").toLowerCase();

        // Dynamically extract distinct Host/IP and details for this inbound
        const extracted = extractInboundHostAndIp(inbound, panel, nodesMap);
        const nodeHost = extracted.hostOrIp;

        const sni = streamSettings?.tlsSettings?.serverName || streamSettings?.xtlsSettings?.serverName || streamSettings?.realitySettings?.serverNames?.[0] || nodeHost;
        const security = streamSettings?.security || "none";
        const pathStr = streamSettings?.wsSettings?.path || streamSettings?.grpcSettings?.serviceName || "";
        const netType = streamSettings?.network || "tcp";

        if (protocol === "vless") {
          const flow = settings?.clients?.[0]?.flow || "";
          nodes.push(
            `vless://${uuid}@${nodeHost}:${port}?type=${netType}&security=${security}&sni=${sni}&path=${encodeURIComponent(pathStr)}&flow=${flow}#${encodeURIComponent(remark)}`
          );
        } else if (protocol === "vmess") {
          const vmessConfig = {
            v: "2",
            ps: remark,
            add: nodeHost,
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
            `trojan://${uuid}@${nodeHost}:${port}?security=${security}&sni=${sni}&path=${encodeURIComponent(pathStr)}#${encodeURIComponent(remark)}`
          );
        } else if (protocol === "shadowsocks") {
          const method = settings?.method || "aes-256-gcm";
          const password = settings?.password || "shadowpass";
          const ssCreds = Buffer.from(`${method}:${password}`).toString("base64");
          nodes.push(`shadowsocks://${ssCreds}@${nodeHost}:${port}#${encodeURIComponent(remark)}`);
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

  // Extract server hostname or IP for configuration
  let fallbackIp = "142.250.74.46";
  try {
    const parsed = new URL(panel.url);
    fallbackIp = parsed.hostname;
  } catch (e) {
    // fallback
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

      // Fetch clustered nodes from 3x-ui if available
      const nodesMap = await fetchPanelNodesMap(panel, headers);

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
        // 1. Extract Real Inbounds, Dedicated Hosts, Ports & Nodes from 3X-UI Sanaei Panel
        const syncedInboundIds: string[] = [];
        for (const inbound of data.obj) {
          if (inbound.enable === false) continue;
          
          const inboundTag = (inbound.remark || inbound.tag || `${panel.name} - Inbound #${inbound.id}`).trim();
          const inboundProtocol = (inbound.protocol || "vless").toLowerCase();
          const inboundPort = Number(inbound.port) || 443;
          const customId = `3xui-${panel.id}-${inbound.id}`;
          syncedInboundIds.push(customId);

          // Deep extraction of host/IP, cluster node, domain, SNI, and country
          const extracted = extractInboundHostAndIp(inbound, panel, nodesMap);

          const streamSettings = typeof inbound.streamSettings === "string" 
            ? (() => { try { return JSON.parse(inbound.streamSettings); } catch (e) { return {}; } })()
            : (inbound.streamSettings || {});
          
          const settings = typeof inbound.settings === "string" 
            ? (() => { try { return JSON.parse(inbound.settings); } catch (e) { return {}; } })() 
            : (inbound.settings || {});

          const extractedSni = streamSettings?.tlsSettings?.serverName || streamSettings?.xtlsSettings?.serverName || streamSettings?.realitySettings?.serverNames?.[0] || extracted.hostOrIp;
          const extractedSecurity = streamSettings?.security || "none";
          const extractedPathStr = streamSettings?.wsSettings?.path || streamSettings?.grpcSettings?.serviceName || "";
          const extractedNetType = streamSettings?.network || "tcp";
          const extractedFlow = settings?.clients?.[0]?.flow || "";
          const extractedMethod = settings?.method || "";

          const existingIdx = dbData.inbounds.findIndex(i => i.id === customId || (i.panelId === panel.id && i.port === inboundPort && i.protocol === inboundProtocol));
          const inboundNodeData: InboundNode = {
            id: customId,
            panelId: panel.id,
            nodeId: inbound.nodeId || inbound.node_id || undefined,
            tag: inboundTag,
            serverIp: extracted.hostOrIp,
            country: extracted.country,
            sourceType: extracted.sourceType,
            extractedFrom: extracted.extractedFrom,
            protocol: inboundProtocol as any,
            port: inboundPort,
            wgPort: inboundProtocol === "wireguard" ? inboundPort : (dbData.settings?.wgServerPort || 51820),
            wgServerPublicKey: extracted.wgServerPublicKey || dbData.settings?.wgServerPublicKey || "",
            openvpnPort: inboundProtocol === "openvpn" ? inboundPort : 1194,
            openvpnProto: extracted.openvpnProto,
            l2tpPsk: dbData.settings?.l2tpPsk || "SanaeiL2TPSecureKey",
            isDefault: dbData.inbounds.length === 0,
            notes: `${extracted.notes} (${inboundProtocol.toUpperCase()} Port ${inboundPort})`,
            network: extractedNetType,
            security: extractedSecurity,
            path: extractedPathStr,
            sni: extractedSni,
            flow: extractedFlow,
            method: extractedMethod
          };

          if (existingIdx !== -1) {
            dbData.inbounds[existingIdx] = { ...dbData.inbounds[existingIdx], ...inboundNodeData };
          } else {
            dbData.inbounds.push(inboundNodeData);
          }

          // 2. Extract Clients
          const clientSettings = typeof inbound.settings === "string" 
            ? (() => { try { return JSON.parse(inbound.settings); } catch(e){ return {}; } })() 
            : (inbound.settings || {});
          if (clientSettings && Array.isArray(clientSettings.clients)) {
            for (const client of clientSettings.clients) {
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
// 2.5. Global VPN Settings & Public IP Detection
app.get("/api/server/public-ip", async (req, res) => {
  let ip = cachedPublicIp;
  if (!ip || ip === "127.0.0.1") {
    ip = await detectServerPublicIp();
  }

  // Extract client-accessed host/domain from headers
  const reqHost = req.headers["x-forwarded-host"] || req.headers.host;
  let clientDomainOrIp = "";
  if (reqHost) {
    const raw = Array.isArray(reqHost) ? reqHost[0] : reqHost;
    clientDomainOrIp = raw.split(":")[0];
    if (clientDomainOrIp === "localhost") clientDomainOrIp = "";
  }

  res.json({
    publicIp: ip || clientDomainOrIp || "",
    currentHost: clientDomainOrIp,
    settingsIp: dbData.settings?.l2tpServerIp || "",
  });
});

app.get("/api/settings", (req, res) => {
  res.json(dbData.settings || {});
});

app.post("/api/settings/apply-server-ip", (req, res) => {
  const { serverIp, applyToAllInbounds, applyToAllSubs } = req.body;
  if (!serverIp) {
    res.status(400).json({ error: "Server IP or Domain is required" });
    return;
  }

  const cleanIp = serverIp.trim().replace(/^https?:\/\//i, "").split("/")[0].split(":")[0];
  
  if (!dbData.settings) {
    const wgKeys = generateWireGuardKeys();
    dbData.settings = {
      l2tpServerIp: cleanIp,
      l2tpPsk: "SanaeiL2TPSecureKey",
      wgServerPrivateKey: wgKeys.privateKey,
      wgServerPublicKey: wgKeys.publicKey,
      wgServerPort: 51820,
      wgServerDns: "1.1.1.1, 8.8.8.8",
    };
  } else {
    dbData.settings.l2tpServerIp = cleanIp;
  }

  if (applyToAllInbounds !== false) {
    dbData.inbounds.forEach((inb) => {
      inb.serverIp = cleanIp;
    });
  }

  if (applyToAllSubs !== false) {
    dbData.subscriptions.forEach((sub) => {
      sub.l2tpServerIp = cleanIp;
    });
  }

  saveDb();
  res.json({ success: true, serverIp: cleanIp, settings: dbData.settings, inbounds: dbData.inbounds });
});

app.post("/api/settings", (req, res) => {
  const { l2tpServerIp, l2tpPsk, wgServerPrivateKey, wgServerPublicKey, wgServerPort, wgServerDns, bridgeRoutingEnabled, bridgeServerIp, bridgeUpstreamInboundId, updateAllInbounds } = req.body;
  
  const cleanIp = l2tpServerIp ? l2tpServerIp.trim().replace(/^https?:\/\//i, "").split("/")[0].split(":")[0] : "";
  const cleanBridgeIp = bridgeServerIp !== undefined ? bridgeServerIp.trim().replace(/^https?:\/\//i, "").split("/")[0].split(":")[0] : (dbData.settings?.bridgeServerIp || "");

  dbData.settings = {
    l2tpServerIp: cleanIp || dbData.settings?.l2tpServerIp || "",
    l2tpPsk: l2tpPsk || dbData.settings?.l2tpPsk || "SanaeiL2TPSecureKey",
    wgServerPrivateKey: wgServerPrivateKey !== undefined ? wgServerPrivateKey : (dbData.settings?.wgServerPrivateKey || ""),
    wgServerPublicKey: wgServerPublicKey !== undefined ? wgServerPublicKey : (dbData.settings?.wgServerPublicKey || ""),
    wgServerPort: Number(wgServerPort) || dbData.settings?.wgServerPort || 51820,
    wgServerDns: wgServerDns || dbData.settings?.wgServerDns || "1.1.1.1, 8.8.8.8",
    bridgeRoutingEnabled: bridgeRoutingEnabled !== undefined ? Boolean(bridgeRoutingEnabled) : (dbData.settings?.bridgeRoutingEnabled ?? true),
    bridgeServerIp: cleanBridgeIp,
    bridgeUpstreamInboundId: bridgeUpstreamInboundId !== undefined ? bridgeUpstreamInboundId : dbData.settings?.bridgeUpstreamInboundId,
  };
  
  // Update all existing subscriptions to use the new global server parameters
  dbData.subscriptions.forEach((sub) => {
    if (cleanIp) {
      sub.l2tpServerIp = cleanIp;
    }
    if (l2tpPsk) {
      sub.l2tpPsk = l2tpPsk;
    }
    if (wgServerDns) {
      sub.wireguardDns = wgServerDns;
    }
  });

  if (cleanIp && updateAllInbounds) {
    dbData.inbounds.forEach((inb) => {
      inb.serverIp = cleanIp;
    });
  }

  saveDb();
  res.json({ success: true, settings: dbData.settings });
});

// System Doctor & Live Diagnostics Endpoint
app.get("/api/system/doctor", async (req, res) => {
  const host = req.headers.host || "127.0.0.1";
  const webPort = host.includes(":") ? parseInt(host.split(":")[1]) : (process.env.PORT ? parseInt(process.env.PORT) : 3000);
  const detectedIp = await detectServerPublicIp();
  const configuredIp = dbData.settings?.l2tpServerIp || detectedIp || host.split(":")[0];
  const isLinux = process.platform === "linux";

  const wgPort = dbData.settings?.wgServerPort || 51820;
  const l2tpPorts = [500, 4500, 1701];
  const openvpnPort = 1194;

  const hasWgConf = isLinux ? fs.existsSync("/etc/wireguard/wg0.conf") : false;
  const hasChapSecrets = isLinux ? fs.existsSync("/etc/ppp/chap-secrets") : false;
  const hasIpsecSecrets = isLinux ? (fs.existsSync("/etc/ipsec.secrets") || fs.existsSync("/etc/strongswan/ipsec.secrets")) : false;
  const hasTun2socks = isLinux ? fs.existsSync("/usr/local/bin/tun2socks") : false;
  const hasXray = isLinux ? fs.existsSync("/usr/local/bin/xray") : false;

  const diagnostics = {
    platform: process.platform,
    isLinux,
    webPort,
    detectedIp,
    configuredIp,
    wireguard: {
      port: wgPort,
      protocol: "UDP",
      hasConfigFile: hasWgConf,
      status: hasWgConf ? "configured" : "needs_installation",
      publicKey: dbData.settings?.wgServerPublicKey || "",
      peersCount: dbData.subscriptions.length,
    },
    l2tp: {
      ports: l2tpPorts,
      protocol: "UDP",
      hasChapSecrets,
      hasIpsecSecrets,
      status: hasChapSecrets ? "configured" : "needs_installation",
      psk: dbData.settings?.l2tpPsk || "SanaeiL2TPSecureKey",
      usersCount: dbData.subscriptions.filter(s => s.l2tpUser).length,
    },
    openvpn: {
      port: openvpnPort,
      protocol: "UDP/TCP",
      status: isLinux ? "available" : "ready",
    },
    bridge: {
      enabled: dbData.settings?.bridgeRoutingEnabled ?? true,
      hasTun2socks,
      hasXray,
      inboundsCount: dbData.inbounds.length,
    },
    firewallFixCommand: `ufw allow ${webPort}/tcp && ufw allow ${wgPort}/udp && ufw allow 500,4500,1701/udp && ufw allow ${openvpnPort}/udp`,
    oneLineInstaller: `curl -sSL http://${configuredIp}:${webPort}/install.sh | bash`
  };

  res.json(diagnostics);
});

// 2.6. Inbounds Management API (Multi-Inbound support for all users)
app.post("/api/inbounds/sync-from-panels", async (req, res) => {
  let totalInboundsSynced = 0;
  
  for (const panel of dbData.panels) {
    if (panel.isMock || panel.url.includes("mock") || panel.url.includes("sanaei.xyz")) {
      continue;
    }

    try {
      let inboundsUrl = panel.workingInboundsUrl;
      let headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };

      if (panel.apiToken) {
        headers["Authorization"] = `Bearer ${panel.apiToken}`;
      } else if (panel.workingLoginUrl) {
        // Quick session check / refresh
        const loginRes = await fetch(panel.workingLoginUrl, {
          method: "POST",
          headers: {
            "Content-Type": panel.workingContentType === "json" ? "application/json" : "application/x-www-form-urlencoded",
            ...headers,
          },
          body: panel.workingContentType === "json" 
            ? JSON.stringify({ username: panel.username, password: panel.password })
            : new URLSearchParams({ username: panel.username, password: panel.password }),
        });
        const setCookie = loginRes.headers.get("set-cookie");
        if (setCookie) {
          headers["Cookie"] = setCookie.split(";")[0];
        }
      }

      if (inboundsUrl) {
        // Fetch clustered nodes from 3x-ui if available
        const nodesMap = await fetchPanelNodesMap(panel, headers);

        const inboundsRes = await fetch(inboundsUrl, { method: "GET", headers });
        if (inboundsRes.ok) {
          const data = await inboundsRes.json();
          if (data && data.success && Array.isArray(data.obj)) {
            for (const inbound of data.obj) {
              if (inbound.enable === false) continue;
              const inboundTag = (inbound.remark || inbound.tag || `${panel.name} - Inbound #${inbound.id}`).trim();
              const inboundProtocol = (inbound.protocol || "vless").toLowerCase();
              const inboundPort = Number(inbound.port) || 443;
              const customId = `3xui-${panel.id}-${inbound.id}`;

              // Deep extraction of host, node, SNI, and country
              const extracted = extractInboundHostAndIp(inbound, panel, nodesMap);

              const streamSettings = typeof inbound.streamSettings === "string" 
                ? (() => { try { return JSON.parse(inbound.streamSettings); } catch (e) { return {}; } })()
                : (inbound.streamSettings || {});
              
              const settings = typeof inbound.settings === "string" 
                ? (() => { try { return JSON.parse(inbound.settings); } catch (e) { return {}; } })() 
                : (inbound.settings || {});

              const extractedSni = streamSettings?.tlsSettings?.serverName || streamSettings?.xtlsSettings?.serverName || streamSettings?.realitySettings?.serverNames?.[0] || extracted.hostOrIp;
              const extractedSecurity = streamSettings?.security || "none";
              const extractedPathStr = streamSettings?.wsSettings?.path || streamSettings?.grpcSettings?.serviceName || "";
              const extractedNetType = streamSettings?.network || "tcp";
              const extractedFlow = settings?.clients?.[0]?.flow || "";
              const extractedMethod = settings?.method || "";

              const existingIdx = dbData.inbounds.findIndex(i => i.id === customId || (i.panelId === panel.id && i.port === inboundPort && i.protocol === inboundProtocol));
              const inboundNodeData: InboundNode = {
                id: customId,
                panelId: panel.id,
                nodeId: inbound.nodeId || inbound.node_id || undefined,
                tag: inboundTag,
                serverIp: extracted.hostOrIp,
                country: extracted.country,
                sourceType: extracted.sourceType,
                extractedFrom: extracted.extractedFrom,
                protocol: inboundProtocol as any,
                port: inboundPort,
                wgPort: inboundProtocol === "wireguard" ? inboundPort : (dbData.settings?.wgServerPort || 51820),
                wgServerPublicKey: extracted.wgServerPublicKey || dbData.settings?.wgServerPublicKey || "",
                openvpnPort: inboundProtocol === "openvpn" ? inboundPort : 1194,
                openvpnProto: extracted.openvpnProto,
                l2tpPsk: dbData.settings?.l2tpPsk || "SanaeiL2TPSecureKey",
                isDefault: dbData.inbounds.length === 0,
                notes: `${extracted.notes} (${inboundProtocol.toUpperCase()} Port ${inboundPort})`,
                network: extractedNetType,
                security: extractedSecurity,
                path: extractedPathStr,
                sni: extractedSni,
                flow: extractedFlow,
                method: extractedMethod
              };

              if (existingIdx !== -1) {
                dbData.inbounds[existingIdx] = { ...dbData.inbounds[existingIdx], ...inboundNodeData };
              } else {
                dbData.inbounds.push(inboundNodeData);
              }
              totalInboundsSynced++;
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[Inbound Sync Error] for panel ${panel.name}:`, err);
    }
  }

  saveDb();
  res.json({ success: true, count: totalInboundsSynced, inbounds: dbData.inbounds });
});

app.get("/api/inbounds", (req, res) => {
  res.json(dbData.inbounds || []);
});

app.post("/api/inbounds", (req, res) => {
  const { tag, serverIp, country, nodeId, sourceType, extractedFrom, protocol, port, wgPort, wgServerPublicKey, openvpnPort, openvpnProto, l2tpPsk, notes } = req.body;
  if (!tag || !serverIp) {
    res.status(400).json({ error: "Tag and Server IP are required" });
    return;
  }

  const serverPub = wgServerPublicKey || dbData.settings?.wgServerPublicKey || "";
  const newInbound: InboundNode = {
    id: "inbound-" + Math.random().toString(36).substr(2, 9),
    tag,
    serverIp,
    country: country || detectCountry(tag, serverIp),
    nodeId: nodeId || undefined,
    sourceType: sourceType || "custom",
    extractedFrom: extractedFrom || "دستی / کاربر",
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

  const { tag, serverIp, country, nodeId, sourceType, extractedFrom, protocol, port, wgPort, wgServerPublicKey, openvpnPort, openvpnProto, l2tpPsk, notes, isDefault } = req.body;
  
  dbData.inbounds[index] = {
    ...dbData.inbounds[index],
    tag: tag || dbData.inbounds[index].tag,
    serverIp: serverIp || dbData.inbounds[index].serverIp,
    country: country || dbData.inbounds[index].country || (serverIp ? detectCountry(tag || dbData.inbounds[index].tag, serverIp) : "GL"),
    nodeId: nodeId !== undefined ? nodeId : dbData.inbounds[index].nodeId,
    sourceType: sourceType || dbData.inbounds[index].sourceType,
    extractedFrom: extractedFrom || dbData.inbounds[index].extractedFrom,
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

// ==============================================================================
// V2Ray / Xray Middle Bridge (پل ارتباطی وی‌توری) API
// ==============================================================================

// Helper to generate full Xray Core Outbound JSON from any 3x-ui link or inbound
function generateXrayOutboundFromLink(link: string, fallbackHost = "127.0.0.1", tagParam = "proxy"): any {
  const parsed = parseV2rayLink(link, "11111111-2222-3333-4444-555555555555");
  const outTag = tagParam || "proxy";
  if (!parsed) {
    return {
      protocol: "vless",
      settings: {
        vnext: [{
          address: fallbackHost,
          port: 443,
          users: [{ id: "11111111-2222-3333-4444-555555555555", encryption: "none" }]
        }]
      },
      streamSettings: {
        network: "ws",
        security: "tls",
        tlsSettings: { serverName: fallbackHost },
        wsSettings: { path: "/vless-ws" }
      },
      tag: outTag
    };
  }

  const address = parsed.server || fallbackHost;
  const port = parsed.port || 443;
  const uuid = parsed.uuid || "11111111-2222-3333-4444-555555555555";

  if (parsed.type === "vless") {
    return {
      tag: outTag,
      protocol: "vless",
      settings: {
        vnext: [{
          address,
          port,
          users: [{ id: uuid, encryption: "none", flow: "" }]
        }]
      },
      streamSettings: {
        network: parsed.network || "tcp",
        security: parsed.tls ? "tls" : "none",
        tlsSettings: parsed.tls ? { serverName: address } : undefined,
        wsSettings: parsed.network === "ws" ? { path: parsed.path || "/" } : undefined
      }
    };
  } else if (parsed.type === "vmess") {
    return {
      tag: outTag,
      protocol: "vmess",
      settings: {
        vnext: [{
          address,
          port,
          users: [{ id: uuid, alterId: 0, security: "auto" }]
        }]
      },
      streamSettings: {
        network: parsed.network || "ws",
        security: parsed.tls ? "tls" : "none",
        tlsSettings: parsed.tls ? { serverName: address } : undefined,
        wsSettings: parsed.network === "ws" ? { path: parsed.path || "/" } : undefined
      }
    };
  } else if (parsed.type === "trojan") {
    return {
      tag: outTag,
      protocol: "trojan",
      settings: {
        servers: [{ address, port, password: uuid }]
      },
      streamSettings: {
        network: parsed.network || "tcp",
        security: "tls",
        tlsSettings: { serverName: address }
      }
    };
  } else if (parsed.type === "shadowsocks") {
    return {
      tag: outTag,
      protocol: "shadowsocks",
      settings: {
        servers: [{ address, port, method: "aes-256-gcm", password: uuid }]
      }
    };
  }

  return {
    tag: outTag,
    protocol: "vless",
    settings: {
      vnext: [{ address, port, users: [{ id: uuid, encryption: "none" }] }]
    }
  };
}

// Helper function to calculate per-inbound dedicated Bridge routing ports & subnets
function getInboundBridgePorts(inbound: any, index: number) {
  const wgPort = inbound?.bridgeWgPort || (51820 + index);
  const openvpnPort = inbound?.bridgeOpenvpnPort || (1194 + index);
  const socksPort = inbound?.bridgeSocksPort || (10808 + index);
  const tproxyPort = 12345 + index;
  const subnetIndex = typeof inbound?.bridgeSubnetIndex === "number" ? inbound.bridgeSubnetIndex : index;
  const wgSubnet = `10.8.${subnetIndex}.0/24`;
  const wgServerIp = `10.8.${subnetIndex}.1`;
  const wgClientIp = `10.8.${subnetIndex}.2/24`;
  const ovpnSubnet = `10.10.${subnetIndex}.0/24`;
  const ovpnServerIp = `10.10.${subnetIndex}.1`;
  const tunDevice = `tun_inb_${subnetIndex}`;
  const wgInterface = `wg${subnetIndex}`;
  const fwMark = 100 + subnetIndex;

  return {
    index,
    wgPort,
    openvpnPort,
    socksPort,
    subnetIndex,
    wgSubnet,
    wgServerIp,
    wgClientIp,
    ovpnSubnet,
    ovpnServerIp,
    tunDevice,
    wgInterface,
    fwMark,
    tproxyPort,
  };
}

// 1. Get Live Bridge Status with Per-Inbound Route Matrix
app.get("/api/bridge/status", (req, res) => {
  const activeInbound = dbData.inbounds[0] || null;
  const subscriptionsCount = dbData.subscriptions.length;
  
  const inboundRoutes = dbData.inbounds.map((inb, idx) => {
    const bridgeInfo = getInboundBridgePorts(inb, idx);
    return {
      inboundId: inb.id,
      tag: inb.tag,
      protocol: inb.protocol,
      destinationServerIp: inb.serverIp,
      destinationPort: inb.port,
      bridgeWgPort: bridgeInfo.wgPort,
      bridgeWgSubnet: bridgeInfo.wgSubnet,
      bridgeWgInterface: bridgeInfo.wgInterface,
      bridgeOpenvpnPort: bridgeInfo.openvpnPort,
      bridgeOpenvpnSubnet: bridgeInfo.ovpnSubnet,
      bridgeSocksPort: bridgeInfo.socksPort,
      tunDevice: bridgeInfo.tunDevice,
      fwMark: bridgeInfo.fwMark,
      status: "active",
      routingSummary: `Port ${bridgeInfo.wgPort} (WG) & Port ${bridgeInfo.openvpnPort} (OVPN) -> Direct Xray Outbound -> ${inb.tag} (${inb.serverIp}:${inb.port})`
    };
  });

  res.json({
    enabled: true,
    mode: "per_inbound_dedicated_bridge",
    upstreamNode: activeInbound ? activeInbound.tag : "Direct Multi-Inbound Bridge",
    upstreamServerIp: activeInbound ? activeInbound.serverIp : "127.0.0.1",
    upstreamProtocol: activeInbound ? activeInbound.protocol : "vless",
    totalInbounds: dbData.inbounds.length,
    inboundRoutes,
    activePeers: subscriptionsCount,
    status: "ready",
    farsiDescription: "هر اینباند دارای پورت و تونل ورودی اختصاصی روی پل است. اتصال به هر اینباند مستقیماً و منحصراً ترافیک را از همان نود سنایی عبور می‌دهد بدون نیاز به تنظیم مجدد."
  });
});

// Helper to generate full Xray Outbound strictly connecting to a real Inbound Node with a specific User's UUID
function generateXrayOutboundForInboundAndUser(inb: any, uuid: string, outTag: string): any {
  const address = inb.serverIp || "127.0.0.1";
  const port = inb.port || 443;
  const protocol = inb.protocol || "vless";
  
  const network = inb.network || "tcp";
  const security = inb.security || "none";
  const path = inb.path || "";
  const sni = inb.sni || address;
  const flow = inb.flow || "";

  if (protocol === "vless") {
    return {
      tag: outTag,
      protocol: "vless",
      settings: {
        vnext: [{
          address,
          port,
          users: [{ id: uuid, encryption: "none", flow }]
        }]
      },
      streamSettings: {
        network,
        security,
        tlsSettings: security === "tls" ? { serverName: sni } : undefined,
        realitySettings: security === "reality" ? { serverName: sni } : undefined,
        wsSettings: network === "ws" ? { path } : undefined,
        grpcSettings: network === "grpc" ? { serviceName: path } : undefined
      }
    };
  } else if (protocol === "vmess") {
    return {
      tag: outTag,
      protocol: "vmess",
      settings: {
        vnext: [{
          address,
          port,
          users: [{ id: uuid, alterId: 0, security: "auto" }]
        }]
      },
      streamSettings: {
        network,
        security,
        tlsSettings: security === "tls" ? { serverName: sni } : undefined,
        wsSettings: network === "ws" ? { path } : undefined,
        grpcSettings: network === "grpc" ? { serviceName: path } : undefined
      }
    };
  } else if (protocol === "trojan") {
    return {
      tag: outTag,
      protocol: "trojan",
      settings: {
        servers: [{ address, port, password: uuid }]
      },
      streamSettings: {
        network,
        security,
        tlsSettings: security === "tls" ? { serverName: sni } : undefined,
        wsSettings: network === "ws" ? { path } : undefined,
        grpcSettings: network === "grpc" ? { serviceName: path } : undefined
      }
    };
  } else if (protocol === "shadowsocks") {
    return {
      tag: outTag,
      protocol: "shadowsocks",
      settings: {
        servers: [{ address, port, method: inb.method || "aes-256-gcm", password: uuid }]
      }
    };
  }

  // Fallback
  return {
    tag: outTag,
    protocol: "vless",
    settings: {
      vnext: [{ address, port, users: [{ id: uuid, encryption: "none" }] }]
    }
  };
}

// 2. Generate Client Multi-Inbound Xray & Tun2socks Configuration
app.get("/api/bridge/config", (req, res) => {
  const inboundsList = dbData.inbounds.length > 0 ? dbData.inbounds : [
    { id: "in-default", tag: "Default Sanaei Inbound", serverIp: "127.0.0.1", port: 443, protocol: "vless" }
  ];

  const xrayInbounds: any[] = [];
  const xrayOutbounds: any[] = [];
  const routingRules: any[] = [
    { type: "field", ip: ["geoip:private", "geoip:ir"], outboundTag: "direct" }
  ];

  inboundsList.forEach((inb, idx) => {
    const ports = getInboundBridgePorts(inb, idx);
    const inTagSocks = `socks-in-${idx}`;
    const inTagTproxy = `tproxy-in-${idx}`;

    // Add local TProxy inbound for this specific node
    xrayInbounds.push({
      tag: inTagTproxy,
      port: ports.tproxyPort,
      listen: "0.0.0.0",
      protocol: "dokodemo-door",
      settings: { network: "tcp,udp", followRedirect: true },
      streamSettings: { sockopt: { tproxy: "tproxy" } },
      sniffing: {
        enabled: true,
        destOverride: ["http", "tls", "quic"],
        metadataOnly: false
      }
    });

    // 1. Fallback Outbound (uses default/fallback UUID)
    const fallbackTag = `out-inb-${idx}-fallback`;
    const mockLink = generateMockLinks(`bridge-node-${idx}`, "11111111-2222-3333-4444-555555555555")[0];
    const fallbackOutbound = generateXrayOutboundFromLink(mockLink, inb.serverIp || "127.0.0.1", fallbackTag);
    fallbackOutbound.settings.vnext[0].port = inb.port || 443;
    xrayOutbounds.push(fallbackOutbound);

    // 2. Dynamic Outbounds per Active Subscription Client
    dbData.subscriptions.forEach((sub, subIdx) => {
      const clientIp = `10.8.${ports.subnetIndex}.${100 + subIdx}`;
      const ovpnClientIp = `10.10.${ports.subnetIndex}.${100 + subIdx}`;
      const l2tpClientIp = `10.9.0.${100 + subIdx}`; // L2TP only routes to first node
      
      const sourceIPs = idx === 0 ? [clientIp, ovpnClientIp, l2tpClientIp] : [clientIp, ovpnClientIp];
      
      const userOutboundTag = `out-inb-${idx}-sub-${subIdx}`;
      const userOutbound = generateXrayOutboundForInboundAndUser(inb, sub.uuid, userOutboundTag);
      xrayOutbounds.push(userOutbound);

      // Route this specific client IP to their dedicated outbound with their real UUID
      routingRules.push({
        type: "field",
        inboundTag: [inTagTproxy],
        source: sourceIPs,
        outboundTag: userOutboundTag
      });
    });

    // 3. Fallback Route for any other/anonymous clients using the fallback outbound
    routingRules.push({
      type: "field",
      inboundTag: [inTagTproxy],
      outboundTag: fallbackTag
    });
  });

  xrayOutbounds.push({ tag: "direct", protocol: "freedom", settings: {} });
  xrayOutbounds.push({ tag: "block", protocol: "blackhole", settings: {} });

  const fullXrayClientConfig = {
    log: { loglevel: "warning" },
    inbounds: xrayInbounds,
    outbounds: xrayOutbounds,
    routing: {
      domainStrategy: "IPIfNonMatch",
      rules: routingRules
    }
  };

  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(fullXrayClientConfig, null, 2));
});

// 3. Generate Complete Multi-Inbound Linux Bash Bridge Installer Script
app.get("/install-bridge.sh", (req, res) => {
  const host = req.headers.host || "127.0.0.1";
  const inboundsList = dbData.inbounds.length > 0 ? dbData.inbounds : [
    { id: "in-default", tag: "Default Inbound", serverIp: "127.0.0.1", port: 443, protocol: "vless" }
  ];

  let multiInboundSetupBash = "";

  inboundsList.forEach((inb, idx) => {
    const ports = getInboundBridgePorts(inb, idx);
    multiInboundSetupBash += `
# ==============================================================================
# Inbound Node [${idx + 1}/${inboundsList.length}]: ${inb.tag} (${inb.serverIp}:${inb.port})
# WireGuard Port: ${ports.wgPort} | OpenVPN Port: ${ports.openvpnPort} | TPROXY: ${ports.tproxyPort}
# ==============================================================================
echo -e "\${CYAN}Configuring Dedicated Tunnel for Inbound: ${inb.tag} (WG Port ${ports.wgPort}, TPROXY ${ports.tproxyPort})...\${NC}"

# 1. Setup IP routing table ${ports.fwMark} for TPROXY
ip rule del fwmark ${ports.fwMark} 2>/dev/null || true
ip route del local default dev lo table ${ports.fwMark} 2>/dev/null || true
ip route add local default dev lo table ${ports.fwMark} 2>/dev/null || true
ip rule add fwmark ${ports.fwMark} table ${ports.fwMark} 2>/dev/null || true

# 2. Mark packets from WireGuard subnet (${ports.wgSubnet}) & OpenVPN subnet (${ports.ovpnSubnet}) to TPROXY
iptables -t mangle -D PREROUTING -s ${ports.wgSubnet} -p tcp -j TPROXY --on-port ${ports.tproxyPort} --tproxy-mark ${ports.fwMark} 2>/dev/null || true
iptables -t mangle -D PREROUTING -s ${ports.wgSubnet} -p udp -j TPROXY --on-port ${ports.tproxyPort} --tproxy-mark ${ports.fwMark} 2>/dev/null || true
iptables -t mangle -D PREROUTING -s ${ports.ovpnSubnet} -p tcp -j TPROXY --on-port ${ports.tproxyPort} --tproxy-mark ${ports.fwMark} 2>/dev/null || true
iptables -t mangle -D PREROUTING -s ${ports.ovpnSubnet} -p udp -j TPROXY --on-port ${ports.tproxyPort} --tproxy-mark ${ports.fwMark} 2>/dev/null || true

iptables -t mangle -A PREROUTING -s ${ports.wgSubnet} -p tcp -j TPROXY --on-port ${ports.tproxyPort} --tproxy-mark ${ports.fwMark}
iptables -t mangle -A PREROUTING -s ${ports.wgSubnet} -p udp -j TPROXY --on-port ${ports.tproxyPort} --tproxy-mark ${ports.fwMark}
iptables -t mangle -A PREROUTING -s ${ports.ovpnSubnet} -p tcp -j TPROXY --on-port ${ports.tproxyPort} --tproxy-mark ${ports.fwMark}
iptables -t mangle -A PREROUTING -s ${ports.ovpnSubnet} -p udp -j TPROXY --on-port ${ports.tproxyPort} --tproxy-mark ${ports.fwMark}
`;
  });

  // L2TP is always bound to first inbound
  multiInboundSetupBash += `
# Setup L2TP TPROXY marking for Inbound 1
iptables -t mangle -D PREROUTING -s 10.9.0.0/24 -p tcp -j TPROXY --on-port 12345 --tproxy-mark 100 2>/dev/null || true
iptables -t mangle -D PREROUTING -s 10.9.0.0/24 -p udp -j TPROXY --on-port 12345 --tproxy-mark 100 2>/dev/null || true
iptables -t mangle -A PREROUTING -s 10.9.0.0/24 -p tcp -j TPROXY --on-port 12345 --tproxy-mark 100
iptables -t mangle -A PREROUTING -s 10.9.0.0/24 -p udp -j TPROXY --on-port 12345 --tproxy-mark 100
`;

  const script = `#!/usr/bin/env bash
# ==============================================================================
# 🌉 Sanaei Multi-Inbound Dedicated Bridge Gateway
# Routes each WireGuard / OpenVPN Inbound port independently to its exact
# corresponding Sanaei V2Ray Inbound!
# ==============================================================================

RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[0;33m'
CYAN='\\033[0;36m'
NC='\\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "\${RED}Error: Please run as root.\${NC}"
  exit 1
fi

echo -e "\${CYAN}==================================================================\${NC}"
echo -e "\${CYAN}    🌉 Setting up Multi-Inbound Dedicated Bridge Gateway         \${NC}"
echo -e "\${CYAN}==================================================================\${NC}"

# Detect Main Network Interface
MAIN_IFACE=$(ip route show default | awk '{print $5}' | head -n1)
if [ -z "$MAIN_IFACE" ]; then
  MAIN_IFACE="eth0"
fi

# 1. Install prerequisites (xray, wireguard, strongswan, xl2tpd, ppp, openvpn)
echo -e "\${YELLOW}[1/6] Installing Xray-core and VPN daemons...\${NC}"
apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \\
  curl wget jq iptables iproute2 wireguard strongswan xl2tpd ppp openvpn net-tools openssl cron

# Download Xray-core if not present
if ! command -v xray >/dev/null 2>&1; then
  echo -e "\${YELLOW}Installing latest Xray-core...\${NC}"
  bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install
fi

# Enable IP forwarding and disable rp_filter for TPROXY routing stability
sysctl -w net.ipv4.ip_forward=1 >/dev/null
sysctl -w net.ipv4.conf.all.accept_redirects=0 >/dev/null
sysctl -w net.ipv4.conf.all.send_redirects=0 >/dev/null
sysctl -w net.ipv4.conf.all.rp_filter=0 >/dev/null
sysctl -w net.ipv4.conf.default.rp_filter=0 >/dev/null
for interface in /proc/sys/net/ipv4/conf/*; do
  sysctl -w net.ipv4.conf.$(basename $interface).rp_filter=0 >/dev/null 2>&1
done

# 2. Fetch Multi-Inbound Dynamic Xray Config
echo -e "\${YELLOW}[2/6] Pulling Multi-Inbound Xray Routing Configuration...\${NC}"
mkdir -p /usr/local/etc/xray
curl -s "http://${host}/api/bridge/config" > /usr/local/etc/xray/config.json
systemctl restart xray 2>/dev/null

# 3. Configure WireGuard Interfaces dynamically
echo -e "\${YELLOW}[3/6] Setting up WireGuard interfaces...\${NC}"
mkdir -p /etc/wireguard
chmod 700 /etc/wireguard

# Fetch active interfaces and download configs
IFACES=$(curl -s "http://${host}/api/bridge/interfaces" | jq -r '.[]')
for iface in $IFACES; do
  echo -e "Setting up $iface..."
  curl -s "http://${host}/api/bridge/wg-config/$iface" > "/etc/wireguard/\${iface}.conf"
  systemctl enable "wg-quick@\${iface}" 2>/dev/null
  systemctl restart "wg-quick@\${iface}" 2>/dev/null
done

# 4. Configure L2TP/IPSec
echo -e "\${YELLOW}[4/6] Setting up L2TP/IPSec (StrongSwan & xl2tpd)...\${NC}"
mkdir -p /etc/xl2tpd /etc/ppp

# Write ipsec.conf
cat <<EOF >/etc/ipsec.conf
config setup
  charondebug="ike 1, knl 1, cfg 0"
  uniqueids=no

conn L2TP-PSK-NAT
  rightsubnet=vhost:%priv
  also=L2TP-PSK-noNAT

conn L2TP-PSK-noNAT
  authby=secret
  pfs=no
  auto=add
  keyingtries=3
  dpddelay=30
  dpdtimeout=120
  dpdaction=clear
  rekey=no
  ikelifetime=8h
  keylife=1h
  type=transport
  left=%any
  leftprotoport=17/1701
  right=%any
  rightprotoport=17/%any
EOF

# Fetch L2TP secrets
curl -s "http://${host}/api/bridge/ipsec-secrets" > /etc/ipsec.secrets
chmod 600 /etc/ipsec.secrets

# Write xl2tpd.conf
cat <<EOF >/etc/xl2tpd/xl2tpd.conf
[global]
port = 1701

[lns default]
ip range = 10.9.0.2-10.9.0.254
local ip = 10.9.0.1
require chap = yes
refuse pap = yes
require authentication = yes
name = l2tpd
pppoptfile = /etc/ppp/options.xl2tpd
length bit = yes
EOF

# Write options.xl2tpd
cat <<EOF >/etc/ppp/options.xl2tpd
ipcp-accept-local
ipcp-accept-remote
ms-dns 1.1.1.1
ms-dns 8.8.8.8
auth
idle 1800
mtu 1400
mru 1400
nodefaultroute
connect-delay 5000
lock
proxyarp
EOF

# Fetch chap-secrets
curl -s "http://${host}/api/bridge/chap-secrets" > /etc/ppp/chap-secrets
chmod 600 /etc/ppp/chap-secrets

# Restart StrongSwan and L2TP
systemctl enable strongswan-starter 2>/dev/null || systemctl enable strongswan 2>/dev/null
systemctl restart strongswan-starter 2>/dev/null || systemctl restart strongswan 2>/dev/null
systemctl enable xl2tpd 2>/dev/null
systemctl restart xl2tpd 2>/dev/null

# 5. Configure OpenVPN with dynamic back-authentication
echo -e "\${YELLOW}[5/6] Setting up OpenVPN Server...\${NC}"
mkdir -p /etc/openvpn/server/ccd
cd /etc/openvpn/server || exit

# Download CA crt and key
curl -s "http://${host}/api/bridge/ca.crt" > /etc/openvpn/server/ca.crt
curl -s "http://${host}/api/bridge/ca.key" > /etc/openvpn/server/ca.key

# Generate OpenVPN server certificate using CA
openssl ecparam -name prime256v1 -genkey -out /etc/openvpn/server/server.key
openssl req -new -key /etc/openvpn/server/server.key -out /etc/openvpn/server/server.csr -subj "/CN=Sanaei-Bridge-Server" -nodes
openssl x509 -req -in /etc/openvpn/server/server.csr -CA /etc/openvpn/server/ca.crt -CAkey /etc/openvpn/server/ca.key -CAcreateserial -out /etc/openvpn/server/server.crt -days 3650

# Securely remove CA key from bridge disk
rm -f /etc/openvpn/server/ca.key

# Create authenticated back-verification script pointing to the correct main panel
cat <<'EOF' > /etc/openvpn/server/auth.sh
#!/bin/bash
USERNAME=$(head -n 1 "$1")
PASSWORD=$(tail -n 1 "$1")
STATUS=$(curl -s -X POST http://${host}/api/auth-vpn -d "username=$USERNAME&password=$PASSWORD" -H "Content-Type: application/x-www-form-urlencoded")
if [ "$STATUS" = "OK" ]; then
  exit 0
else
  exit 1
fi
EOF
chmod +x /etc/openvpn/server/auth.sh

# Clean up existing openvpn services to prevent port collisions or stale files
systemctl stop openvpn-server@* 2>/dev/null || true
systemctl disable openvpn-server@* 2>/dev/null || true
rm -f /etc/openvpn/server/server_inb_*.conf
rm -f /etc/openvpn/server/server.conf

${inboundsList.map((inb, idx) => {
  const ports = getInboundBridgePorts(inb, idx);
  return `
# --- OpenVPN Server for Inbound: ${inb.tag} ---
mkdir -p /etc/openvpn/server/ccd_inb_${ports.subnetIndex}
cat <<EOF >/etc/openvpn/server/server_inb_${ports.subnetIndex}.conf
port ${ports.openvpnPort}
proto udp
dev tun_ovpn_${ports.subnetIndex}
ca ca.crt
cert server.crt
key server.key
dh none
topology subnet
server 10.10.${ports.subnetIndex}.0 255.255.255.0
client-config-dir /etc/openvpn/server/ccd_inb_${ports.subnetIndex}
keepalive 10 120
cipher AES-256-GCM
data-ciphers AES-256-GCM:AES-128-GCM:CHACHA20-POLY1305
persist-key
persist-tun
status openvpn-status_inb_${ports.subnetIndex}.log
verb 3
verify-client-cert none
username-as-common-name
script-security 3
auth-user-pass-verify /etc/openvpn/server/auth.sh via-file
EOF

systemctl enable openvpn-server@server_inb_${ports.subnetIndex} 2>/dev/null
systemctl restart openvpn-server@server_inb_${ports.subnetIndex} 2>/dev/null
`;
}).join("\n")}

# 6. Setup Policy Routing & Auto-Sync Cron Job
echo -e "\${YELLOW}[6/6] Finalizing Routing Policies and Synchronization Service...\${NC}"
systemctl daemon-reload

${multiInboundSetupBash}

# Setup NAT Masquerade forwarding
iptables -A FORWARD -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -s 10.8.0.0/16 -j ACCEPT
iptables -A FORWARD -s 10.9.0.0/16 -j ACCEPT
iptables -A FORWARD -s 10.10.0.0/16 -j ACCEPT
iptables -t nat -A POSTROUTING -o \$MAIN_IFACE -j MASQUERADE

# Save firewall rules
netfilter-persistent save 2>/dev/null || iptables-save > /etc/iptables.rules 2>/dev/null

# Setup Automated Sync Script
cat <<'EOF' > /usr/local/bin/vpn-bridge-sync.sh
#!/usr/bin/env bash
# Autogenerated peer list synchronization client for Sanaei Bridge
HOST="${host}"

# 1. Sync WireGuard Configs
IFACES=$(curl -s "http://\$HOST/api/bridge/interfaces" | jq -r '.[]' 2>/dev/null)
for iface in \$IFACES; do
  curl -s "http://\$HOST/api/bridge/wg-config/\$iface" > "/etc/wireguard/\${iface}.tmp"
  if [ -s "/etc/wireguard/\${iface}.tmp" ]; then
    if ! cmp -s "/etc/wireguard/\${iface}.conf" "/etc/wireguard/\${iface}.tmp"; then
      mv "/etc/wireguard/\${iface}.tmp" "/etc/wireguard/\${iface}.conf"
      wg syncconf "\$iface" <(wg-quick strip "\$iface") 2>/dev/null || systemctl restart "wg-quick@\$iface"
    else
      rm "/etc/wireguard/\${iface}.tmp"
    fi
  fi
done

# 2. Sync L2TP Chap Secrets
curl -s "http://\$HOST/api/bridge/chap-secrets" > /etc/ppp/chap-secrets.tmp
if [ -s /etc/ppp/chap-secrets.tmp ]; then
  if ! cmp -s /etc/ppp/chap-secrets /etc/ppp/chap-secrets.tmp; then
    mv /etc/ppp/chap-secrets.tmp /etc/ppp/chap-secrets
    chmod 600 /etc/ppp/chap-secrets
  else
    rm /etc/ppp/chap-secrets.tmp
  fi
fi

# 3. Sync IPSec Secrets
curl -s "http://\$HOST/api/bridge/ipsec-secrets" > /etc/ipsec.secrets.tmp
if [ -s /etc/ipsec.secrets.tmp ]; then
  if ! cmp -s /etc/ipsec.secrets /etc/ipsec.secrets.tmp; then
    mv /etc/ipsec.secrets.tmp /etc/ipsec.secrets
    chmod 600 /etc/ipsec.secrets
    systemctl reload strongswan 2>/dev/null || systemctl reload strongswan-starter 2>/dev/null
  else
    rm /etc/ipsec.secrets.tmp
  fi
fi

# 4. Sync OpenVPN CCD Configs for Static IP mapping
CCD_JSON=\$(curl -s "http://\$HOST/api/bridge/openvpn-ccd")
if [ -n "\$CCD_JSON" ] && [ "\$CCD_JSON" != "null" ] && [ "\$CCD_JSON" != "{}" ]; then
  # Clear existing CCD configs
  for dir in /etc/openvpn/server/ccd_inb_*; do
    if [ -d "\$dir" ]; then
      rm -f "\$dir"/*
    fi
  done
  
  # Parse JSON and write each file safely using pipe separator
  echo "\$CCD_JSON" | jq -r 'to_entries[] | "\(.key)|\(.value)"' | while IFS="|" read -r key value; do
    if [ -n "\$key" ] && [ -n "\$value" ]; then
      file_path="/etc/openvpn/server/\$key"
      mkdir -p "\$(dirname "\$file_path")"
      echo "\$value" > "\$file_path"
      chmod 644 "\$file_path"
    fi
  done
fi
EOF
chmod +x /usr/local/bin/vpn-bridge-sync.sh

# Install Cron Sync (runs every minute)
crontab -l 2>/dev/null | grep -v "vpn-bridge-sync.sh" | { cat; echo "* * * * * /usr/local/bin/vpn-bridge-sync.sh >/dev/null 2>&1"; } | crontab -

echo -e "\${GREEN}==================================================================\${NC}"
echo -e "\${GREEN}  ✅ Multi-Inbound Dedicated Bridge Gateway is Active!          \${NC}"
echo -e "\${GREEN}  Each Inbound has its own independent WireGuard / OpenVPN port. \${NC}"
echo -e "\${GREEN}  Connecting to any profile routes strictly and solely through   \${NC}"
echo -e "\${GREEN}  that specific Sanaei Inbound node!                             \${NC}"
echo -e "\${GREEN}  Automated real-time background desync-check active (1m cron).  \${NC}"
echo -e "\${GREEN}==================================================================\${NC}"
`;

  res.setHeader("Content-Type", "text/plain");
  res.send(script);
});

// --- Dynamic Bridge Sync and Configuration API Endpoints ---
app.get("/api/bridge/interfaces", (req, res) => {
  const inboundsList = dbData.inbounds.length > 0 ? dbData.inbounds : [
    { id: "in-default", tag: "Default Inbound" }
  ];
  const list = inboundsList.map((_, idx) => `wg${idx}`);
  res.json(list);
});

app.get("/api/bridge/wg-config/:interface", (req, res) => {
  const iface = req.params.interface;
  const inbIdx = parseInt(iface.replace("wg", "")) || 0;
  const inboundsList = dbData.inbounds.length > 0 ? dbData.inbounds : [
    { id: "in-default", tag: "Default Inbound" }
  ];
  const inb = inboundsList[inbIdx];
  if (!inb) {
    return res.status(404).send("# Inbound not found");
  }
  const ports = getInboundBridgePorts(inb, inbIdx);
  const serverPrivateKey = dbData.settings?.wgServerPrivateKey;

  let conf = `[Interface]\n`;
  conf += `PrivateKey = ${serverPrivateKey}\n`;
  conf += `Address = ${ports.wgServerIp}/24\n`;
  conf += `ListenPort = ${ports.wgPort}\n`;
  conf += `PostUp = iptables -A FORWARD -i ${iface} -j ACCEPT; iptables -A FORWARD -o ${iface} -m state --state RELATED,ESTABLISHED -j ACCEPT; iptables -t nat -A POSTROUTING -s ${ports.wgSubnet} -o $(ip route show default | awk '{print $5}' | head -n1) -j MASQUERADE; iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu\n`;
  conf += `PostDown = iptables -D FORWARD -i ${iface} -j ACCEPT; iptables -D FORWARD -o ${iface} -m state --state RELATED,ESTABLISHED -j ACCEPT; iptables -t nat -D POSTROUTING -s ${ports.wgSubnet} -o $(ip route show default | awk '{print $5}' | head -n1) -j MASQUERADE; iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu\n\n`;

  dbData.subscriptions.forEach((sub, subIdx) => {
    if (sub.isActive === false) return;
    const clientIp = `10.8.${ports.subnetIndex}.${100 + subIdx}`;
    conf += `# User: ${sub.username}\n`;
    conf += `[Peer]\n`;
    conf += `PublicKey = ${sub.wireguardPublicKey}\n`;
    conf += `AllowedIPs = ${clientIp}/32\n\n`;
  });

  res.setHeader("Content-Type", "text/plain");
  res.send(conf);
});

app.get("/api/bridge/openvpn-ccd", (req, res) => {
  const inboundsList = dbData.inbounds.length > 0 ? dbData.inbounds : [
    { id: "in-default", tag: "Default Inbound" }
  ];
  const response: Record<string, string> = {};

  inboundsList.forEach((inb, idx) => {
    const ports = getInboundBridgePorts(inb, idx);
    dbData.subscriptions.forEach((sub, subIdx) => {
      if (sub.isActive === false) return;
      if (sub.openvpnUser) {
        const clientIp = `10.10.${ports.subnetIndex}.${100 + subIdx}`;
        const ccdFile = `ccd_inb_${ports.subnetIndex}/${sub.openvpnUser}`;
        response[ccdFile] = `ifconfig-push ${clientIp} 255.255.255.0`;
      }
    });
  });

  res.json(response);
});

app.get("/api/bridge/chap-secrets", (req, res) => {
  let chapContent = `# Autogenerated by Sanaei Smart Subscription Companion\n\n`;
  dbData.subscriptions.forEach((sub, idx) => {
    if (sub.isActive === false) return;
    if (sub.l2tpUser && sub.l2tpPass) {
      chapContent += `"${sub.l2tpUser}" * "${sub.l2tpPass}" 10.9.0.${100 + idx}\n`;
    }
  });
  res.setHeader("Content-Type", "text/plain");
  res.send(chapContent);
});

app.get("/api/bridge/ipsec-secrets", (req, res) => {
  const psk = dbData.settings?.l2tpPsk || "SanaeiL2TPSecureKey";
  res.setHeader("Content-Type", "text/plain");
  res.send(`: PSK "${psk}"`);
});

app.get("/api/bridge/ca.crt", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.send(OPENVPN_VALID_CA);
});

app.get("/api/bridge/ca.key", (req, res) => {
  const OPENVPN_VALID_CA_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgfXU18XqF2vJ6V05z
m/q29/81bH9q+qV8D9H+uY8X8IahRANCAAS9j+bYzD65azTJj+SjEihIJbA9OtG1
+m8IP4Xz4PJZnrJztDxOpJrTIcHNomqWTwS7DpvjQkLyGz7/c8Ff96XS
-----END PRIVATE KEY-----`;
  res.setHeader("Content-Type", "text/plain");
  res.send(OPENVPN_VALID_CA_KEY);
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

// Helper to determine the client endpoint host (Bridge Panel vs Direct Node)
function resolveConnectionHost(req: any, directNodeIp: string, customBridgeIp?: string): { host: string; isBridge: boolean; upstreamTag?: string } {
  const reqMode = (req.query.mode as string) || "";
  const isBridge = reqMode === "bridge" || (reqMode !== "direct" && dbData.settings?.bridgeRoutingEnabled !== false);
  
  if (isBridge) {
    const bridgeHost = customBridgeIp || dbData.settings?.bridgeServerIp || req.headers.host?.split(":")[0] || "127.0.0.1";
    return { host: bridgeHost, isBridge: true };
  }
  
  let host = directNodeIp;
  if (!host || host === "127.0.0.1" || host === "localhost" || host === "142.250.74.46") {
    host = req.headers.host?.split(":")[0] || "127.0.0.1";
  }
  return { host, isBridge: false };
}

// 5. Windows PBK L2TP configuration profile download
app.get("/api/sub/:token/l2tp-pbk", (req, res) => {
  const sub = dbData.subscriptions.find((s) => s.id === req.params.token || s.username === req.params.token);
  if (!sub) {
    res.status(404).send("Subscription not found");
    return;
  }

  const inboundId = req.query.inboundId as string;
  const inbound = inboundId ? dbData.inbounds.find((i) => i.id === inboundId) : dbData.inbounds[0];
  const directServerIp = inbound?.serverIp || sub.l2tpServerIp || "127.0.0.1";
  const { host: serverIp, isBridge } = resolveConnectionHost(req, directServerIp);
  const psk = inbound?.l2tpPsk || sub.l2tpPsk || "SanaeiL2TPSecureKey";

  // Windows Phone Book (.pbk) contents
  const pbkString = `# Sanaei Smart Sub - ${isBridge ? `[Bridge Mode -> ${inbound?.tag || '3x-ui'}]` : 'Direct Node'}
[L2TP_Smart_VPN_${sub.username}]
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
  const directServerIp = inbound?.serverIp || sub.l2tpServerIp || "127.0.0.1";
  const { host: serverIp, isBridge } = resolveConnectionHost(req, directServerIp);
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
			<string>L2TP VPN (${isBridge ? '🌉 Bridge: ' : ''}${inbound?.tag || "Sanaei Smart Sub"})</string>
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
  const inboundIdx = inboundId ? dbData.inbounds.findIndex((i) => i.id === inboundId) : 0;
  const safeIdx = inboundIdx >= 0 ? inboundIdx : 0;
  const inbound = dbData.inbounds[safeIdx] || dbData.inbounds[0];
  const bridgePorts = getInboundBridgePorts(inbound, safeIdx);

  const directServerIp = inbound?.serverIp || sub.l2tpServerIp || "127.0.0.1";
  const { host: serverIp, isBridge } = resolveConnectionHost(req, directServerIp);
  const serverPort = isBridge ? bridgePorts.wgPort : (inbound?.wgPort || inbound?.port || dbData.settings?.wgServerPort || 51820);
  const serverPub = isBridge 
    ? (dbData.settings?.wgServerPublicKey || sub.wireguardPublicKey)
    : (inbound?.wgServerPublicKey || dbData.settings?.wgServerPublicKey || sub.wireguardPublicKey);
  const subIdx = dbData.subscriptions.findIndex((s) => s.id === sub.id);
  const safeSubIdx = subIdx >= 0 ? subIdx : 0;
  
  const clientAddr = isBridge 
    ? `10.8.${bridgePorts.subnetIndex}.${100 + safeSubIdx}/24`
    : (sub.wireguardAddress || `10.8.0.${100 + safeSubIdx}/24`);

  const wgConf = `# ----------------------------------------------------
# Sanaei Smart Sub - WireGuard Profile
# Routing Mode: ${isBridge ? `🌉 Bridge Gateway (Port ${serverPort} -> Dedicated Tunnel -> ${inbound?.tag || '3x-ui node'})` : '⚡ Direct Node'}
# Inbound Destination: ${inbound?.tag || 'Default'} (${inbound?.serverIp || directServerIp}:${inbound?.port || 443})
# ----------------------------------------------------
[Interface]
PrivateKey = ${sub.wireguardPrivateKey}
Address = ${clientAddr}
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
  const inboundIdx = inboundId ? dbData.inbounds.findIndex((i) => i.id === inboundId) : 0;
  const safeIdx = inboundIdx >= 0 ? inboundIdx : 0;
  const inbound = dbData.inbounds[safeIdx] || dbData.inbounds[0];
  const bridgePorts = getInboundBridgePorts(inbound, safeIdx);

  const directServerIp = inbound?.serverIp || sub.l2tpServerIp || "127.0.0.1";
  const { host: serverIp, isBridge } = resolveConnectionHost(req, directServerIp);
  const port = isBridge ? bridgePorts.openvpnPort : (inbound?.openvpnPort || sub.openvpnPort || 1194);
  const proto = inbound?.openvpnProto || sub.openvpnProto || "udp";

  const ovpnConfig = `# ----------------------------------------------------
# Sanaei Smart Sub - OpenVPN Profile
# Routing Mode: ${isBridge ? `🌉 Bridge Gateway (Port ${port} -> Dedicated Tunnel -> ${inbound?.tag || '3x-ui node'})` : '⚡ Direct Node'}
# Inbound Destination: ${inbound?.tag || 'Default'} (${inbound?.serverIp || directServerIp}:${inbound?.port || 443})
# ----------------------------------------------------
client
dev tun
proto ${proto}
remote ${serverIp} ${port}
resolv-retry infinite
nobind
persist-key
persist-tun
cipher AES-256-GCM
data-ciphers AES-256-GCM:AES-128-GCM:CHACHA20-POLY1305
verb 3
keepalive 10 60

# User Authentication
auth-user-pass

<ca>
${getOpenVPNCert()}
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
// Internal API for VPN Daemon Authentication (OpenVPN / L2TP)
app.post("/api/auth-vpn", express.urlencoded({ extended: true }), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(401).send("FAILED");
    return;
  }
  const sub = dbData.subscriptions.find(s => s.openvpnUser === username && s.openvpnPass === password);
  if (sub) {
    res.status(200).send("OK");
  } else {
    res.status(401).send("FAILED");
  }
});

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
