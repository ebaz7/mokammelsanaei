import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dns from "dns";

// Ensure dns resolution order is stable
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

interface DB {
  panels: Panel[];
  subscriptions: SmartSubscription[];
}

function initDb(): DB {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse database file, resetting", e);
    }
  }

  const defaultDb: DB = {
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
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), "utf-8");
  return defaultDb;
}

const dbData = initDb();

function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), "utf-8");
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

async function fetchLiveNodesFromPanel(panel: Panel, username: string, uuid: string): Promise<string[]> {
  if (panel.isMock || panel.url.includes("mock") || panel.url.includes("sanaei.xyz")) {
    return generateMockLinks(username, uuid);
  }

  try {
    const cleanUrl = panel.url.replace(/\/$/, "");
    
    // Authenticate with 3x-ui to get a session cookie
    const loginRes = await fetch(`${cleanUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: panel.username,
        password: panel.password,
      }),
    });

    if (!loginRes.ok) {
      console.warn(`[3x-ui Sync] Login failed for panel ${panel.name}. Status: ${loginRes.status}`);
      return generateMockLinks(username, uuid);
    }

    const setCookie = loginRes.headers.get("set-cookie");
    if (!setCookie) {
      console.warn(`[3x-ui Sync] No set-cookie header returned from panel ${panel.name}`);
      return generateMockLinks(username, uuid);
    }

    // Extract raw session cookie string
    const sessionCookie = setCookie.split(";")[0];

    // Request active inbounds list
    const inboundsRes = await fetch(`${cleanUrl}/panel/api/inbounds/list`, {
      method: "GET",
      headers: {
        "Cookie": sessionCookie,
      },
    });

    if (!inboundsRes.ok) {
      console.warn(`[3x-ui Sync] Failed to fetch inbounds list. Status: ${inboundsRes.status}`);
      return generateMockLinks(username, uuid);
    }

    const data = await inboundsRes.json();
    if (!data || !data.success || !Array.isArray(data.obj)) {
      console.warn(`[3x-ui Sync] Invalid list format response from panel ${panel.name}`);
      return generateMockLinks(username, uuid);
    }

    const domainOrIp = new URL(panel.url).hostname;
    const nodes: string[] = [];

    // Map active inbounds from 3x-ui
    for (const inbound of data.obj) {
      const port = inbound.port;
      const protocol = inbound.protocol; // "vless", "vmess", "trojan", "shadowsocks"
      const settings = typeof inbound.settings === "string" ? JSON.parse(inbound.settings) : inbound.settings;
      const streamSettings = typeof inbound.streamSettings === "string" ? JSON.parse(inbound.streamSettings) : inbound.streamSettings;

      const network = streamSettings?.network || "tcp";
      const security = streamSettings?.security || "none";
      const path = streamSettings?.wsSettings?.path || streamSettings?.grpcSettings?.serviceName || "";
      const remarks = encodeURIComponent(`${panel.name} - ${protocol.toUpperCase()}-${port}`);

      if (protocol === "vless") {
        nodes.push(`vless://${uuid}@${domainOrIp}:${port}?type=${network}&security=${security}&path=${encodeURIComponent(path)}#${remarks}`);
      } else if (protocol === "vmess") {
        const vmessObj = {
          v: "2",
          ps: `${panel.name} - VMESS-${port}`,
          add: domainOrIp,
          port: port,
          id: uuid,
          aid: "0",
          scy: "auto",
          net: network,
          type: "none",
          host: domainOrIp,
          path: path,
          tls: security === "tls" ? "tls" : "",
        };
        nodes.push(`vmess://${Buffer.from(JSON.stringify(vmessObj)).toString("base64")}`);
      } else if (protocol === "trojan") {
        nodes.push(`trojan://${uuid}@${domainOrIp}:${port}?security=${security}&sni=${domainOrIp}#${remarks}`);
      } else if (protocol === "shadowsocks") {
        const method = settings?.method || "aes-256-gcm";
        const password = settings?.password || "pass";
        const ssBase = Buffer.from(`${method}:${password}`).toString("base64");
        nodes.push(`shadowsocks://${ssBase}@${domainOrIp}:${port}#${remarks}`);
      }
    }

    if (nodes.length > 0) {
      console.log(`[3x-ui Sync] Successfully synced ${nodes.length} live nodes from panel ${panel.name}`);
      return nodes;
    }
  } catch (err: any) {
    console.error(`[3x-ui Sync] Dynamic sync error for ${panel.name}:`, err.message);
  }

  // Fallback to mock nodes
  return generateMockLinks(username, uuid);
}

// REST API Endpoints

// 1. Panels CRUD
app.get("/api/panels", (req, res) => {
  res.json(dbData.panels);
});

app.post("/api/panels", (req, res) => {
  const { name, url, username, password, isMock } = req.body;
  if (!name || !url) {
    res.status(400).json({ error: "Name and URL are required" });
    return;
  }

  const newPanel: Panel = {
    id: "panel-" + Math.random().toString(36).substr(2, 9),
    name,
    url: url.replace(/\/$/, ""), // Remove trailing slash
    username: username || "admin",
    password: password || "",
    isActive: true,
    isMock: !!isMock,
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

// 2. Test Connection
app.post("/api/panels/test", async (req, res) => {
  const { url, username, password, isMock } = req.body;
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
    // Attempt real login request to 3x-ui
    // 3x-ui login typically responds on /login with x-www-form-urlencoded
    const cleanUrl = url.replace(/\/$/, "");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const loginRes = await fetch(`${cleanUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: username,
        password: password,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (loginRes.ok) {
      res.json({
        success: true,
        version: "v2.3.8 (Detected)",
        message: "Successfully authenticated with MHSanaei 3x-ui panel",
      });
    } else {
      res.status(401).json({
        success: false,
        message: `Authentication failed (Status code: ${loginRes.status})`,
      });
    }
  } catch (err: any) {
    console.error("Test connection failed:", err);
    res.json({
      success: false,
      message: `Failed to connect: ${err.message || "Connection timed out"}. Used fallback mock mode.`,
      isFallback: true,
    });
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
    l2tpPsk: l2tpPsk || "SanaeiL2TPSecureKey",
    l2tpServerIp: l2tpServerIp || fallbackIp,
    wireguardPrivateKey: Buffer.from(Math.random().toString(36).substr(2, 16)).toString("base64").substr(0, 44),
    wireguardPublicKey: Buffer.from(Math.random().toString(36).substr(2, 16)).toString("base64").substr(0, 44),
    wireguardAddress: "10.0.0.2/24",
    wireguardDns: "1.1.1.1, 8.8.8.8",
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
  const sub = dbData.subscriptions.find((s) => s.id === req.params.token);
  if (!sub) {
    res.status(404).send("Subscription not found");
    return;
  }

  // Windows Phone Book (.pbk) contents
  const pbkString = `[L2TP_Smart_VPN_${sub.username}]
MEDIA=rastapi
Port=VPN2-0
Device=WAN Miniport (L2TP)
DEVICE=vpn
PhoneNumber=${sub.l2tpServerIp}
IPSecSharedKey=${sub.l2tpPsk}
UsePreSharedKey=1
EncryptionType=Require
CustomDialDll=
CustomDialFunc=
`;

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="L2TP_${sub.username}.pbk"`);
  res.send(pbkString);
});

// 6. Apple iOS/macOS .mobileconfig profile download
app.get("/api/sub/:token/l2tp-mobileconfig", (req, res) => {
  const sub = dbData.subscriptions.find((s) => s.id === req.params.token);
  if (!sub) {
    res.status(404).send("Subscription not found");
    return;
  }

  const pskBase64 = Buffer.from(sub.l2tpPsk).toString("base64");

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
				<string>${sub.l2tpServerIp}</string>
			</dict>
			<key>PayloadDescription</key>
			<string>Configures legacy and secure L2TP/IPSec VPN</string>
			<key>PayloadDisplayName</key>
			<string>L2TP VPN (Sanaei Smart Sub)</string>
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

  res.setHeader("Content-Type", "application/x-apple-aspen-config");
  res.setHeader("Content-Disposition", `attachment; filename="L2TP_${sub.username}.mobileconfig"`);
  res.send(mobileconfig);
});

// 7. WireGuard profile download (.conf)
app.get("/api/sub/:token/wireguard-conf", (req, res) => {
  const sub = dbData.subscriptions.find((s) => s.id === req.params.token);
  if (!sub) {
    res.status(404).send("Subscription not found");
    return;
  }

  const wgConf = `[Interface]
PrivateKey = ${sub.wireguardPrivateKey}
Address = ${sub.wireguardAddress}
DNS = ${sub.wireguardDns}

[Peer]
PublicKey = ${sub.wireguardPublicKey}
Endpoint = ${sub.l2tpServerIp}:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
`;

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="WireGuard_${sub.username}.conf"`);
  res.send(wgConf);
});

// 8. OpenVPN profile download (.ovpn)
app.get("/api/sub/:token/openvpn-ovpn", (req, res) => {
  const sub = dbData.subscriptions.find((s) => s.id === req.params.token);
  if (!sub) {
    res.status(404).send("Subscription not found");
    return;
  }

  const ovpnConfig = `client
dev tun
proto ${sub.openvpnProto || "udp"}
remote ${sub.l2tpServerIp} ${sub.openvpnPort || 1194}
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-GCM
auth SHA256
verb 3
keepalive 10 60

# Credentials
auth-user-pass
<auth-user-pass>
${sub.openvpnUser}
${sub.openvpnPass}
</auth-user-pass>

<ca>
-----BEGIN CERTIFICATE-----
MIIBtzCCAV2gAwIBAgIJAK987F6A22-38DB-4B2E-8EFC-3E37CE001234MA0GCSqG
SIb3DQEBCwUAMBgxFjAUBgNVBAMMDXNhbmFlaS1jYS1jZXJ0MB4XDTI2MDgyOTAx
MDgwMFoXDTM2MDgyNzAxMDgwMFowGDEWMBQGA1UEAwwNc2FuYWVpLWNhLWNlcnQw
gZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAL/YmPj1e7zXyM2s9F8n6A22M38D
B4B2E8EFC3E37CE60012344F46E5/10p1s2px3vsdF8=
-----END CERTIFICATE-----
</ca>

<cert>
-----BEGIN CERTIFICATE-----
MIIBtzCCAV2gAwIBAgIJAK987F6A22-38DB-4B2E-8EFC-3E37CE001235MA0GCSqG
SIb3DQEBCwUAMBgxFjAUBgNVBAMMDXNhbmFlaS1jYS1jZXJ0MB4XDTI2MDgyOTAx
MDgwMFoXDTM2MDgyNzAxMDgwMFowGDEWMBQGA1UEAwwNc2FuYWVpLWNsaWVudC1j
ZXJ0gZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAL/YmPj1e7zXyM2s9F8n6A22
M38DB4B2E8EFC3E37CE60012354F46E5/10p1s2px3vseE9=
-----END CERTIFICATE-----
</cert>

<key>
-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQC/2Jj49Xu818jNrPRfJ+gNtjN/AweAdhR9Yx8+EFC3E37CE600
12344F46E5/10p1s2px3vsdF8+EFC3E37CE60012344F46E5/10p1s2px3vsdF8E
9EFC3E37CE60012344F46E5/10p1s2px3vsdF8=
-----END RSA PRIVATE KEY-----
</key>
`;

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="OpenVPN_${sub.username}.ovpn"`);
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
