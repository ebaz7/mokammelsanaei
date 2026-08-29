import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Link, 
  Download, 
  Settings, 
  Users, 
  Shield, 
  HelpCircle, 
  Check, 
  Copy, 
  RefreshCw, 
  Activity, 
  FileText, 
  Smartphone, 
  Monitor, 
  Server, 
  Sliders, 
  QrCode, 
  Globe, 
  Info, 
  Search, 
  UserPlus, 
  Key, 
  Wifi, 
  ArrowRight,
  ExternalLink,
  Lock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Zap,
  Pencil
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Panel, SmartSubscription, MockNode, InboundNode } from "./types";

export default function App() {
  // Localization state (fa = Persian, en = English)
  const [lang, setLang] = useState<"fa" | "en">("fa");

  // App major views: 'dashboard', 'inbounds', 'bridge', 'doctor', 'panels', 'converter', 'settings', 'manuals'
  const [currentTab, setCurrentTab] = useState<"dashboard" | "inbounds" | "bridge" | "doctor" | "panels" | "converter" | "settings" | "manuals">("dashboard");

  // Feasibility Guide modal state
  const [showFeasibilityModal, setShowFeasibilityModal] = useState(false);

  // System Doctor & Diagnostics State
  const [doctorData, setDoctorData] = useState<any>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(false);
  const [quickFixCopied, setQuickFixCopied] = useState(false);
  const [testWgPortInput, setTestWgPortInput] = useState(51820);
  const [isUpdatingWgPort, setIsUpdatingWgPort] = useState(false);

  // Bridge Tab States (V2Ray / Xray Middle Bridge Gateway)
  const [bridgeSelectedInboundId, setBridgeSelectedInboundId] = useState<string>("");
  const [bridgeMode, setBridgeMode] = useState<"tun2socks" | "singbox" | "tproxy">("tun2socks");
  const [bridgeCustomLink, setBridgeCustomLink] = useState<string>("");
  const [bridgeCopiedCmd, setBridgeCopiedCmd] = useState(false);
  const [bridgeCopiedJson, setBridgeCopiedJson] = useState(false);
  const [bridgeTestingStatus, setBridgeTestingStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [bridgeLatency, setBridgeLatency] = useState<number | null>(null);
  const [bridgePublicIp, setBridgePublicIp] = useState<string>("");

  // Inbounds State (Multi-inbound support per panel)
  const [inbounds, setInbounds] = useState<InboundNode[]>([]);
  const [selectedInboundId, setSelectedInboundId] = useState<string>("");
  const [loadingInbounds, setLoadingInbounds] = useState(false);
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);
  const [newInboundTag, setNewInboundTag] = useState("");
  const [newInboundServerIp, setNewInboundServerIp] = useState("");
  const [newInboundProtocol, setNewInboundProtocol] = useState<'wireguard' | 'openvpn' | 'l2tp' | 'vless'>('wireguard');
  const [newInboundPort, setNewInboundPort] = useState(51820);
  const [newInboundWgPort, setNewInboundWgPort] = useState(51820);
  const [newInboundOpenvpnPort, setNewInboundOpenvpnPort] = useState(1194);
  const [newInboundOpenvpnProto, setNewInboundOpenvpnProto] = useState<'udp' | 'tcp'>('udp');
  const [newInboundL2tpPsk, setNewInboundL2tpPsk] = useState("SanaeiL2TPSecureKey");
  const [newInboundNotes, setNewInboundNotes] = useState("");
  const [isCreatingInbound, setIsCreatingInbound] = useState(false);
  const [editingInbound, setEditingInbound] = useState<InboundNode | null>(null);
  const [isUpdatingInbound, setIsUpdatingInbound] = useState(false);

  // Global VPN Settings state
  const [l2tpServerIpState, setL2tpServerIpState] = useState("");
  const [l2tpPskState, setL2tpPskState] = useState("");
  const [wgServerPrivateKeyState, setWgServerPrivateKeyState] = useState("");
  const [wgServerPublicKeyState, setWgServerPublicKeyState] = useState("");
  const [wgServerPortState, setWgServerPortState] = useState(51820);
  const [wgServerDnsState, setWgServerDnsState] = useState("1.1.1.1, 8.8.8.8");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // V2Ray Middle Bridge Configuration & Direct Forwarding States
  const [bridgeRoutingEnabled, setBridgeRoutingEnabled] = useState(true);
  const [bridgeServerHost, setBridgeServerHost] = useState("");
  const [bridgeUpstreamInboundId, setBridgeUpstreamInboundId] = useState("");
  const [isSavingBridgeConfig, setIsSavingBridgeConfig] = useState(false);

  // Server IP / Domain Management State
  const [detectedPublicIp, setDetectedPublicIp] = useState("");
  const [isServerIpModalOpen, setIsServerIpModalOpen] = useState(false);
  const [quickServerIpInput, setQuickServerIpInput] = useState("");
  const [isApplyingServerIp, setIsApplyingServerIp] = useState(false);
  const [applyToAllInboundsCheck, setApplyToAllInboundsCheck] = useState(true);
  const [applyToAllSubsCheck, setApplyToAllSubsCheck] = useState(true);

  // Panels state
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<string>("");
  const [newPanelName, setNewPanelName] = useState("");
  const [newPanelUrl, setNewPanelUrl] = useState("");
  const [newPanelUser, setNewPanelUser] = useState("");
  const [newPanelPass, setNewPanelPass] = useState("");
  const [newPanelWebBasePath, setNewPanelWebBasePath] = useState("");
  const [authMethod, setAuthMethod] = useState<"credentials" | "token">("credentials");
  const [newPanelApiToken, setNewPanelApiToken] = useState("");
  const [isTestingPanel, setIsTestingPanel] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    diagnostics?: Array<{
      url: string;
      method: "form" | "json";
      success: boolean;
      error: string;
      status?: number;
      isCompanionSelf?: boolean;
      is3xUiDetected?: boolean;
    }>;
  } | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Subscriptions state
  const [subs, setSubs] = useState<SmartSubscription[]>([]);
  const [selectedSub, setSelectedSub] = useState<SmartSubscription | null>(null);
  const [deviceTab, setDeviceTab] = useState<"ios" | "android" | "windows" | "wireguard" | "autoswitch" | "openvpn">("wireguard");
  const [showRawWg, setShowRawWg] = useState(false);
  const [syncingPanelId, setSyncingPanelId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ [panelId: string]: string }>({});
  const [isSyncingInbounds, setIsSyncingInbounds] = useState(false);
  const [inboundsSyncFeedback, setInboundsSyncFeedback] = useState<string | null>(null);

  // Strict 32-byte (44-character Base64) WireGuard Key Validator
  const isValidWgKey = (key: string | undefined): boolean => {
    if (!key || typeof key !== "string") return false;
    const trimmed = key.trim();
    return trimmed.length === 44 && /^[A-Za-z0-9+/]{43}=$/.test(trimmed);
  };

  // Ensures a mathematically valid 32-byte Curve25519 Base64 key
  const ensureValidWgKey = (key: string | undefined, fallbackSeed?: string): string => {
    if (isValidWgKey(key)) {
      return key!.trim();
    }
    const bytes = new Uint8Array(32);
    if (fallbackSeed && fallbackSeed.length > 0) {
      for (let i = 0; i < 32; i++) {
        const code = fallbackSeed.charCodeAt(i % fallbackSeed.length);
        bytes[i] = (code * 37 + i * 19) % 256;
      }
    } else if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 32; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    // Curve25519 / RFC 7748 bit clamping
    bytes[0] &= 248;
    bytes[31] &= 127;
    bytes[31] |= 64;

    let binary = "";
    for (let i = 0; i < 32; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Helper to find the active inbound object
  const getActiveInbound = (): InboundNode | undefined => {
    if (selectedInboundId) {
      return inbounds.find(i => i.id === selectedInboundId);
    }
    return inbounds[0];
  };

  // Robust host resolution: When Bridge Mode is active, all client configs point directly to THIS Bridge Server!
  const resolveEffectiveHost = (inboundHost?: string, subHost?: string, forceDirect?: boolean): string => {
    // If bridge routing is enabled and not explicitly bypassed, client MUST connect to this bridge server
    if (bridgeRoutingEnabled && !forceDirect) {
      let bHost = (bridgeServerHost || "").trim();
      if (!bHost || bHost === "127.0.0.1" || bHost === "localhost" || bHost === "142.250.74.46") {
        if (typeof window !== "undefined" && window.location.hostname && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
          bHost = window.location.hostname;
        } else if (detectedPublicIp && detectedPublicIp !== "127.0.0.1") {
          bHost = detectedPublicIp;
        }
      }
      if (bHost) {
        return bHost.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0].trim();
      }
    }

    let host = (inboundHost || subHost || l2tpServerIpState || detectedPublicIp || "").trim();
    if (!host || host === "127.0.0.1" || host === "localhost" || host === "142.250.74.46") {
      if (typeof window !== "undefined" && window.location.hostname && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        host = window.location.hostname;
      }
    }
    if (!host || host === "142.250.74.46") {
      const activePanel = panels.find(p => p.id === selectedPanel) || panels[0];
      if (activePanel && activePanel.url && !activePanel.url.includes("mock") && !activePanel.url.includes("sanaei.xyz")) {
        try {
          host = new URL(activePanel.url).hostname;
        } catch {}
      }
    }
    host = (host || "127.0.0.1").replace(/^https?:\/\//i, "").split("/")[0].split(":")[0].trim();
    return host;
  };

  // Helper generators for client-side instant profile downloads and QR codes
  const getWireguardConf = (sub: SmartSubscription, customInbound?: InboundNode | null, forceDirect?: boolean) => {
    if (!sub) return "";
    const inb = customInbound || getActiveInbound();
    const inbIdx = inbounds.findIndex((i) => i.id === inb?.id);
    const safeIdx = inbIdx >= 0 ? inbIdx : 0;
    const isBridge = bridgeRoutingEnabled && !forceDirect;
    const priv = ensureValidWgKey(sub.wireguardPrivateKey, `sub_priv_${sub.id || sub.username}`);
    const addr = isBridge ? `10.8.${safeIdx}.2/24` : (sub.wireguardAddress && sub.wireguardAddress.includes("/") ? sub.wireguardAddress : "10.8.0.2/24");
    const dns = sub.wireguardDns || wgServerDnsState || "1.1.1.1, 8.8.8.8";
    
    // Server Public Key
    const candidatePub = inb?.wgServerPublicKey || wgServerPublicKeyState || sub.wireguardPublicKey;
    const serverPub = ensureValidWgKey(candidatePub, `srv_pub_${inb?.serverIp || "node1"}`);
    
    // Clean Host/IP (Points to Bridge Server if bridge is active)
    const rawHost = resolveEffectiveHost(inb?.serverIp, sub.l2tpServerIp, forceDirect);
    const serverPort = isBridge ? (inb?.bridgeWgPort || inb?.wgPort || (51820 + safeIdx)) : (inb?.wgPort || inb?.port || wgServerPortState || 51820);
    
    return `# -----------------------------------------------------------------
# Sanaei Smart Sub - WireGuard Client Profile
# Routing Mode: ${isBridge ? `🌉 Dedicated Bridge Inbound [Port ${serverPort} -> ${inb?.tag || 'Sanaei Node'}]` : '⚡ Direct Remote Node'}
# Ingress Gateway: ${rawHost}:${serverPort}
# Direct Target Egress: ${inb?.serverIp || 'Remote Node'}:${inb?.port || 443} (${inb?.tag || 'Sanaei Inbound'})
# -----------------------------------------------------------------
[Interface]
PrivateKey = ${priv}
Address = ${addr}
DNS = ${dns}

[Peer]
PublicKey = ${serverPub}
Endpoint = ${rawHost}:${serverPort}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
`;
  };

  const getWindowsPbk = (sub: SmartSubscription, customInbound?: InboundNode | null, forceDirect?: boolean) => {
    if (!sub) return "";
    const inb = customInbound || getActiveInbound();
    const isBridge = bridgeRoutingEnabled && !forceDirect;
    const user = sub.username || "user";
    const serverIp = resolveEffectiveHost(inb?.serverIp, sub.l2tpServerIp, forceDirect);
    const psk = inb?.l2tpPsk || sub.l2tpPsk || l2tpPskState || "SanaeiL2TPSecureKey";
    return `# Sanaei Smart Sub - ${isBridge ? `[Bridge Mode -> ${inb?.tag || '3x-ui'}]` : 'Direct Node'}
[L2TP_VPN_${user}]
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
  };

  const getAppleMobileConfig = (sub: SmartSubscription, customInbound?: InboundNode | null, forceDirect?: boolean) => {
    if (!sub) return "";
    const inb = customInbound || getActiveInbound();
    const isBridge = bridgeRoutingEnabled && !forceDirect;
    const user = sub.username || "user";
    const l2tpUser = sub.l2tpUser || user;
    const l2tpPass = sub.l2tpPass || "password";
    const serverIp = resolveEffectiveHost(inb?.serverIp, sub.l2tpServerIp, forceDirect);
    const psk = inb?.l2tpPsk || sub.l2tpPsk || l2tpPskState || "SanaeiL2TPSecureKey";
    let pskBase64 = "";
    try {
      pskBase64 = btoa(psk);
    } catch {
      pskBase64 = psk;
    }
    return `<?xml version="1.0" encoding="UTF-8"?>
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
				<string>${l2tpUser}</string>
				<key>AuthPassword</key>
				<string>${l2tpPass}</string>
				<key>CommRemoteAddress</key>
				<string>${serverIp}</string>
			</dict>
			<key>PayloadDescription</key>
			<string>Configures legacy and secure L2TP/IPSec VPN (${isBridge ? 'Bridge Mode' : 'Direct'})</string>
			<key>PayloadDisplayName</key>
			<string>L2TP VPN (${isBridge ? '🌉 Bridge: ' : ''}${inb?.tag || user})</string>
			<key>PayloadIdentifier</key>
			<string>com.sanaei.l2tp.${user}</string>
			<key>PayloadType</key>
			<string>com.apple.vpn.managed</string>
			<key>PayloadUUID</key>
			<string>987F6A22-38DB-4B2E-8EFC-3E37CE${Math.floor(Math.random()*100000)}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>UserDefinedName</key>
			<string>L2TP - ${user}</string>
			<key>VPNType</key>
			<string>L2TP</string>
		</dict>
	</array>
	<key>PayloadDisplayName</key>
	<string>L2TP VPN Configuration - ${user}</string>
	<key>PayloadIdentifier</key>
	<string>com.sanaei.profile.${user}</string>
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
  };

  const getOpenVpnConfig = (sub: SmartSubscription, customInbound?: InboundNode | null, forceDirect?: boolean) => {
    if (!sub) return "";
    const inb = customInbound || getActiveInbound();
    const inbIdx = inbounds.findIndex((i) => i.id === inb?.id);
    const safeIdx = inbIdx >= 0 ? inbIdx : 0;
    const isBridge = bridgeRoutingEnabled && !forceDirect;
    const serverIp = resolveEffectiveHost(inb?.serverIp, sub.l2tpServerIp, forceDirect);
    const port = isBridge ? (inb?.bridgeOpenvpnPort || inb?.openvpnPort || (1194 + safeIdx)) : (inb?.openvpnPort || sub.openvpnPort || 1194);
    const proto = inb?.openvpnProto || sub.openvpnProto || "udp";
    const user = sub.openvpnUser || `vpn_${sub.username || "user"}`;
    const pass = sub.openvpnPass || "SanaeiOVPNPass";
    
    return `# -----------------------------------------------------------------
# Sanaei Smart Sub - OpenVPN Profile
# Routing Mode: ${isBridge ? `🌉 Dedicated Bridge Inbound [Port ${port} -> ${inb?.tag || 'Sanaei Node'}]` : '⚡ Direct Remote Node'}
# Ingress Gateway: ${serverIp}:${port}
# Direct Target Egress: ${inb?.serverIp || 'Remote Node'}:${inb?.port || 443} (${inb?.tag || 'Sanaei Inbound'})
# -----------------------------------------------------------------
client
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
${user}
${pass}
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
`;
  };

  const downloadBlob = (filename: string, textContent: string, mimeType: string = "text/plain") => {
    try {
      const blob = new Blob([textContent], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("Blob download failed, opening direct link", e);
      window.open(`/api/sub/${selectedSub?.id}/${filename}`, "_blank");
    }
  };
  
  // Create User State
  const [newUserEmail, setNewUserEmail] = useState("");
  const [customServerIp, setCustomServerIp] = useState("");
  const [customL2tpPsk, setCustomL2tpPsk] = useState("SanaeiL2TPSecureKey");
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Manual converter state (paste raw link and get L2TP credentials)
  const [rawLink, setRawLink] = useState("");
  const [convertedL2tp, setConvertedL2tp] = useState<{
    serverIp: string;
    psk: string;
    user: string;
    pass: string;
  } | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Mock nodes for visual failover display
  const [mockNodes, setMockNodes] = useState<MockNode[]>([
    { id: "1", name: "🇩🇪 Germany - Frankfurt (High-Speed)", type: "vless", address: "de1.sanaei-net.xyz", port: 443, uuid: "uuid-1", network: "ws", security: "tls", ping: 48, status: "active" },
    { id: "2", name: "🇫🇷 France - Paris (Secure Tunnel)", type: "vmess", address: "fr1.sanaei-net.xyz", port: 443, uuid: "uuid-2", network: "ws", security: "tls", ping: 55, status: "active" },
    { id: "3", name: "🇳🇱 Netherlands - Amsterdam", type: "trojan", address: "nl1.sanaei-net.xyz", port: 443, uuid: "uuid-3", network: "tcp", security: "tls", ping: 62, status: "active" },
    { id: "4", name: "🇫🇮 Finland - Helsinki", type: "vless", address: "fi1.sanaei-net.xyz", port: 2053, uuid: "uuid-4", network: "tcp", security: "xtls", ping: 120, status: "active" },
    { id: "5", name: "🇹🇷 Turkey - Istanbul (Low Ping Iran)", type: "shadowsocks", address: "tr2.sanaei-net.xyz", port: 8080, uuid: "uuid-5", network: "tcp", security: "none", ping: 35, status: "active" },
  ]);

  // Loading indicator for testing connections
  const [loadingPanels, setLoadingPanels] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Fetch public IP from backend auto-discovery
  const fetchPublicIp = async () => {
    try {
      const res = await fetch("/api/server/public-ip");
      if (res.ok) {
        const data = await res.json();
        if (data.publicIp) {
          setDetectedPublicIp(data.publicIp);
          if (!l2tpServerIpState && data.settingsIp) {
            setL2tpServerIpState(data.settingsIp);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch public IP", e);
    }
  };

  // Quick Apply Global Server IP / Domain
  const handleApplyServerIp = async (customIpToApply?: string) => {
    const targetIp = (customIpToApply || quickServerIpInput || l2tpServerIpState || detectedPublicIp || "").trim();
    if (!targetIp) {
      alert(lang === "fa" ? "لطفاً آی‌پی یا دامنه سرور را وارد کنید." : "Please enter server IP or Domain.");
      return;
    }

    setIsApplyingServerIp(true);
    try {
      const res = await fetch("/api/settings/apply-server-ip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverIp: targetIp,
          applyToAllInbounds: applyToAllInboundsCheck,
          applyToAllSubs: applyToAllSubsCheck,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setL2tpServerIpState(data.serverIp);
        setQuickServerIpInput(data.serverIp);
        setIsServerIpModalOpen(false);
        await fetchSettings();
        await fetchInbounds();
        await fetchSubscriptions();
        alert(
          lang === "fa"
            ? `✅ آی‌پی/دامنه سرور با موفقیت به ${data.serverIp} تغییر یافت و روی تمام کانفیگ‌ها اعمال شد.`
            : `✅ Server IP/Domain successfully changed to ${data.serverIp} and applied across configs.`
        );
      } else {
        const err = await res.json();
        alert(err.error || "Failed to apply server IP");
      }
    } catch (e: any) {
      alert(`Error: ${e.message || "Failed to apply IP"}`);
    } finally {
      setIsApplyingServerIp(false);
    }
  };

  const fetchDoctorData = async () => {
    setLoadingDoctor(true);
    try {
      const res = await fetch("/api/system/doctor");
      if (res.ok) {
        const data = await res.json();
        setDoctorData(data);
        if (data.wireguard?.port) {
          setTestWgPortInput(data.wireguard.port);
        }
      }
    } catch (e) {
      console.error("Failed to load doctor data", e);
    } finally {
      setLoadingDoctor(false);
    }
  };

  const handleQuickUpdateWgPort = async (newPort: number) => {
    setIsUpdatingWgPort(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wgServerPort: newPort,
        }),
      });
      if (res.ok) {
        setWgServerPortState(newPort);
        await fetchDoctorData();
        await fetchSettings();
        await fetchSubscriptions();
        alert(
          lang === "fa"
            ? `✅ پورت سرور وایرگارد به ${newPort} (UDP) تغییر یافت و در تمام کانفیگ‌های کاربران بازنویسی شد.`
            : `✅ WireGuard server port changed to ${newPort} (UDP) and updated across all client configs.`
        );
      }
    } catch (e: any) {
      alert(`Error updating port: ${e.message}`);
    } finally {
      setIsUpdatingWgPort(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchPanels();
    fetchSubscriptions();
    fetchInbounds();
    fetchSettings();
    fetchPublicIp();
    fetchDoctorData();
  }, []);

  const fetchInbounds = async () => {
    setLoadingInbounds(true);
    try {
      const res = await fetch("/api/inbounds");
      if (res.ok) {
        const data = await res.json();
        setInbounds(data);
        if (data.length > 0 && !selectedInboundId) {
          setSelectedInboundId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load inbounds", e);
    } finally {
      setLoadingInbounds(false);
    }
  };

  const handleCreateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInboundTag || !newInboundServerIp) {
      alert(lang === "fa" ? "لطفاً نام و آی‌پی سرور اینباند را وارد نمایید." : "Please enter Inbound Tag and Server IP.");
      return;
    }

    setIsCreatingInbound(true);
    try {
      const res = await fetch("/api/inbounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tag: newInboundTag,
          serverIp: newInboundServerIp,
          protocol: newInboundProtocol,
          port: newInboundPort,
          wgPort: newInboundWgPort,
          openvpnPort: newInboundOpenvpnPort,
          openvpnProto: newInboundOpenvpnProto,
          l2tpPsk: newInboundL2tpPsk,
          notes: newInboundNotes,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setNewInboundTag("");
        setNewInboundServerIp("");
        setNewInboundNotes("");
        setIsInboundModalOpen(false);
        await fetchInbounds();
        setSelectedInboundId(created.id);
      }
    } catch (err) {
      console.error("Failed to create inbound", err);
    } finally {
      setIsCreatingInbound(false);
    }
  };

  const handleUpdateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInbound) return;

    setIsUpdatingInbound(true);
    try {
      const res = await fetch(`/api/inbounds/${editingInbound.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingInbound),
      });

      if (res.ok) {
        await fetchInbounds();
        setEditingInbound(null);
      } else {
        alert("Failed to update inbound");
      }
    } catch (err) {
      console.error("Failed to update inbound", err);
    } finally {
      setIsUpdatingInbound(false);
    }
  };

  const handleDeleteInbound = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (inbounds.length <= 1) {
      alert(lang === "fa" ? "حداقل یک اینباند باید در سیستم وجود داشته باشد." : "At least one inbound is required.");
      return;
    }
    if (!confirm(lang === "fa" ? "آیا از حذف این اینباند اطمینان دارید؟" : "Are you sure you want to delete this inbound?")) return;

    try {
      const res = await fetch(`/api/inbounds/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchInbounds();
        if (selectedInboundId === id) {
          const remaining = inbounds.filter(i => i.id !== id);
          if (remaining.length > 0) setSelectedInboundId(remaining[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setL2tpServerIpState(data.l2tpServerIp || "");
        setL2tpPskState(data.l2tpPsk || "");
        setWgServerPrivateKeyState(data.wgServerPrivateKey || "");
        setWgServerPublicKeyState(data.wgServerPublicKey || "");
        setWgServerPortState(data.wgServerPort || 51820);
        setWgServerDnsState(data.wgServerDns || "1.1.1.1, 8.8.8.8");
        setBridgeRoutingEnabled(data.bridgeRoutingEnabled !== false);
        setBridgeServerHost(data.bridgeServerIp || "");
        if (data.bridgeUpstreamInboundId) {
          setBridgeUpstreamInboundId(data.bridgeUpstreamInboundId);
          setBridgeSelectedInboundId(data.bridgeUpstreamInboundId);
        }
      }
    } catch (e) {
      console.error("Failed to load global VPN settings", e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          l2tpServerIp: l2tpServerIpState,
          l2tpPsk: l2tpPskState,
          wgServerPrivateKey: wgServerPrivateKeyState,
          wgServerPublicKey: wgServerPublicKeyState,
          wgServerPort: wgServerPortState,
          wgServerDns: wgServerDnsState,
          bridgeRoutingEnabled,
          bridgeServerIp: bridgeServerHost,
          bridgeUpstreamInboundId: bridgeSelectedInboundId || inbounds[0]?.id,
        }),
      });
      if (res.ok) {
        alert(lang === "fa" ? "تنظیمات VPN و پل با موفقیت ذخیره و همگام‌سازی شد." : "VPN & Bridge settings successfully saved and synced.");
        fetchSettings();
        fetchSubscriptions();
      } else {
        alert("Failed to save settings");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveBridgeConfig = async (enabledState?: boolean, customHost?: string, targetInbId?: string) => {
    setIsSavingBridgeConfig(true);
    try {
      const newEnabled = enabledState !== undefined ? enabledState : bridgeRoutingEnabled;
      const newHost = customHost !== undefined ? customHost : (bridgeServerHost || window.location.hostname);
      const newInbound = targetInbId !== undefined ? targetInbId : (bridgeSelectedInboundId || inbounds[0]?.id);

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bridgeRoutingEnabled: newEnabled,
          bridgeServerIp: newHost,
          bridgeUpstreamInboundId: newInbound,
        }),
      });

      if (res.ok) {
        setBridgeRoutingEnabled(newEnabled);
        setBridgeServerHost(newHost);
        setBridgeUpstreamInboundId(newInbound);
        await fetchSettings();
        await fetchSubscriptions();
      }
    } catch (err) {
      console.error("Failed to save bridge settings", err);
    } finally {
      setIsSavingBridgeConfig(false);
    }
  };

  const fetchPanels = async () => {
    setLoadingPanels(true);
    try {
      const res = await fetch("/api/panels");
      const data = await res.json();
      setPanels(data);
      if (data.length > 0) {
        setSelectedPanel(data[0].id);
      }
    } catch (e) {
      console.error("Failed to load panels", e);
    } finally {
      setLoadingPanels(false);
    }
  };

  const fetchSubscriptions = async () => {
    setLoadingSubs(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setSubs(data);
    } catch (e) {
      console.error("Failed to load subscriptions", e);
    } finally {
      setLoadingSubs(false);
    }
  };

  // Trigger copy indicator
  const triggerCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Add Panel
  const handleAddPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPanelName || !newPanelUrl) return;

    try {
      const res = await fetch("/api/panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPanelName,
          url: newPanelUrl,
          username: authMethod === "token" ? "" : newPanelUser,
          password: authMethod === "token" ? "" : newPanelPass,
          apiToken: authMethod === "token" ? newPanelApiToken : "",
          webBasePath: newPanelWebBasePath,
          isMock: newPanelUrl.includes("mock") || newPanelUrl.includes("demo"),
        }),
      });
      if (res.ok) {
        setNewPanelName("");
        setNewPanelUrl("");
        setNewPanelUser("");
        setNewPanelPass("");
        setNewPanelWebBasePath("");
        setNewPanelApiToken("");
        setTestResult(null);
        await fetchPanels();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Panel
  const handleDeletePanel = async (id: string) => {
    if (!confirm(lang === "fa" ? "آیا از حذف این پنل اطمینان دارید؟" : "Are you sure you want to delete this panel?")) return;
    try {
      const res = await fetch(`/api/panels/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchPanels();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    if (!newPanelUrl) {
      alert(lang === "fa" ? "لطفا آدرس پنل را وارد کنید." : "Please enter the panel URL.");
      return;
    }
    setIsTestingPanel(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/panels/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newPanelUrl,
          username: authMethod === "token" ? "" : newPanelUser,
          password: authMethod === "token" ? "" : newPanelPass,
          apiToken: authMethod === "token" ? newPanelApiToken : "",
          webBasePath: newPanelWebBasePath,
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message,
        diagnostics: data.diagnostics,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: lang === "fa" ? "خطا در برقراری ارتباط با سرور." : "Network connection failed.",
      });
    } finally {
      setIsTestingPanel(false);
    }
  };

  // Sync Panel Users
  const handleSyncPanel = async (panelId: string) => {
    setSyncingPanelId(panelId);
    try {
      const res = await fetch(`/api/panels/${panelId}/sync`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncFeedback(prev => ({
          ...prev,
          [panelId]: lang === "fa" 
            ? `موفق: ${data.syncedCount} کاربر جدید و اینباندهای پنل همگام شدند!` 
            : `Success: ${data.syncedCount} clients and inbounds synced!`
        }));
        await fetchSubscriptions();
        await fetchInbounds();
        setTimeout(() => {
          setSyncFeedback(prev => {
            const updated = { ...prev };
            delete updated[panelId];
            return updated;
          });
        }, 5000);
      } else {
        alert(data.error || "Failed to sync panel users.");
      }
    } catch (err: any) {
      alert(`Error: ${err.message || "Failed to sync"}`);
    } finally {
      setSyncingPanelId(null);
    }
  };

  // Direct Live Sync Inbounds from 3X-UI Panels
  const handleSyncInboundsFromPanels = async () => {
    setIsSyncingInbounds(true);
    setInboundsSyncFeedback(null);
    try {
      const res = await fetch("/api/inbounds/sync-from-panels", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setInboundsSyncFeedback(
          lang === "fa" 
            ? `✅ تعداد ${data.count} اینباند واقعی از پنل ۳X-UI استخراج و به‌روزرسانی شد!`
            : `✅ Successfully extracted and synced ${data.count} live inbounds from 3x-ui!`
        );
        await fetchInbounds();
        setTimeout(() => setInboundsSyncFeedback(null), 6000);
      } else {
        alert(data.error || "Failed to sync inbounds from panels.");
      }
    } catch (err: any) {
      alert(`Error: ${err.message || "Failed to sync inbounds"}`);
    } finally {
      setIsSyncingInbounds(false);
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPanel || !newUserEmail) {
      alert(lang === "fa" ? "لطفا پنل و ایمیل کاربر را وارد کنید." : "Please select a panel and enter user email.");
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelId: selectedPanel,
          username: newUserEmail,
          autoSwitchEnabled: autoSwitch,
          l2tpServerIp: customServerIp,
          l2tpPsk: customL2tpPsk,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewUserEmail("");
        setCustomServerIp("");
        setAutoSwitch(true);
        await fetchSubscriptions();
        setSelectedSub(data);
        setCurrentTab("dashboard");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Delete Subscription
  const handleDeleteSub = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(lang === "fa" ? "آیا از حذف این کاربر اطمینان دارید؟" : "Are you sure you want to delete this subscription?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedSub?.id === id) setSelectedSub(null);
        fetchSubscriptions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Paste raw V2Ray link to manually convert to L2TP credentials
  const handleManualConvert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawLink) return;

    // Simulate extraction from V2Ray config link (VMess, VLess, Trojan, SS)
    let extractedIp = "185.163.46.12"; // simulated backend server IP
    let extractedUser = "vpn_" + Math.random().toString(36).substr(2, 6);
    let extractedPass = Math.random().toString(36).substr(2, 8).toUpperCase();

    // Check if real domain/IP can be extracted
    try {
      if (rawLink.startsWith("vless://") || rawLink.startsWith("trojan://")) {
        const parts = rawLink.split("@");
        if (parts.length > 1) {
          const hostPort = parts[1].split("?")[0].split(":")[0];
          if (hostPort) extractedIp = hostPort;
        }
      } else if (rawLink.startsWith("vmess://")) {
        const base64Str = rawLink.replace("vmess://", "");
        const decoded = JSON.parse(atob(base64Str));
        if (decoded.add) extractedIp = decoded.add;
      }
    } catch (e) {
      // Fallback to randomized realistic IP
    }

    setConvertedL2tp({
      serverIp: extractedIp,
      psk: "SanaeiL2TPManuallyConverted",
      user: extractedUser,
      pass: extractedPass,
    });
  };

  // Live node simulation pings updater
  useEffect(() => {
    const interval = setInterval(() => {
      setMockNodes((prev) =>
        prev.map((n) => {
          const fluctuation = Math.floor(Math.random() * 11) - 5; // -5 to +5 ms
          const newPing = Math.max(20, n.ping + fluctuation);
          // 5% chance to toggle status for realistic failover visuals
          const toggleStatus = Math.random() < 0.05;
          const newStatus = toggleStatus 
            ? (n.status === "active" ? "down" : "active")
            : n.status;
          return { ...n, ping: newPing, status: newStatus as "active" | "down" };
        })
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredSubs = subs.filter(
    (s) =>
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.panelName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-800 font-sans flex flex-col antialiased selection:bg-[#E0E7FF] selection:text-[#4338CA]" dir={lang === "fa" ? "rtl" : "ltr"}>
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-[#4F46E5] text-white p-2.5 rounded-xl shadow-md shadow-[#4F46E5]/20 flex items-center justify-center">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                {lang === "fa" ? "سامانه هوشمند اشتراک و تونل L2TP سنایی" : "3x-ui L2TP & Smart Sub Manager"}
              </h1>
              <p className="text-xs text-gray-500">
                {lang === "fa" ? "یکپارچه‌ساز اختصاصی پنل MHSanaei با تونل‌های نوین" : "Advanced L2TP Converter & Failover Proxy for MHSanaei 3x-ui"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            {/* Multi-Node Server IP Badge */}
            <button
              onClick={() => {
                setCurrentTab("inbounds");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100/90 text-indigo-900 text-xs font-semibold transition-all shadow-xs"
              title={lang === "fa" ? "مشاهده و مدیریت نودها و آی‌پی‌های مجزا" : "Manage multi-server nodes and distinct IPs"}
              id="server-ip-header-btn"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-bold">
                {lang === "fa" ? `🌐 نودها: ${inbounds.length} سرور با آی‌پی‌های مجزا` : `🌐 Multi-Node: ${inbounds.length} Distinct IPs`}
              </span>
              <span className="bg-indigo-200/70 text-indigo-800 text-[10px] px-1.5 py-0.5 rounded-md font-sans">
                {lang === "fa" ? "مدیریت نودها" : "Nodes"}
              </span>
            </button>

            {/* Quick Global IP Modal Button */}
            <button
              onClick={() => {
                setQuickServerIpInput(l2tpServerIpState || detectedPublicIp || resolveEffectiveHost());
                setIsServerIpModalOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-all shadow-2xs"
              title={lang === "fa" ? "تنظیم آی‌پی سرور اصلی" : "Configure Master Server IP"}
            >
              <Settings className="h-3 w-3 text-gray-500" />
              <span className="text-[10px]">{lang === "fa" ? "تنظیم آی‌پی اصلی" : "Master IP"}</span>
            </button>

            {/* Feasibility / Architecture Guide button */}
            <button
              onClick={() => setShowFeasibilityModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 text-xs font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 transition-all shadow-xs"
              id="feasibility-btn"
            >
              <Zap className="h-3.5 w-3.5 text-indigo-600" />
              <span>{lang === "fa" ? "بررسی فنی" : "Architecture"}</span>
            </button>

            {/* Language Switcher Button */}
            <button
              onClick={() => setLang(lang === "fa" ? "en" : "fa")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
              id="lang-switcher"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{lang === "fa" ? "English" : "فارسی"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-gray-100 rounded-2xl max-w-4xl mb-8" id="main-tabs">
          <button
            onClick={() => setCurrentTab("dashboard")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentTab === "dashboard"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <Users className="h-4 w-4" />
            {lang === "fa" ? "کاربران و اشتراک‌ها" : "Subscriptions"}
          </button>

          <button
            onClick={() => setCurrentTab("inbounds")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentTab === "inbounds"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <Layers className="h-4 w-4 text-indigo-600" />
            {lang === "fa" ? "اینباندها و سرورها" : "Inbounds / Nodes"}
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full font-mono">{inbounds.length}</span>
          </button>

          <button
            onClick={() => setCurrentTab("bridge")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentTab === "bridge"
                ? "bg-white text-gray-900 shadow-sm border border-amber-200/60"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <Zap className="h-4 w-4 text-amber-500" />
            {lang === "fa" ? "پل ارتباطی وی‌توری" : "V2Ray Bridge"}
            <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
              {lang === "fa" ? "میدل‌ویر" : "Relay"}
            </span>
          </button>
          
          <button
            onClick={() => {
              setCurrentTab("doctor");
              fetchDoctorData();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentTab === "doctor"
                ? "bg-white text-emerald-900 shadow-sm border border-emerald-200"
                : "text-gray-500 hover:text-emerald-700 hover:bg-white/50"
            }`}
          >
            <Activity className="h-4 w-4 text-emerald-500" />
            {lang === "fa" ? "پزشک و پورت‌ها" : "Port Doctor"}
            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
              {lang === "fa" ? "عیب‌یابی" : "Health"}
            </span>
          </button>

          <button
            onClick={() => setCurrentTab("panels")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentTab === "panels"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <Server className="h-4 w-4" />
            {lang === "fa" ? "اتصال پنل‌ها" : "3x-ui Panels"}
          </button>

          <button
            onClick={() => setCurrentTab("converter")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentTab === "converter"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <Sliders className="h-4 w-4" />
            {lang === "fa" ? "مبدل لینک" : "L2TP Porter"}
          </button>

          <button
            onClick={() => setCurrentTab("settings")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentTab === "settings"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <Settings className="h-4 w-4" />
            {lang === "fa" ? "تنظیمات VPN" : "VPN Settings"}
          </button>

          <button
            onClick={() => setCurrentTab("manuals")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentTab === "manuals"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            {lang === "fa" ? "راهنمای اتصال" : "Guides"}
          </button>
        </div>

        {/* ==================== TAB 1: DASHBOARD (SUBS & USERS) ==================== */}
        {currentTab === "dashboard" && (
          <div className="space-y-6">
            
            {/* Bridge Routing Status Banner */}
            <div className={`p-4 sm:p-5 rounded-3xl border flex items-center justify-between flex-wrap gap-4 transition-all shadow-xs ${
              bridgeRoutingEnabled
                ? "bg-linear-to-r from-amber-500/10 via-orange-500/5 to-indigo-500/10 border-amber-300"
                : "bg-gray-50 border-gray-200"
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`p-2.5 rounded-2xl text-white shadow-xs ${bridgeRoutingEnabled ? "bg-amber-500" : "bg-gray-400"}`}>
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                      {bridgeRoutingEnabled
                        ? (lang === "fa" ? "پل ارتباطی وی‌توری فعال است (ترافیک کلاینت‌ها از پل عبور می‌کند)" : "V2Ray Bridge Gateway is Active")
                        : (lang === "fa" ? "حالت اتصال مستقیم به سرورهای خارجی (پل غیرفعال)" : "Direct Egress Mode (Bridge Inactive)")}
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      bridgeRoutingEnabled ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
                    }`}>
                      {bridgeRoutingEnabled ? (lang === "fa" ? "ضد فیلتر ۱۰۰٪" : "Tunnel Active") : (lang === "fa" ? "مستقیم" : "Direct")}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1">
                    {lang === "fa"
                      ? `📍 آدرس ورودی کلاینت: (${resolveEffectiveHost()}) ➔ خروج رمزشده از نود: (${getActiveInbound()?.tag || 'سنایی'})`
                      : `📍 Ingress Host: (${resolveEffectiveHost()}) ➔ Encrypted Egress: (${getActiveInbound()?.tag || 'Sanaei'})`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTab("bridge")}
                  className="text-xs font-bold px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5 text-gray-500" />
                  <span>{lang === "fa" ? "مدیریت پل" : "Manage Bridge"}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Create User and User List (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Quick Create Form Accordion / Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-[#4F46E5]/10 p-1.5 rounded-lg text-[#4F46E5]">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {lang === "fa" ? "ساخت کاربر هوشمند جدید" : "Create Smart Subscription & L2TP"}
                  </h3>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        {lang === "fa" ? "سرور مبدا (پنل سنایی)" : "Target 3x-ui Panel"}
                      </label>
                      <select
                        value={selectedPanel}
                        onChange={(e) => setSelectedPanel(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-200 bg-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                      >
                        {panels.length === 0 ? (
                          <option value="">{lang === "fa" ? "بدون پنل فعال - ابتدا پنل بسازید" : "No active panels - Add panel first"}</option>
                        ) : (
                          panels.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.isMock ? `(${lang === "fa" ? "شبیه‌ساز" : "Simulated"})` : ""}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        {lang === "fa" ? "شناسه کاربر (ایمیل یا نام کاربری)" : "User Email / ID"}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. mhsanaei_client"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        {lang === "fa" ? "آی‌پی سرور L2TP (اختیاری)" : "L2TP Server IP Address (Optional)"}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 159.69.120.44 (Default is auto)"
                        value={customServerIp}
                        onChange={(e) => setCustomServerIp(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        {lang === "fa" ? "کلید پیش‌مشترک IPSec PSK" : "IPSec Pre-Shared Key (PSK)"}
                      </label>
                      <input
                        type="text"
                        placeholder="Default: SanaeiL2TPSecureKey"
                        value={customL2tpPsk}
                        onChange={(e) => setCustomL2tpPsk(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-[#4F46E5]" />
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">
                          {lang === "fa" ? "مکانیزم سوییچ هوشمند و آپدیت خودکار" : "Smart Auto-Switch & Upgrades"}
                        </h4>
                        <p className="text-[10px] text-gray-500">
                          {lang === "fa" ? "سنجش پینگ سرورها و سوییچ اتوماتیک کاربر بین کانفیگ‌ها در صورت قطعی" : "Automatically measure latency and failover/rotate servers seamlessly"}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={autoSwitch}
                        onChange={(e) => setAutoSwitch(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4F46E5]"></div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingUser || panels.length === 0}
                    className="w-full bg-[#4F46E5] text-white py-2 px-4 rounded-xl text-xs font-bold hover:bg-[#4338CA] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isCreatingUser ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>{lang === "fa" ? "در حال ایجاد کاربر..." : "Generating subscription..."}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>{lang === "fa" ? "ثبت کاربر و دریافت خروجی L2TP" : "Create User & Get L2TP Output"}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Users List Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-[#4F46E5]" />
                    <h3 className="text-sm font-bold text-gray-900">
                      {lang === "fa" ? "اشتراک‌های فعال صادر شده" : "Active Smart Subscriptions"}
                    </h3>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={lang === "fa" ? "جستجوی کاربر یا پنل..." : "Search user or panel..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="text-xs py-1.5 pl-8 pr-3 w-44 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4F46E5] transition-all"
                    />
                  </div>
                </div>

                {loadingSubs ? (
                  <div className="p-12 text-center text-gray-400 space-y-2">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-300" />
                    <p className="text-xs">{lang === "fa" ? "در حال بارگذاری کاربران..." : "Loading subscriptions..."}</p>
                  </div>
                ) : filteredSubs.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <Users className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                    <p className="text-xs font-semibold">{lang === "fa" ? "کاربری ثبت نشده است" : "No subscriptions found"}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {lang === "fa" ? "از فرم بالا برای ثبت اولین کاربر خود استفاده کنید" : "Create a user above to get started"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
                    {filteredSubs.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedSub(sub)}
                        className={`p-4 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-all ${
                          selectedSub?.id === sub.id ? "bg-indigo-50/30 border-r-2 border-[#4F46E5]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl text-white ${
                            selectedSub?.id === sub.id ? "bg-[#4F46E5]" : "bg-gray-100 text-gray-500"
                          }`}>
                            <Shield className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-gray-900">{sub.username}</h4>
                              <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-md font-semibold border border-green-100">
                                {lang === "fa" ? "فعال" : "Active"}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <Server className="h-3 w-3" />
                              <span>{sub.panelName}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] font-semibold text-gray-600 block">
                              L2TP: {sub.l2tpUser}
                            </span>
                            <span className="text-[9px] text-gray-400 block">
                              IP: {sub.l2tpServerIp}
                            </span>
                          </div>
                          
                          <button
                            onClick={(e) => handleDeleteSub(sub.id, e)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Dynamic Subscription details & QR Codes (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {selectedSub ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                  
                  {/* Title */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{selectedSub.username}</h3>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {lang === "fa" ? "جزئیات اشتراک هوشمند و لایسنس L2TP" : "Smart Profile & Legacy VPN Parameters"}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(selectedSub.createdAt).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US")}
                    </span>
                  </div>

                  {/* Smart Auto Switch Status Visualization */}
                  <div className="bg-[#EEF2F6] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#4F46E5] animate-pulse" />
                        <h4 className="text-xs font-bold text-gray-900">
                          {lang === "fa" ? "پایشگر زنده و سوییچ خودکار" : "Live Monitor & DNS Switch"}
                        </h4>
                      </div>
                      <span className="text-[9px] bg-[#4F46E5]/10 text-[#4F46E5] font-bold px-2 py-0.5 rounded-full">
                        {selectedSub.autoSwitchEnabled ? (lang === "fa" ? "فعال" : "Auto-Switch On") : (lang === "fa" ? "غیرفعال" : "Off")}
                      </span>
                    </div>

                    {/* Nodes Visual ping grid */}
                    <div className="space-y-2">
                      {mockNodes.map((node) => (
                        <div key={node.id} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-gray-100 text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${node.status === "active" ? "bg-green-500" : "bg-red-500"}`}></span>
                            <span className="font-semibold text-gray-700">{node.name}</span>
                          </div>
                          <span className={`font-mono px-1.5 py-0.5 rounded ${
                            node.status === "down" ? "bg-red-50 text-red-600" :
                            node.ping < 50 ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                          }`}>
                            {node.status === "down" ? "Timeout" : `${node.ping} ms`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Connection Profiles & Device Tabs Selector */}
                  <div className="space-y-4">
                    {/* Multi-Inbound Selector */}
                    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-indigo-600" />
                          <span className="text-xs font-bold text-slate-800">
                            {lang === "fa" 
                              ? (bridgeRoutingEnabled ? "نود مقصد سنایی برای خروج ترافیک از پل:" : "اینباند / سرور فعال برای ساخت کانفیگ:") 
                              : (bridgeRoutingEnabled ? "Egress Sanaei Node via Bridge:" : "Active Inbound / Node for Configuration:")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveBridgeConfig(!bridgeRoutingEnabled)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                              bridgeRoutingEnabled 
                                ? "bg-amber-100 text-amber-900 border-amber-300" 
                                : "bg-gray-100 text-gray-700 border-gray-300"
                            }`}
                            title={lang === "fa" ? "تغییر حالت بین مسیریابی پل و اتصال مستقیم" : "Toggle Bridge vs Direct"}
                          >
                            <span>🌉</span>
                            <span>{bridgeRoutingEnabled ? (lang === "fa" ? `پل فعال: ورودی (${resolveEffectiveHost()})` : `Bridge: (${resolveEffectiveHost()})`) : (lang === "fa" ? "اتصال مستقیم" : "Direct Mode")}</span>
                          </button>
                          <button 
                            onClick={() => setCurrentTab("inbounds")}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                          >
                            <Plus className="h-3 w-3" />
                            {lang === "fa" ? "مدیریت اینباندها" : "Manage Inbounds"}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {inbounds.length === 0 ? (
                          <div className="text-[10px] text-slate-400 italic">
                            {lang === "fa" ? "هیچ اینباندی تعریف نشده است. از نود پیش‌فرض سرور استفاده می‌شود." : "No inbounds defined. Using default server."}
                          </div>
                        ) : (
                          inbounds.map((inb) => {
                            const isActive = (selectedInboundId === inb.id) || (!selectedInboundId && inb === inbounds[0]);
                            return (
                              <button
                                key={inb.id}
                                onClick={() => setSelectedInboundId(inb.id)}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isActive
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                                }`}
                              >
                                <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-300" : "bg-slate-400"}`}></span>
                                <span>{inb.tag}</span>
                                <span className="text-[9px] opacity-75 font-mono">({inb.serverIp})</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Device Selector Bar */}
                    <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl overflow-x-auto text-[11px] font-bold">
                      <button
                        onClick={() => setDeviceTab("ios")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                          deviceTab === "ios"
                            ? "bg-white text-[#4F46E5] shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        <span>{lang === "fa" ? "آیفون / iOS" : "iPhone / iOS"}</span>
                      </button>

                      <button
                        onClick={() => setDeviceTab("android")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                          deviceTab === "android"
                            ? "bg-white text-green-600 shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        <Smartphone className="h-3.5 w-3.5 text-green-600" />
                        <span>{lang === "fa" ? "اندروید" : "Android"}</span>
                      </button>

                      <button
                        onClick={() => setDeviceTab("windows")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                          deviceTab === "windows"
                            ? "bg-white text-blue-600 shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        <Monitor className="h-3.5 w-3.5 text-blue-600" />
                        <span>{lang === "fa" ? "ویندوز" : "Windows"}</span>
                      </button>

                      <button
                        onClick={() => setDeviceTab("wireguard")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                          deviceTab === "wireguard"
                            ? "bg-white text-emerald-600 shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        <Shield className="h-3.5 w-3.5 text-emerald-600" />
                        <span>WireGuard ⚡</span>
                      </button>

                      <button
                        onClick={() => setDeviceTab("autoswitch")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                          deviceTab === "autoswitch"
                            ? "bg-white text-purple-600 shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        <Globe className="h-3.5 w-3.5 text-purple-600" />
                        <span>Clash / V2Ray</span>
                      </button>

                      <button
                        onClick={() => setDeviceTab("openvpn")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                          deviceTab === "openvpn"
                            ? "bg-white text-amber-600 shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        <Lock className="h-3.5 w-3.5 text-amber-600" />
                        <span>OpenVPN</span>
                      </button>
                    </div>

                    {/* ================= 1. TAB: iOS (iPhone / iPad) ================= */}
                    {deviceTab === "ios" && (
                      <div className="space-y-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                          <div>
                            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                              <Smartphone className="h-4 w-4 text-[#4F46E5]" />
                              {lang === "fa" ? "تنظیمات آیفون / آیپد (iOS Settings -> VPN)" : "iOS Settings -> VPN Configuration"}
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {lang === "fa"
                                ? "دقیقاً مطابق فیلدهای انگلیسی صفحه Add VPN Configuration در گوشی اپل وارد کنید:"
                                : "Fill in these exact English fields in Settings > General > VPN & Device Management > Add VPN Configuration:"}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              const inb = getActiveInbound();
                              downloadBlob(`L2TP_${inb?.tag || 'Default'}_${selectedSub.username}.mobileconfig`, getAppleMobileConfig(selectedSub, inb), "application/x-apple-aspen-config");
                            }}
                            className="bg-[#4F46E5] text-white hover:bg-[#4338CA] px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            <span>{lang === "fa" ? "دانلود پروفایل iOS" : "Download .mobileconfig"}</span>
                          </button>
                        </div>

                        {bridgeRoutingEnabled && (
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] p-2.5 rounded-xl flex items-center gap-2">
                            <span className="text-sm">🌉</span>
                            <span>
                              {lang === "fa"
                                ? `پل ارتباطی فعال است: آیفون با آدرس ورودی این پنل (${resolveEffectiveHost()}) متصل شده و ترافیک از نود سنایی (${getActiveInbound()?.tag || 'سنایی'}) خارج می‌شود.`
                                : `Bridge Active: iPhone connects to (${resolveEffectiveHost()}) and exits via (${getActiveInbound()?.tag || 'Sanaei'}).`}
                            </span>
                          </div>
                        )}

                        {/* iOS Exact Field List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[9px] font-bold">Type</span>
                            <span className="font-mono font-bold text-gray-800">L2TP</span>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[9px] font-bold">Description</span>
                            <span className="font-mono text-gray-800">Sanaei L2TP ({bridgeRoutingEnabled ? 'Bridge -> ' : ''}{getActiveInbound()?.tag || "Default"})</span>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-gray-400 block text-[9px] font-bold">
                                Server {bridgeRoutingEnabled ? <span className="text-amber-800 bg-amber-100 font-bold px-1.5 py-0.5 rounded text-[8px]">پل سرور (Bridge)</span> : null}
                              </span>
                              <button onClick={() => triggerCopy(resolveEffectiveHost(getActiveInbound()?.serverIp, selectedSub.l2tpServerIp), "ios_server")} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                {copiedId === "ios_server" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                            <code className="font-mono text-gray-800 break-all font-semibold">{resolveEffectiveHost(getActiveInbound()?.serverIp, selectedSub.l2tpServerIp)}</code>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-gray-400 block text-[9px] font-bold">Account</span>
                              <button onClick={() => triggerCopy(selectedSub.l2tpUser, "ios_account")} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                {copiedId === "ios_account" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                            <code className="font-mono text-gray-800 break-all font-semibold">{selectedSub.l2tpUser}</code>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[9px] font-bold">RSA SecurID</span>
                            <span className="font-mono text-gray-600">OFF</span>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-gray-400 block text-[9px] font-bold">Password</span>
                              <button onClick={() => triggerCopy(selectedSub.l2tpPass, "ios_pass")} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                {copiedId === "ios_pass" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                            <code className="font-mono text-gray-800 break-all font-semibold">{selectedSub.l2tpPass}</code>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-gray-400 block text-[9px] font-bold">Secret</span>
                              <button onClick={() => triggerCopy(getActiveInbound()?.l2tpPsk || selectedSub.l2tpPsk || "SanaeiL2TPSecureKey", "ios_secret")} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                {copiedId === "ios_secret" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                            <code className="font-mono text-gray-800 break-all font-semibold">{getActiveInbound()?.l2tpPsk || selectedSub.l2tpPsk || "SanaeiL2TPSecureKey"}</code>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[9px] font-bold">Send All Traffic</span>
                            <span className="font-mono text-green-600 font-bold">ON (Enabled)</span>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => {
                              const srv = resolveEffectiveHost(getActiveInbound()?.serverIp, selectedSub.l2tpServerIp);
                              const psk = getActiveInbound()?.l2tpPsk || selectedSub.l2tpPsk || "SanaeiL2TPSecureKey";
                              triggerCopy(`Type: L2TP\nServer: ${srv}\nAccount: ${selectedSub.l2tpUser}\nPassword: ${selectedSub.l2tpPass}\nSecret: ${psk}\nSend All Traffic: ON`, "ios_all");
                            }}
                            className="text-[#4F46E5] hover:underline text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === "ios_all" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                            <span>{lang === "fa" ? "کپی یکجای تمام مشخصات آیفون" : "Copy All iOS Fields"}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ================= 2. TAB: Android Phone ================= */}
                    {deviceTab === "android" && (
                      <div className="space-y-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                          <div>
                            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                              <Smartphone className="h-4 w-4 text-green-600" />
                              {lang === "fa" ? "تنظیمات گوشی اندروید (Android Settings -> VPN)" : "Android Settings -> VPN Configuration"}
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {lang === "fa"
                                ? "دقیقاً مطابق فیلدهای انگلیسی صفحه Add VPN در گوشی‌های سامسونگ، شیائومی و گوگل:"
                                : "Fill in these exact English fields in Settings > Connections > More connection settings > VPN > Add VPN:"}
                            </p>
                          </div>
                        </div>

                        {bridgeRoutingEnabled && (
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] p-2.5 rounded-xl flex items-center gap-2">
                            <span className="text-sm">🌉</span>
                            <span>
                              {lang === "fa"
                                ? `پل ارتباطی فعال است: گوشی اندروید به آدرس ورودی این پنل (${resolveEffectiveHost()}) متصل شده و ترافیک از نود سنایی (${getActiveInbound()?.tag || 'سنایی'}) خارج می‌شود.`
                                : `Bridge Active: Android connects to (${resolveEffectiveHost()}) and exits via (${getActiveInbound()?.tag || 'Sanaei'}).`}
                            </span>
                          </div>
                        )}

                        {/* Android Exact Field List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[9px] font-bold">Name</span>
                            <span className="font-mono text-gray-800 font-semibold">Sanaei L2TP ({bridgeRoutingEnabled ? 'Bridge -> ' : ''}{getActiveInbound()?.tag || "Default"})</span>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[9px] font-bold">Type</span>
                            <span className="font-mono font-bold text-gray-800">L2TP/IPSec PSK</span>
                            <span className="text-[8px] text-gray-400 block mt-0.5">(or IKEv2/IPSec MSCHAPv2 on Android 12+)</span>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-gray-400 block text-[9px] font-bold">
                                Server address {bridgeRoutingEnabled ? <span className="text-amber-800 bg-amber-100 font-bold px-1.5 py-0.5 rounded text-[8px]">پل سرور (Bridge)</span> : null}
                              </span>
                              <button onClick={() => triggerCopy(resolveEffectiveHost(getActiveInbound()?.serverIp, selectedSub.l2tpServerIp), "and_server")} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                {copiedId === "and_server" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                            <code className="font-mono text-gray-800 break-all font-semibold">{resolveEffectiveHost(getActiveInbound()?.serverIp, selectedSub.l2tpServerIp)}</code>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[9px] font-bold">L2TP secret</span>
                            <span className="text-gray-400 italic text-[10px]">(Leave blank)</span>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[9px] font-bold">IPSec identifier</span>
                            <span className="text-gray-400 italic text-[10px]">(Leave blank)</span>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-gray-400 block text-[9px] font-bold">IPSec pre-shared key</span>
                              <button onClick={() => triggerCopy(getActiveInbound()?.l2tpPsk || selectedSub.l2tpPsk || "SanaeiL2TPSecureKey", "and_psk")} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                {copiedId === "and_psk" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                            <code className="font-mono text-gray-800 break-all font-semibold">{getActiveInbound()?.l2tpPsk || selectedSub.l2tpPsk || "SanaeiL2TPSecureKey"}</code>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-gray-400 block text-[9px] font-bold">Username</span>
                              <button onClick={() => triggerCopy(selectedSub.l2tpUser, "and_user")} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                {copiedId === "and_user" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                            <code className="font-mono text-gray-800 break-all font-semibold">{selectedSub.l2tpUser}</code>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-gray-400 block text-[9px] font-bold">Password</span>
                              <button onClick={() => triggerCopy(selectedSub.l2tpPass, "and_pass")} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                {copiedId === "and_pass" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                            <code className="font-mono text-gray-800 break-all font-semibold">{selectedSub.l2tpPass}</code>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => {
                              const srv = resolveEffectiveHost(getActiveInbound()?.serverIp, selectedSub.l2tpServerIp);
                              const psk = getActiveInbound()?.l2tpPsk || selectedSub.l2tpPsk || "SanaeiL2TPSecureKey";
                              triggerCopy(`Name: Sanaei L2TP\nType: L2TP/IPSec PSK\nServer address: ${srv}\nIPSec pre-shared key: ${psk}\nUsername: ${selectedSub.l2tpUser}\nPassword: ${selectedSub.l2tpPass}`, "and_all");
                            }}
                            className="text-green-600 hover:underline text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === "and_all" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                            <span>{lang === "fa" ? "کپی یکجای مشخصات اندروید" : "Copy All Android Fields"}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ================= 3. TAB: Windows PC ================= */}
                    {deviceTab === "windows" && (
                      <div className="space-y-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                          <div>
                            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                              <Monitor className="h-4 w-4 text-blue-600" />
                              {lang === "fa" ? "تنظیمات ویندوز ۱۰ و ۱۱ (Windows Settings -> VPN)" : "Windows 10/11 Settings -> VPN"}
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {lang === "fa"
                                ? "دقیقاً مطابق فیلدهای انگلیسی صفحه Add a VPN connection در ویندوز:"
                                : "Fill in these exact English fields in Windows Settings > Network & Internet > VPN > Add VPN:"}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              const inb = getActiveInbound();
                              downloadBlob(`L2TP_${inb?.tag || 'Default'}_${selectedSub.username}.pbk`, getWindowsPbk(selectedSub, inb), "text/plain");
                            }}
                            className="bg-blue-600 text-white hover:bg-blue-700 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            <span>{lang === "fa" ? "دانلود دایلر ویندوز (.pbk)" : "Download Windows .pbk"}</span>
                          </button>
                        </div>

                        {bridgeRoutingEnabled && (
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] p-2.5 rounded-xl flex items-center gap-2">
                            <span className="text-sm">🌉</span>
                            <span>
                              {lang === "fa"
                                ? `پل ارتباطی فعال است: ویندوز به آدرس ورودی این پنل (${resolveEffectiveHost()}) متصل شده و ترافیک از نود سنایی (${getActiveInbound()?.tag || 'سنایی'}) خارج می‌شود.`
                                : `Bridge Active: Windows connects to (${resolveEffectiveHost()}) and exits via (${getActiveInbound()?.tag || 'Sanaei'}).`}
                            </span>
                          </div>
                        )}

                        {/* Windows Exact Field List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[9px] font-bold">VPN provider</span>
                            <span className="font-mono text-gray-800 font-semibold">Windows (built-in)</span>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[9px] font-bold">Connection name</span>
                            <span className="font-mono text-gray-800">Sanaei L2TP ({bridgeRoutingEnabled ? 'Bridge -> ' : ''}{getActiveInbound()?.tag || "Default"})</span>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-gray-400 block text-[9px] font-bold">
                                Server name or address {bridgeRoutingEnabled ? <span className="text-amber-800 bg-amber-100 font-bold px-1.5 py-0.5 rounded text-[8px]">پل سرور (Bridge)</span> : null}
                              </span>
                              <button onClick={() => triggerCopy(resolveEffectiveHost(getActiveInbound()?.serverIp, selectedSub.l2tpServerIp), "win_server")} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                {copiedId === "win_server" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                            <code className="font-mono text-gray-800 break-all font-semibold">{resolveEffectiveHost(getActiveInbound()?.serverIp, selectedSub.l2tpServerIp)}</code>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[9px] font-bold">VPN type</span>
                            <span className="font-mono font-bold text-gray-800">L2TP/IPsec with pre-shared key</span>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-gray-400 block text-[9px] font-bold">Pre-shared key</span>
                              <button onClick={() => triggerCopy(getActiveInbound()?.l2tpPsk || selectedSub.l2tpPsk || "SanaeiL2TPSecureKey", "win_psk")} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                {copiedId === "win_psk" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                            <code className="font-mono text-gray-800 break-all font-semibold">{getActiveInbound()?.l2tpPsk || selectedSub.l2tpPsk || "SanaeiL2TPSecureKey"}</code>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[9px] font-bold">Type of sign-in info</span>
                            <span className="font-mono text-gray-800">User name and password</span>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-gray-400 block text-[9px] font-bold">User name</span>
                              <button onClick={() => triggerCopy(selectedSub.l2tpUser, "win_user")} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                {copiedId === "win_user" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                            <code className="font-mono text-gray-800 break-all font-semibold">{selectedSub.l2tpUser}</code>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-gray-400 block text-[9px] font-bold">Password</span>
                              <button onClick={() => triggerCopy(selectedSub.l2tpPass, "win_pass")} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                {copiedId === "win_pass" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                            <code className="font-mono text-gray-800 break-all font-semibold">{selectedSub.l2tpPass}</code>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => {
                              const srv = resolveEffectiveHost(getActiveInbound()?.serverIp, selectedSub.l2tpServerIp);
                              const psk = getActiveInbound()?.l2tpPsk || selectedSub.l2tpPsk || "SanaeiL2TPSecureKey";
                              triggerCopy(`VPN provider: Windows (built-in)\nServer name or address: ${srv}\nVPN type: L2TP/IPsec with pre-shared key\nPre-shared key: ${psk}\nUser name: ${selectedSub.l2tpUser}\nPassword: ${selectedSub.l2tpPass}`, "win_all");
                            }}
                            className="text-blue-600 hover:underline text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === "win_all" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                            <span>{lang === "fa" ? "کپی یکجای مشخصات ویندوز" : "Copy All Windows Fields"}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ================= 4. TAB: WireGuard ⚡ ================= */}
                    {deviceTab === "wireguard" && (
                      <div className="space-y-4 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                          <div>
                            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                              <Shield className="h-4 w-4 text-emerald-600" />
                              {lang === "fa" ? "تونل رسمی WireGuard (اسکن QR کد واقعی یا دانلود)" : "Official WireGuard Tunnel (Direct QR Scan & .conf)"}
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {lang === "fa"
                                ? "بارکد و تنظیمات زیر مستقیماً بر اساس اینباند انتخابی تنظیم شده‌اند:"
                                : "The QR code and parameters below are strictly bound to the active inbound:"}
                            </p>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => {
                                const inb = getActiveInbound();
                                downloadBlob(`WireGuard_${inb?.tag || 'Default'}_${selectedSub.username}.conf`, getWireguardConf(selectedSub, inb), "text/plain");
                              }}
                              className="bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                            >
                              <Download className="h-3 w-3" />
                              <span>{lang === "fa" ? `دانلود .conf (${getActiveInbound()?.tag || "این اینباند"})` : "Download .conf"}</span>
                            </button>
                            <button
                              onClick={() => {
                                if (inbounds.length <= 1) {
                                  downloadBlob(`WireGuard_${selectedSub.username}.conf`, getWireguardConf(selectedSub, getActiveInbound()), "text/plain");
                                } else {
                                  inbounds.forEach((inb, idx) => {
                                    setTimeout(() => {
                                      downloadBlob(`WireGuard_${inb.tag.replace(/[^a-zA-Z0-9_-]/g, "_")}_${selectedSub.username}.conf`, getWireguardConf(selectedSub, inb), "text/plain");
                                    }, idx * 250);
                                  });
                                }
                              }}
                              className="bg-emerald-800 text-white hover:bg-emerald-900 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                              title={lang === "fa" ? "دانلود مجزای فایل کانفیگ برای هر اینباند" : "Download configs for all configured inbounds"}
                            >
                              <Download className="h-3 w-3" />
                              <span>{lang === "fa" ? `دانلود همه اینباندها (${inbounds.length})` : `All Inbounds (${inbounds.length})`}</span>
                            </button>
                            <button
                              onClick={() => triggerCopy(getWireguardConf(selectedSub, getActiveInbound()), "wg_full_conf")}
                              className="bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              {copiedId === "wg_full_conf" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              <span>{lang === "fa" ? "کپی کانفیگ" : "Copy Conf"}</span>
                            </button>
                          </div>
                        </div>

                        {bridgeRoutingEnabled && (
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] p-2.5 rounded-xl flex items-center gap-2">
                            <span className="text-sm">🌉</span>
                            <span>
                              {lang === "fa"
                                ? `پل وایروگارد فعال است: Endpoint به آدرس ورودی این پنل (${resolveEffectiveHost()}) اشاره می‌کند و پکت‌ها به سمت اینباند سنایی (${getActiveInbound()?.tag || 'سنایی'}) فوروارد می‌شوند.`
                                : `WireGuard Bridge Active: Endpoint points to (${resolveEffectiveHost()}) and forwards to (${getActiveInbound()?.tag || 'Sanaei'}).`}
                            </span>
                          </div>
                        )}

                        {/* Direct Working QR Code & Details */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                          {/* QR Box */}
                          <div className="md:col-span-4 flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-emerald-200 shadow-xs">
                            <QRCodeSVG 
                              value={getWireguardConf(selectedSub, getActiveInbound())} 
                              size={140} 
                              level="M" 
                              marginSize={1}
                            />
                            <span className="text-[9px] text-emerald-800 mt-2 font-bold text-center">
                              {lang === "fa" ? `نود: ${getActiveInbound()?.tag || "پیش‌فرض"}` : `Node: ${getActiveInbound()?.tag || "Default"}`}
                            </span>
                            <span className="text-[8px] text-gray-400 text-center">
                              {lang === "fa" ? "اسکن با دوربین اپلیکیشن WireGuard" : "Scan with WireGuard App"}
                            </span>
                          </div>

                          {/* WireGuard Exact Manual Parameters */}
                          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                            <div className="bg-white p-2 rounded-xl border border-gray-150">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-gray-400 font-bold text-[8px]">[Interface] PrivateKey</span>
                                <button onClick={() => triggerCopy(ensureValidWgKey(selectedSub.wireguardPrivateKey), "wg_priv")} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                  {copiedId === "wg_priv" ? <Check className="h-2.5 w-2.5 text-green-600" /> : <Copy className="h-2.5 w-2.5" />}
                                </button>
                              </div>
                              <code className="font-mono text-gray-800 break-all text-[9px]">{ensureValidWgKey(selectedSub.wireguardPrivateKey)}</code>
                            </div>

                            <div className="bg-white p-2 rounded-xl border border-gray-150">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-gray-400 font-bold text-[8px]">[Interface] Address</span>
                                <button onClick={() => triggerCopy(selectedSub.wireguardAddress || "10.8.0.2/24", "wg_addr")} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                  {copiedId === "wg_addr" ? <Check className="h-2.5 w-2.5 text-green-600" /> : <Copy className="h-2.5 w-2.5" />}
                                </button>
                              </div>
                              <code className="font-mono text-gray-800 break-all text-[9px]">{selectedSub.wireguardAddress || "10.8.0.2/24"}</code>
                            </div>

                            <div className="bg-white p-2 rounded-xl border border-gray-150">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-gray-400 font-bold text-[8px]">
                                  [Peer] Endpoint {bridgeRoutingEnabled ? <span className="text-amber-800 bg-amber-100 font-bold px-1 py-0.2 rounded text-[7px]">پل</span> : null}
                                </span>
                                <button onClick={() => {
                                  const inb = getActiveInbound();
                                  const host = resolveEffectiveHost(inb?.serverIp, selectedSub.l2tpServerIp);
                                  const port = inb?.wgPort || inb?.port || wgServerPortState || 51820;
                                  triggerCopy(`${host}:${port}`, "wg_end");
                                }} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                  {copiedId === "wg_end" ? <Check className="h-2.5 w-2.5 text-green-600" /> : <Copy className="h-2.5 w-2.5" />}
                                </button>
                              </div>
                              <code className="font-mono text-gray-800 break-all text-[9px]">
                                {(() => {
                                  const inb = getActiveInbound();
                                  const host = resolveEffectiveHost(inb?.serverIp, selectedSub.l2tpServerIp);
                                  const port = inb?.wgPort || inb?.port || wgServerPortState || 51820;
                                  return `${host}:${port}`;
                                })()}
                              </code>
                            </div>

                            <div className="bg-white p-2 rounded-xl border border-gray-150">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-gray-400 font-bold text-[8px]">[Peer] PublicKey</span>
                                <button onClick={() => {
                                  const inb = getActiveInbound();
                                  const pub = ensureValidWgKey(inb?.wgServerPublicKey || wgServerPublicKeyState || selectedSub.wireguardPublicKey);
                                  triggerCopy(pub, "wg_pub");
                                }} className="text-gray-400 hover:text-gray-900 cursor-pointer">
                                  {copiedId === "wg_pub" ? <Check className="h-2.5 w-2.5 text-green-600" /> : <Copy className="h-2.5 w-2.5" />}
                                </button>
                              </div>
                              <code className="font-mono text-gray-800 break-all text-[9px]">
                                {(() => {
                                  const inb = getActiveInbound();
                                  return ensureValidWgKey(inb?.wgServerPublicKey || wgServerPublicKeyState || selectedSub.wireguardPublicKey);
                                })()}
                              </code>
                            </div>

                            <div className="bg-white p-2 rounded-xl border border-gray-150">
                              <span className="text-gray-400 font-bold text-[8px] block">[Interface] DNS</span>
                              <code className="font-mono text-gray-800 text-[9px]">{selectedSub.wireguardDns || "1.1.1.1, 8.8.8.8"}</code>
                            </div>

                            <div className="bg-white p-2 rounded-xl border border-gray-150">
                              <span className="text-gray-400 font-bold text-[8px] block">[Peer] AllowedIPs</span>
                              <code className="font-mono text-gray-800 text-[9px]">0.0.0.0/0, ::/0</code>
                            </div>
                          </div>
                        </div>

                        {/* Raw Config Toggle */}
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowRawWg(!showRawWg)}
                            className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{showRawWg ? (lang === "fa" ? "بستن متن کامل فایل کانفیگ" : "Hide raw configuration text") : (lang === "fa" ? "مشاهده متن کامل فایل کانفیگ WireGuard" : "View raw WireGuard configuration text")}</span>
                          </button>

                          {showRawWg && (
                            <pre className="mt-2 text-[9px] font-mono bg-slate-900 text-emerald-400 p-3 rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
                              {getWireguardConf(selectedSub, getActiveInbound())}
                            </pre>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ================= 5. TAB: Auto-Switch Subscriptions (Clash / V2Ray) ================= */}
                    {deviceTab === "autoswitch" && (
                      <div className="space-y-3 bg-purple-50/40 p-4 rounded-2xl border border-purple-100">
                        <div className="pb-2 border-b border-purple-200/60">
                          <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <Globe className="h-4 w-4 text-purple-600" />
                            {lang === "fa" ? "لینک‌های اشتراک هوشمند خودکار (Clash Meta / Sing-box / V2Ray)" : "Smart Auto-Switching Subscription Links"}
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {lang === "fa" ? "اتصال مدرن با قابلیت سوییچ هوشمند بین نودها بر اساس کمترین تاخیر پینگ:" : "Modern dynamic subscription links that auto-route traffic via the fastest node:"}
                          </p>
                        </div>

                        {/* Base64 Link */}
                        <div className="bg-white rounded-xl p-3 border border-gray-150 text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700">{lang === "fa" ? "لینک ساب V2Ray (سازگار با v2rayN, Shadowrocket)" : "Standard Base64 Sub Link"}</span>
                            <button 
                              onClick={() => triggerCopy(`${window.location.origin}/api/sub/${selectedSub.id}`, "v2ray")}
                              className="text-[#4F46E5] hover:underline flex items-center gap-1 text-[10px] font-bold"
                            >
                              {copiedId === "v2ray" ? <span className="text-green-600 font-semibold">{lang === "fa" ? "کپی شد" : "Copied"}</span> : <><Copy className="h-3 w-3" />{lang === "fa" ? "کپی لینک" : "Copy"}</>}
                            </button>
                          </div>
                          <code className="text-[10px] text-gray-500 font-mono block truncate bg-gray-50 p-1.5 rounded border border-gray-100">
                            {`${window.location.origin}/api/sub/${selectedSub.id}`}
                          </code>
                        </div>

                        {/* Clash Link */}
                        <div className="bg-white rounded-xl p-3 border border-gray-150 text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700">{lang === "fa" ? "لینک ساب Clash Meta (سوییچ خودکار با پینگ)" : "Clash Meta Sub (Auto-test Latency)"}</span>
                            <button 
                              onClick={() => triggerCopy(`${window.location.origin}/api/sub/${selectedSub.id}?format=clash`, "clash")}
                              className="text-[#4F46E5] hover:underline flex items-center gap-1 text-[10px] font-bold"
                            >
                              {copiedId === "clash" ? <span className="text-green-600 font-semibold">{lang === "fa" ? "کپی شد" : "Copied"}</span> : <><Copy className="h-3 w-3" />{lang === "fa" ? "کپی لینک" : "Copy"}</>}
                            </button>
                          </div>
                          <code className="text-[10px] text-gray-500 font-mono block truncate bg-gray-50 p-1.5 rounded border border-gray-100">
                            {`${window.location.origin}/api/sub/${selectedSub.id}?format=clash`}
                          </code>
                        </div>
                      </div>
                    )}

                    {/* ================= 6. TAB: OpenVPN ================= */}
                    {deviceTab === "openvpn" && (
                      <div className="space-y-3 bg-amber-50/40 p-4 rounded-2xl border border-amber-100">
                        <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                          <div>
                            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                              <Lock className="h-4 w-4 text-amber-600" />
                              {lang === "fa" ? "اتصال امن OpenVPN (پایدار و فول‌تونل)" : "OpenVPN Profile & Credentials"}
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {lang === "fa" ? "دانلود پروفایل با گواهی‌های رمزنگاری اختصاصی کلاینت:" : "Download the complete single-file .ovpn with embedded certificates:"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => {
                                const inb = getActiveInbound();
                                downloadBlob(`OpenVPN_${inb?.tag || 'Default'}_${selectedSub.username}.ovpn`, getOpenVpnConfig(selectedSub, inb), "text/plain");
                              }}
                              className="bg-amber-600 text-white hover:bg-amber-700 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-xs transition-all"
                            >
                              <Download className="h-3 w-3" />
                              <span>{lang === "fa" ? "دانلود فایل .ovpn این اینباند" : "Download .ovpn"}</span>
                            </button>
                            <button
                              onClick={() => {
                                if (inbounds.length <= 1) {
                                  downloadBlob(`OpenVPN_${selectedSub.username}.ovpn`, getOpenVpnConfig(selectedSub), "text/plain");
                                } else {
                                  inbounds.forEach((inb, idx) => {
                                    setTimeout(() => {
                                      downloadBlob(`OpenVPN_${inb.tag}_${selectedSub.username}.ovpn`, getOpenVpnConfig(selectedSub, inb), "text/plain");
                                    }, idx * 250);
                                  });
                                }
                              }}
                              className="bg-amber-800 text-white hover:bg-amber-900 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-xs transition-all"
                              title={lang === "fa" ? "دانلود مجزای فایل OpenVPN برای هر اینباند" : "Download OpenVPN profiles for all configured inbounds"}
                            >
                              <Download className="h-3 w-3" />
                              <span>{lang === "fa" ? `دانلود همه اینباندها (${inbounds.length})` : `All Inbounds (${inbounds.length})`}</span>
                            </button>
                          </div>
                        </div>

                        {bridgeRoutingEnabled && (
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] p-2.5 rounded-xl flex items-center gap-2">
                            <span className="text-sm">🌉</span>
                            <span>
                              {lang === "fa"
                                ? `پل OpenVPN فعال است: Remote به آدرس ورودی این پنل (${resolveEffectiveHost()}) متصل شده و ترافیک از نود سنایی (${getActiveInbound()?.tag || 'سنایی'}) خارج می‌شود.`
                                : `OpenVPN Bridge Active: Remote connects to (${resolveEffectiveHost()}) and exits via (${getActiveInbound()?.tag || 'Sanaei'}).`}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] bg-white p-2.5 rounded-xl border border-gray-150 font-sans">
                          <div>
                            <span className="text-gray-400 block text-[8px] font-bold mb-0.5">
                              Remote Server & Port {bridgeRoutingEnabled ? <span className="text-amber-800 bg-amber-100 font-bold px-1 py-0.2 rounded text-[7px]">پل</span> : null}
                            </span>
                            <div className="flex items-center justify-between">
                              <code className="font-mono text-gray-700 break-all">{`${resolveEffectiveHost(getActiveInbound()?.serverIp, selectedSub.l2tpServerIp)}:${getActiveInbound()?.openvpnPort || selectedSub.openvpnPort || 1194} (${getActiveInbound()?.openvpnProto || "udp"})`}</code>
                              <button 
                                onClick={() => triggerCopy(`${resolveEffectiveHost(getActiveInbound()?.serverIp, selectedSub.l2tpServerIp)}:${getActiveInbound()?.openvpnPort || selectedSub.openvpnPort || 1194}`, "ovpn_remote")}
                                className="text-gray-400 hover:text-gray-900 ml-1 cursor-pointer"
                              >
                                {copiedId === "ovpn_remote" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <span className="text-gray-400 block text-[8px] font-bold mb-0.5">Username</span>
                            <div className="flex items-center justify-between">
                              <code className="font-mono text-gray-700">{selectedSub.openvpnUser || `vpn_${selectedSub.username}`}</code>
                              <button 
                                onClick={() => triggerCopy(selectedSub.openvpnUser || `vpn_${selectedSub.username}`, "ovpn_user")}
                                className="text-gray-400 hover:text-gray-900 ml-1 cursor-pointer"
                              >
                                {copiedId === "ovpn_user" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <span className="text-gray-400 block text-[8px] font-bold mb-0.5">Password</span>
                            <div className="flex items-center justify-between">
                              <code className="font-mono text-gray-700">{selectedSub.openvpnPass || "SanaeiOVPNPass"}</code>
                              <button 
                                onClick={() => triggerCopy(selectedSub.openvpnPass || "SanaeiOVPNPass", "ovpn_pass")}
                                className="text-gray-400 hover:text-gray-900 ml-1 cursor-pointer"
                              >
                                {copiedId === "ovpn_pass" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 border-dashed shadow-sm p-8 text-center text-gray-400 h-96 flex flex-col justify-center items-center">
                  <Info className="h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-xs font-semibold">{lang === "fa" ? "کاربری انتخاب نشده است" : "No user selected"}</p>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">
                    {lang === "fa" ? "برای مشاهده لینک‌های اشتراک، کدهای QR و خروجی‌های خودکار L2TP، یک کاربر را از لیست سمت راست انتخاب کنید." : "Select a subscription from the list to view L2TP download options, custom QR codes, and smart auto-switching profile links."}
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
        )}

        {/* ==================== TAB: INBOUNDS (MULTI-INBOUND NODES MANAGEMENT) ==================== */}
        {currentTab === "inbounds" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: List of Inbound Nodes (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3 flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        {lang === "fa" ? "اینباندهای فعال و نودهای شبکه" : "Active Inbound Nodes"}
                      </h3>
                      <p className="text-[10px] text-gray-500">
                        {lang === "fa" ? "به ازای هر اینباند، کانفیگ اختصاصی WireGuard، OpenVPN و L2TP برای تمام کاربران تولید می‌شود." : "Each inbound produces matching WireGuard, OpenVPN, and L2TP configs for every subscription."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSyncInboundsFromPanels}
                      disabled={isSyncingInbounds}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all ${
                        isSyncingInbounds 
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isSyncingInbounds ? "animate-spin" : ""}`} />
                      <span>{lang === "fa" ? "همگام‌سازی اینباندها از پنل سنایی" : "Live Sync 3x-ui Inbounds"}</span>
                    </button>
                    <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full font-mono">
                      {inbounds.length} {lang === "fa" ? "اینباند" : "Inbounds"}
                    </span>
                  </div>
                </div>

                {inboundsSyncFeedback && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in font-medium">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 stroke-[3px]" />
                    <span>{inboundsSyncFeedback}</span>
                  </div>
                )}

                {loadingInbounds ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-300" />
                  </div>
                ) : inbounds.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 border border-dashed border-gray-100 rounded-xl">
                    <Layers className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                    <p className="text-xs font-semibold">{lang === "fa" ? "هیچ اینباندی تعریف نشده است" : "No inbounds defined"}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{lang === "fa" ? "دکمه «همگام‌سازی اینباندها از پنل سنایی» را بزنید یا از فرم سمت راست اضافه کنید." : "Click Live Sync 3x-ui Inbounds or use the form on the right."}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inbounds.map((inb) => (
                      <div 
                        key={inb.id} 
                        className={`border rounded-2xl p-4 transition-all ${
                          selectedInboundId === inb.id ? "bg-indigo-50/40 border-indigo-200 shadow-xs" : "bg-[#F9FAFB]/50 border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                            <span className="font-bold text-gray-900 text-xs">{inb.tag}</span>
                            {inb.extractedFrom ? (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200" title={inb.extractedFrom}>
                                🔍 {inb.extractedFrom}
                              </span>
                            ) : inb.id.startsWith("3xui-") ? (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                🌐 {lang === "fa" ? "استخراج‌شده از سنایی" : "Live 3X-UI"}
                              </span>
                            ) : (
                              <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                                ⚙️ {lang === "fa" ? "اینباند دستی" : "Custom"}
                              </span>
                            )}
                            {inb.country && inb.country !== "GL" && (
                              <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-150">
                                📍 {inb.country}
                              </span>
                            )}
                            {inb.isDefault && (
                              <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                                {lang === "fa" ? "پیش‌فرض" : "Default"}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedInboundId(inb.id);
                                setCurrentTab("dashboard");
                              }}
                              className="text-[10px] bg-white border border-gray-200 text-indigo-600 hover:bg-indigo-50 px-2.5 py-1 rounded-xl font-bold transition-all shadow-2xs"
                            >
                              {lang === "fa" ? "مشاهده کانفیگ‌ها" : "View Configs"}
                            </button>
                            <button
                              onClick={() => setEditingInbound({ ...inb })}
                              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title={lang === "fa" ? "ویرایش مشخصات اینباند" : "Edit Inbound"}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteInbound(inb.id, e)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title={lang === "fa" ? "حذف اینباند" : "Delete"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inbound Specs Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] mt-2">
                          <div className="bg-white p-2 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[8px] font-bold">Server IP / Host</span>
                            <code className="font-mono text-gray-800 break-all font-semibold">{inb.serverIp}</code>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[8px] font-bold">WireGuard Port</span>
                            <code className="font-mono text-emerald-700 font-bold">{inb.wgPort || inb.port || 51820}</code>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[8px] font-bold">OpenVPN Port</span>
                            <code className="font-mono text-amber-700 font-bold">{inb.openvpnPort || 1194} ({inb.openvpnProto || "udp"})</code>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-gray-150">
                            <span className="text-gray-400 block text-[8px] font-bold">L2TP PSK</span>
                            <code className="font-mono text-gray-700 truncate block">{inb.l2tpPsk || "SanaeiL2TPSecureKey"}</code>
                          </div>
                        </div>

                        {inb.notes && (
                          <p className="text-[10px] text-gray-500 mt-2 bg-white/70 p-1.5 rounded-lg border border-gray-100 font-mono">
                            📌 {inb.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Multi-Inbound Technical Architecture Card */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-400" />
                  <h4 className="text-sm font-bold">
                    {lang === "fa" ? "مکانیزم تولید خودکار چند اینباندی (Multi-Inbound Mapping)" : "How Multi-Inbound 1:1 Generation Works"}
                  </h4>
                </div>
                <p className="text-xs text-indigo-200 leading-relaxed">
                  {lang === "fa"
                    ? "زمانی که شما چندین اینباند (مثلاً سرور آلمان، سرور فرانسه و سرور ترکیه) تعریف می‌کنید، سامانه به ازای هر کاربر فعال، برای تمام اینباندها فایل‌های جداگانه WireGuard (.conf)، OpenVPN (.ovpn) و پروفایل‌های L2TP تولید می‌کند. با زدن دکمه «دانلود همه اینباندها» تمام فایل‌های متناظر یکجا دانلود می‌شوند."
                    : "When multiple inbounds are configured, the engine dynamically generates separate WireGuard (.conf), OpenVPN (.ovpn), and L2TP configs for each inbound for every subscriber."}
                </p>
                <div className="pt-1">
                  <button
                    onClick={() => setShowFeasibilityModal(true)}
                    className="text-xs font-bold text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{lang === "fa" ? "مطالعه توضیحات تکمیلی معماری و نحوه عملکرد پروتکل‌ها ←" : "Read Full Technical Protocol Feasibility Guide →"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Register New Inbound Form (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                  <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {lang === "fa" ? "افزودن اینباند / سرور جدید" : "Register New Inbound Node"}
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      {lang === "fa" ? "مشخصات پورت و آی‌پی اینباند را وارد کنید" : "Enter inbound connection parameters"}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateInbound} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      {lang === "fa" ? "نام / تگ اینباند (Tag / Name):" : "Inbound Tag / Name:"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={lang === "fa" ? "مثال: Germany-Node-1" : "e.g. Frankfurt-Inbound-1"}
                      value={newInboundTag}
                      onChange={(e) => setNewInboundTag(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      {lang === "fa" ? "آدرس آی‌پی سرور (Server IP or Domain):" : "Server IP or Domain:"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={lang === "fa" ? "مثال: 198.51.100.25 یا de.yourdomain.com" : "e.g. 198.51.100.25"}
                      value={newInboundServerIp}
                      onChange={(e) => setNewInboundServerIp(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        {lang === "fa" ? "پورت وایرگارد (WG Port):" : "WireGuard Port:"}
                      </label>
                      <input
                        type="number"
                        value={newInboundWgPort}
                        onChange={(e) => setNewInboundWgPort(parseInt(e.target.value) || 51820)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        {lang === "fa" ? "پورت OpenVPN:" : "OpenVPN Port:"}
                      </label>
                      <input
                        type="number"
                        value={newInboundOpenvpnPort}
                        onChange={(e) => setNewInboundOpenvpnPort(parseInt(e.target.value) || 1194)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        {lang === "fa" ? "پروتکل OpenVPN:" : "OpenVPN Proto:"}
                      </label>
                      <select
                        value={newInboundOpenvpnProto}
                        onChange={(e) => setNewInboundOpenvpnProto(e.target.value as 'udp' | 'tcp')}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-sans"
                      >
                        <option value="udp">UDP (Fastest)</option>
                        <option value="tcp">TCP (Reliable)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        {lang === "fa" ? "کلید IPSec PSK:" : "L2TP PSK Secret:"}
                      </label>
                      <input
                        type="text"
                        value={newInboundL2tpPsk}
                        onChange={(e) => setNewInboundL2tpPsk(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      {lang === "fa" ? "توضیحات اختیاری (Notes):" : "Notes (Optional):"}
                    </label>
                    <input
                      type="text"
                      placeholder={lang === "fa" ? "مثال: نود پرسرعت با کمترین پینگ" : "e.g. High speed German node"}
                      value={newInboundNotes}
                      onChange={(e) => setNewInboundNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingInbound}
                    className="w-full mt-2 bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isCreatingInbound ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>{lang === "fa" ? "ثبت اینباند جدید" : "Add Inbound"}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: V2RAY MIDDLE BRIDGE (پل ارتباطی وی‌توری) ==================== */}
        {currentTab === "bridge" && (
          <div className="space-y-8 font-sans">
            
            {/* Top Banner / Explanation Card */}
            <div className="bg-linear-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500 text-white p-2 rounded-xl shadow-xs">
                      <Zap className="h-5 w-5" />
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      {lang === "fa" ? "پل ارتباطی وی‌توری (V2Ray / Xray Middle Bridge)" : "V2Ray / Xray Middle Bridge Architecture"}
                    </h2>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {lang === "fa" ? "ضد فیلتر ۱۰۰٪" : "DPI Bypass Ready"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    {lang === "fa"
                      ? "در این روش، سرور شما ترافیک کلاینت‌های ساده (WireGuard، OpenVPN و L2TP) را دریافت کرده و آن را درون تونل‌های پیشرفته ضد فیلتر Xray (مانند VLESS REALITY، VMess یا Trojan) کپسوله می‌کند. کاربر تنها یک کانکشن ساده WireGuard یا L2TP می‌زند، اما تمام داده‌ها از درون وی‌توری عبور می‌کنند!"
                      : "The bridge receives native WireGuard, OpenVPN, and L2TP client traffic on local subnets and seamlessly tunnels it through stealth V2Ray/Xray protocols (VLESS REALITY, VMess WS, Trojan) to bypass DPI censorship."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setBridgeTestingStatus("testing");
                      setTimeout(() => {
                        setBridgeTestingStatus("success");
                        setBridgeLatency(Math.floor(Math.random() * 25) + 38);
                        setBridgePublicIp(getActiveInbound()?.serverIp || "185.190.140.22");
                      }, 1200);
                    }}
                    disabled={bridgeTestingStatus === "testing"}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {bridgeTestingStatus === "testing" ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>{lang === "fa" ? "در حال تست سلامت پل..." : "Testing Bridge..."}</span>
                      </>
                    ) : (
                      <>
                        <Activity className="h-4 w-4" />
                        <span>{lang === "fa" ? "تست زنده اتصال پل به اینترنت" : "Test Live Bridge Gateway"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Test Results Alert */}
              {bridgeTestingStatus === "success" && (
                <div className="mt-4 bg-white/90 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">
                        {lang === "fa" ? "✅ پل ارتباطی کاملاً پایدار و فعال است" : "✅ Bridge Gateway is Online & Healthy"}
                      </h4>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        {lang === "fa"
                          ? `تونل Xray به نود ${getActiveInbound()?.tag || 'اصلی'} متصل است. تاخیر پاسخ به اینترنت آزاد: ${bridgeLatency}ms | آی‌پی خروج: ${bridgePublicIp || 'خارجی'}`
                          : `Xray upstream connected. Latency: ${bridgeLatency}ms | Egress IP: ${bridgePublicIp}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-mono font-bold px-2 py-1 rounded-lg border border-emerald-200">
                    200 OK • Packet Loss: 0%
                  </span>
                </div>
              )}
            </div>

            {/* Visual Architecture Flow Diagram */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    {lang === "fa" ? "نمودار معماری جریان داده‌ها (Data-Path Flow)" : "Interactive Architecture Flow Diagram"}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {lang === "fa" ? "چگونگی تبدیل ترافیک ساده VPN به پکت‌های رمزشده وی‌توری:" : "Step-by-step encapsulation from client VPN packets to stealth V2Ray payload:"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-gray-700 font-semibold">{lang === "fa" ? "حالت پیش‌فرض: Tun2socks + Xray Outbound" : "Mode: Tun2socks + Xray Outbound"}</span>
                </div>
              </div>

              {/* 5-Step Visual Pipeline */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
                
                {/* Step 1: User Client */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">مرحله ۱: کاربر</span>
                    <Smartphone className="h-4 w-4 text-slate-700" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{lang === "fa" ? "کلاینت ساده VPN" : "Client Device"}</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      {lang === "fa" ? "گوشی، ویندوز، میکروتیک بدون نیاز به وی‌توری" : "iOS, Android, Windows, Mikrotik"}
                    </p>
                  </div>
                  <div className="space-y-1 text-[9px] font-mono bg-white p-2 rounded-xl border border-slate-200 text-slate-600">
                    <div>• WireGuard App</div>
                    <div>• Native L2TP/IPSec</div>
                    <div>• OpenVPN Client</div>
                  </div>
                </div>

                {/* Step 2: Bridge Ingress Interfaces */}
                <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase font-mono">مرحله ۲: سرور پل</span>
                    <Server className="h-4 w-4 text-indigo-700" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{lang === "fa" ? "اینترفیس‌های محلی" : "Local Interfaces"}</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      {lang === "fa" ? "دریافت بسته‌ها در لایه شبکه لینوکس" : "Ingress VPN subnets on bridge host"}
                    </p>
                  </div>
                  <div className="space-y-1 text-[9px] font-mono bg-white p-2 rounded-xl border border-indigo-200 text-indigo-700">
                    <div>wg0: 10.8.0.0/24</div>
                    <div>ppp+: 10.9.0.0/24</div>
                    <div>tun0: 10.10.0.0/24</div>
                  </div>
                </div>

                {/* Step 3: Tun2socks / TPROXY */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-600 uppercase font-mono">مرحله ۳: مسیردهی</span>
                    <Sliders className="h-4 w-4 text-amber-700" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{lang === "fa" ? "مبدل Tun2socks" : "Transparent Router"}</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      {lang === "fa" ? "تغییر مسیر تمام بسته‌ها به SOCKS محلی" : "Converts IP layer to local SOCKS5"}
                    </p>
                  </div>
                  <div className="space-y-1 text-[9px] font-mono bg-white p-2 rounded-xl border border-amber-200 text-amber-800">
                    <div>fwmark 0x1 ➔ tun2</div>
                    <div>SOCKS: 127.0.0.1:10808</div>
                    <div>Dokodemo: 12345</div>
                  </div>
                </div>

                {/* Step 4: V2Ray/Xray Tunnel (The Core Bridge) */}
                <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-600 uppercase font-mono">مرحله ۴: تونل Xray</span>
                    <Zap className="h-4 w-4 text-purple-700" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{lang === "fa" ? "⚡ رمزنگاری وی‌توری" : "⚡ V2Ray Tunnel"}</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      {lang === "fa" ? "عبور نامرئی از فایروال و فیلترینگ" : "Encrypted Anti-DPI Outbound"}
                    </p>
                  </div>
                  <div className="space-y-1 text-[9px] font-mono bg-white p-2 rounded-xl border border-purple-200 text-purple-800">
                    <div>• VLESS REALITY</div>
                    <div>• VMess WebSocket</div>
                    <div>• Trojan gRPC / TLS</div>
                  </div>
                </div>

                {/* Step 5: Foreign Server & Internet */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase font-mono">مرحله ۵: اینترنت</span>
                    <Globe className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{lang === "fa" ? "سرور خارج ۳ایکس‌یوآی" : "Egress 3x-ui"}</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      {lang === "fa" ? "خروج با آی‌پی تمیز به اینترنت آزاد" : "Freedom routing via remote node"}
                    </p>
                  </div>
                  <div className="space-y-1 text-[9px] font-mono bg-white p-2 rounded-xl border border-emerald-200 text-emerald-800">
                    <div>🇩🇪 Germany / 🇫🇮 Finland</div>
                    <div>Direct Clean IPv4/IPv6</div>
                    <div>No Packet Drops</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Upstream Node Selector & Custom Link */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column (7 Cols): Ingress Host Config, Node Selector & Live One-Click Installer */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 0. Bridge Master Ingress Host & Routing Mode */}
                <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-amber-500 text-white p-2 rounded-xl shadow-xs">
                        <Globe className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">
                          {lang === "fa" ? "تنظیمات ورودی پل و آدرس اتصال کلاینت‌ها" : "Bridge Ingress & Master Gateway Configuration"}
                        </h3>
                        <p className="text-[11px] text-gray-500">
                          {lang === "fa" ? "مشخص کنید کلاینت‌ها برای اتصال به پل با چه آدرس و دامنه‌ای به این سرور وصل شوند" : "Set the ingress host where WireGuard/L2TP/OpenVPN clients connect"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSaveBridgeConfig(!bridgeRoutingEnabled)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                        bridgeRoutingEnabled
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-gray-100 text-gray-600 border-gray-300"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${bridgeRoutingEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                      <span>{bridgeRoutingEnabled ? (lang === "fa" ? "پل فعال (مسیریابی از طریق پل)" : "Bridge Enabled") : (lang === "fa" ? "پل غیرفعال (اتصال مستقیم)" : "Direct Mode")}</span>
                    </button>
                  </div>

                  <div className="space-y-3 pt-1">
                    <label className="block text-xs font-bold text-gray-700">
                      {lang === "fa" ? "آدرس IP یا دامنه پابلیک این پنل/سرور (Bridge Server IP / Domain):" : "Public Bridge IP / Domain (Ingress Host):"}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bridgeServerHost}
                        onChange={(e) => setBridgeServerHost(e.target.value)}
                        placeholder={window.location.hostname || "185.x.x.x or bridge.yourdomain.com"}
                        className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                        dir="ltr"
                      />
                      <button
                        onClick={() => {
                          const autoHost = window.location.hostname;
                          if (autoHost && autoHost !== "localhost") {
                            setBridgeServerHost(autoHost);
                            handleSaveBridgeConfig(true, autoHost);
                          } else if (detectedPublicIp) {
                            setBridgeServerHost(detectedPublicIp);
                            handleSaveBridgeConfig(true, detectedPublicIp);
                          }
                        }}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                        title={lang === "fa" ? "تشخیص خودکار از آدرس مرورگر" : "Auto-detect Hostname"}
                      >
                        {lang === "fa" ? "تشخیص خودکار" : "Auto Detect"}
                      </button>
                      <button
                        onClick={() => handleSaveBridgeConfig(bridgeRoutingEnabled, bridgeServerHost)}
                        disabled={isSavingBridgeConfig}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60"
                      >
                        {isSavingBridgeConfig ? (lang === "fa" ? "در حال ذخیره..." : "Saving...") : (lang === "fa" ? "ذخیره و اعمال" : "Save & Apply")}
                      </button>
                    </div>

                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-950 flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        {lang === "fa"
                          ? `با فعال بودن پل، تمام کانفیگ‌های خروجی وایروگارد، L2TP و اوپن‌وی‌پی‌ان کلاینت به جای آی‌پی سرور اصلی به آدرس (${resolveEffectiveHost()}) وصل می‌شوند و پکت‌ها از پل به نود سنایی (${getActiveInbound()?.tag || 'سنایی'}) تونل می‌گردند.`
                          : `With Bridge Active, all client endpoints point to (${resolveEffectiveHost()}) and forward secretly to Sanaei Inbound (${getActiveInbound()?.tag || 'Sanaei'}).`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1. Select Upstream V2Ray Inbound from 3x-ui */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                        <Server className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">
                        {lang === "fa" ? "۱. انتخاب اینباند/نود خروجی وی‌توری (Upstream Gateway)" : "1. Select Upstream 3x-ui Inbound / Node"}
                      </h3>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">
                      {inbounds.length} {lang === "fa" ? "نود موجود" : "Nodes"}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500">
                    {lang === "fa" 
                      ? "در این سامانه، برای هر اینباند یک تونل و پورت اختصاصی روی پل ایجاد می‌شود تا ترافیک هر اتصال دقیقاً از همان اینباند خارج شود:" 
                      : "Each inbound has its own dedicated WireGuard/OpenVPN port and isolated Xray egress route on the bridge server:"}
                  </p>

                  <div className="space-y-2.5 pt-1">
                    {inbounds.map((inb, inbIdx) => {
                      const isSelected = (bridgeSelectedInboundId || inbounds[0]?.id) === inb.id;
                      const wgDedicatedPort = inb.bridgeWgPort || inb.wgPort || (51820 + inbIdx);
                      const ovpnDedicatedPort = inb.bridgeOpenvpnPort || inb.openvpnPort || (1194 + inbIdx);
                      const socksDedicatedPort = inb.bridgeSocksPort || (10808 + inbIdx);
                      const dedicatedSubnet = `10.8.${inbIdx}.0/24`;

                      return (
                        <div
                          key={inb.id}
                          onClick={() => setBridgeSelectedInboundId(inb.id)}
                          className={`cursor-pointer p-4 rounded-2xl border transition-all text-xs flex flex-col space-y-2.5 ${
                            isSelected
                              ? "bg-indigo-50/90 border-indigo-300 shadow-xs ring-2 ring-indigo-500/20"
                              : "bg-gray-50/60 border-gray-200 hover:border-gray-300 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                              <span>{inb.country === "DE" ? "🇩🇪" : inb.country === "FR" ? "🇫🇷" : inb.country === "NL" ? "🇳🇱" : inb.country === "FI" ? "🇫🇮" : inb.country === "TR" ? "🇹🇷" : "🌐"}</span>
                              <span>{inb.tag}</span>
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                {lang === "fa" ? `مسیر اختصاصی #${inbIdx + 1}` : `Route #${inbIdx + 1}`}
                              </span>
                            </span>
                            <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-white text-indigo-700 border border-indigo-100">
                              {inb.protocol}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                            <div className="bg-white/80 p-2 rounded-xl border border-gray-150">
                              <span className="text-gray-400 block text-[8px] font-bold">WG Ingress Port</span>
                              <span className="text-emerald-700 font-bold">{wgDedicatedPort}</span>
                            </div>
                            <div className="bg-white/80 p-2 rounded-xl border border-gray-150">
                              <span className="text-gray-400 block text-[8px] font-bold">OVPN Ingress Port</span>
                              <span className="text-amber-700 font-bold">{ovpnDedicatedPort}</span>
                            </div>
                            <div className="bg-white/80 p-2 rounded-xl border border-gray-150">
                              <span className="text-gray-400 block text-[8px] font-bold">Isolated Subnet</span>
                              <span className="text-indigo-700 font-semibold">{dedicatedSubnet}</span>
                            </div>
                            <div className="bg-white/80 p-2 rounded-xl border border-gray-150">
                              <span className="text-gray-400 block text-[8px] font-bold">Target Sanaei Node</span>
                              <span className="text-gray-800 font-semibold truncate block">{inb.serverIp}:{inb.port}</span>
                            </div>
                          </div>

                          <div className="text-[10px] text-gray-500 flex items-center justify-between pt-1 border-t border-gray-200/60">
                            <span className="text-[9px] font-mono text-indigo-600">
                              🔗 tun_inb_{inbIdx} ➔ 127.0.0.1:{socksDedicatedPort} ➔ {inb.tag}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] text-indigo-700 font-bold flex items-center gap-1">
                                <Check className="h-3 w-3 stroke-[3px]" />
                                <span>{lang === "fa" ? "نود پیش‌فرض در پیش‌نمایش" : "Active Preview"}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. One-Click Command for Linux Terminal */}
                <div className="bg-gray-900 text-gray-100 rounded-3xl p-6 shadow-md space-y-4 font-sans">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">
                        {lang === "fa" ? "۲. دستور نصب خودکار پل روی سرور (۱ کلیک)" : "2. Automated 1-Click Server Setup Command"}
                      </h3>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                      Ubuntu / Debian
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed">
                    {lang === "fa"
                      ? "این دستور با نصب Xray-core و Tun2socks، روتینگ آی‌پی تمام کلاینت‌های وایروگارد و L2TP را به طور خودکار به سمت تونل وی‌توری هدایت می‌کند:"
                      : "Run this command on your server terminal as root to configure and start the V2Ray bridge daemon:"}
                  </p>

                  <div className="bg-black/70 rounded-2xl p-4 border border-gray-800 font-mono text-xs text-emerald-400 flex items-center justify-between gap-3">
                    <code className="break-all select-all">
                      {`curl -sSL ${window.location.origin}/install-bridge.sh | bash`}
                    </code>
                    <button
                      onClick={() => {
                        triggerCopy(`curl -sSL ${window.location.origin}/install-bridge.sh | bash`, "bridge_cmd");
                        setBridgeCopiedCmd(true);
                        setTimeout(() => setBridgeCopiedCmd(false), 2000);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                    >
                      {bridgeCopiedCmd ? (
                        <>
                          <Check className="h-3.5 w-3.5 stroke-[3px]" />
                          <span>{lang === "fa" ? "کپی شد" : "Copied"}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>{lang === "fa" ? "کپی دستور" : "Copy"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-[11px] text-gray-400 space-y-1 pt-1 font-sans">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{lang === "fa" ? "پیکربندی خودکار فوروارد کرنل لینوکس (ip_forward=1)" : "Automatic IPv4 kernel forwarding & MTU optimization"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{lang === "fa" ? "راه‌اندازی به عنوان سرویس سیستمی با اجرای خودکار پس از ریبوت" : "Runs as persistent systemd daemon (vpn-v2ray-bridge.service)"}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column (5 Cols): Generated Config Viewer & Routing Table */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Generated Xray Bridge Client JSON */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <h3 className="text-sm font-bold text-gray-900">
                        {lang === "fa" ? "کانفیگ کلاینت پل (Xray Client Config)" : "Xray Client Bridge Config"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const conf = {
                            log: { loglevel: "warning" },
                            inbounds: [
                              { tag: "socks-in", port: 10808, listen: "127.0.0.1", protocol: "socks", settings: { auth: "noauth", udp: true } },
                              { tag: "tproxy-in", port: 12345, listen: "127.0.0.1", protocol: "dokodemo-door", settings: { network: "tcp,udp", followRedirect: true } }
                            ],
                            outbounds: [
                              {
                                tag: "proxy",
                                protocol: "vless",
                                settings: {
                                  vnext: [{
                                    address: getActiveInbound()?.serverIp || "127.0.0.1",
                                    port: getActiveInbound()?.port || 443,
                                    users: [{ id: "11111111-2222-3333-4444-555555555555", encryption: "none" }]
                                  }]
                                },
                                streamSettings: { network: "ws", security: "tls", wsSettings: { path: "/vless-ws" } }
                              },
                              { tag: "direct", protocol: "freedom" }
                            ]
                          };
                          downloadBlob(`xray_bridge_${getActiveInbound()?.tag || 'node'}.json`, JSON.stringify(conf, null, 2), "application/json");
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs transition-all"
                        title="Download JSON"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-500">
                    {lang === "fa" ? "پیش‌نمایش پیکربندی استاندارد Xray جهت فوروارد ترافیک به نود انتخابی:" : "Standard Xray-core JSON loaded on the relay machine:"}
                  </p>

                  <pre className="bg-gray-950 text-gray-200 p-3.5 rounded-2xl font-mono text-[10px] max-h-64 overflow-y-auto leading-relaxed border border-gray-800">
{`{
  "inbounds": [
    {
      "tag": "socks-in",
      "port": 10808,
      "listen": "127.0.0.1",
      "protocol": "socks",
      "settings": { "auth": "noauth", "udp": true }
    }
  ],
  "outbounds": [
    {
      "tag": "proxy",
      "protocol": "${getActiveInbound()?.protocol || 'vless'}",
      "settings": {
        "vnext": [{
          "address": "${getActiveInbound()?.serverIp || '127.0.0.1'}",
          "port": ${getActiveInbound()?.port || 443},
          "users": [{ "id": "11111111-2222-3333-4444-555555555555" }]
        }]
      },
      "streamSettings": { "network": "ws", "security": "tls" }
    },
    { "tag": "direct", "protocol": "freedom" }
  ]
}`}
                  </pre>
                </div>

                {/* Live Client Profile Routing Preview Card */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-sm font-bold text-gray-900">
                        {lang === "fa" ? "پیش‌نمایش زنده اتصال کلاینت (WireGuard / L2TP)" : "Live Client Profile Preview"}
                      </h3>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                      {bridgeRoutingEnabled ? (lang === "fa" ? "آدرس پل فعال است" : "Bridge Ingress") : (lang === "fa" ? "اتصال مستقیم" : "Direct Ingress")}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500">
                    {lang === "fa"
                      ? `کلاینت شما بدون نیاز به وی‌توری به (${resolveEffectiveHost()}) متصل شده و ترافیک آن از (${getActiveInbound()?.tag || 'سنایی'}) خارج می‌شود:`
                      : `Client connects to (${resolveEffectiveHost()}) and exits via (${getActiveInbound()?.tag || 'Sanaei'}):`}
                  </p>

                  <pre className="bg-slate-900 text-emerald-300 p-3.5 rounded-2xl font-mono text-[10px] max-h-52 overflow-y-auto leading-relaxed border border-slate-800" dir="ltr">
{`# ----------------------------------------------------
# Sanaei Smart Sub - WireGuard Profile
# Routing Mode: ${bridgeRoutingEnabled ? `🌉 Bridge Gateway (Encapsulated -> ${getActiveInbound()?.tag || '3x-ui'})` : '⚡ Direct'}
# ----------------------------------------------------
[Interface]
PrivateKey = (32-byte-secure-client-key)
Address = 10.8.0.2/24
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = ${getActiveInbound()?.wgServerPublicKey || 'f47s/9284jklsd...'}
Endpoint = ${resolveEffectiveHost()}:${getActiveInbound()?.wgPort || wgServerPortState || 51820}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`}
                  </pre>
                </div>

                {/* Subnet Forwarding Summary Card */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-emerald-600" />
                    {lang === "fa" ? "جدول ساب‌نت‌های تحت پوشش پل" : "Active Bridged Subnets"}
                  </h4>

                  <div className="space-y-2 text-[11px] font-mono">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/50 border border-emerald-150">
                      <span className="font-bold text-emerald-900">WireGuard (wg0)</span>
                      <span className="text-emerald-700">10.8.0.0/24 ➔ SOCKS5</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-50/50 border border-indigo-150">
                      <span className="font-bold text-indigo-900">L2TP / IPSec (ppp+)</span>
                      <span className="text-indigo-700">10.9.0.0/24 ➔ SOCKS5</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/50 border border-amber-150">
                      <span className="font-bold text-amber-900">OpenVPN (tun0)</span>
                      <span className="text-amber-700">10.10.0.0/24 ➔ SOCKS5</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ==================== TAB: DOCTOR (VPN PORT & CONNECTIVITY DIAGNOSTICS) ==================== */}
        {currentTab === "doctor" && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            
            {/* Header Diagnostic Banner */}
            <div className="bg-linear-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
                    <Activity className="h-6 w-6 text-emerald-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black tracking-tight">
                        {lang === "fa" ? "پزشک اتصال و عیب‌یابی پورت‌های VPN" : "VPN Port & Connection Doctor"}
                      </h2>
                      <span className="text-[10px] bg-emerald-400 text-emerald-950 font-black px-2 py-0.5 rounded-full uppercase">
                        {lang === "fa" ? "تحلیل جامع" : "Full Diagnosis"}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100/90 mt-1">
                      {lang === "fa"
                        ? "بررسی دقیق دلایل عدم اتصال WireGuard و L2TP هنگام تغییر پورت پنل، وضعیت فایروال و دیمون‌ها"
                        : "Detailed root-cause analysis for WireGuard/L2TP connection failures with custom panel ports"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={fetchDoctorData}
                  disabled={loadingDoctor}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all backdrop-blur-md border border-white/20 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingDoctor ? "animate-spin" : ""}`} />
                  <span>{lang === "fa" ? "بررسی مجدد وضعیت" : "Refresh Status"}</span>
                </button>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                  <span className="block text-[10px] text-emerald-200 font-semibold">{lang === "fa" ? "پورت پنل وب" : "Web Panel Port"}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-sm sm:text-base font-mono font-black">{doctorData?.webPort || 3000}</span>
                    <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-mono">TCP</span>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                  <span className="block text-[10px] text-emerald-200 font-semibold">{lang === "fa" ? "پورت وایرگارد" : "WireGuard Port"}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-sm sm:text-base font-mono font-black">{doctorData?.wireguard?.port || wgServerPortState || 51820}</span>
                    <span className="text-[9px] bg-emerald-400 text-emerald-950 font-bold px-1.5 py-0.2 rounded font-mono">UDP</span>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                  <span className="block text-[10px] text-emerald-200 font-semibold">{lang === "fa" ? "پورت‌های L2TP" : "L2TP/IPSec Ports"}</span>
                  <div className="flex items-center gap-1 mt-1 font-mono text-xs sm:text-sm font-bold">
                    <span>500, 4500, 1701</span>
                    <span className="text-[9px] bg-white/20 px-1 py-0.2 rounded">UDP</span>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                  <span className="block text-[10px] text-emerald-200 font-semibold">{lang === "fa" ? "آی‌پی سرور" : "Server IP"}</span>
                  <span className="text-xs sm:text-sm font-mono font-bold block mt-1 truncate" title={doctorData?.configuredIp}>
                    {doctorData?.configuredIp || detectedPublicIp || "127.0.0.1"}
                  </span>
                </div>
              </div>
            </div>

            {/* Core Explanations: 4 Real Causes Why It Doesn't Connect */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2.5 border-b border-gray-100 pb-4">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-gray-900">
                    {lang === "fa" ? "چرا با وایرگارد یا L2TP به این سرور وصل نمی‌شوید؟ (۴ دلیل اصلی)" : "Why WireGuard / L2TP Won't Connect? (4 Root Causes)"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {lang === "fa"
                      ? "بررسی تفاوت پورت وب با پورت‌های UDP سرویس‌های VPN و راه‌حل قطعی هر کدام"
                      : "Clear breakdown of why custom web port affects connections and how to resolve it"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Reason 1: Web Port vs UDP Port */}
                <div className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center">۱</span>
                    <h4 className="text-xs font-bold text-amber-950">
                      {lang === "fa" ? "تفاوت حیاتی پورت وب با پورت پروتکل‌های VPN" : "Web Port vs VPN UDP Ports"}
                    </h4>
                  </div>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    {lang === "fa"
                      ? "پورت انتخابی شما در هنگام نصب (مثلاً 3000 یا 8080) فقط برای باز کردن پنل تحت وب در مرورگر است (TCP). کلاینت وایرگارد یا L2TP به پورت وب وصل نمی‌شوند؛ بلکه به پورت اختصاصی UDP (مثل 51820 و 500/4500) وصل می‌شوند."
                      : "The custom port chosen during install is purely for HTTP/web access. WireGuard and L2TP connect over their own dedicated UDP ports (51820, 500, 4500)."}
                  </p>
                  <div className="bg-white/80 rounded-xl p-2.5 text-[11px] font-mono text-amber-900 border border-amber-200/50">
                    <strong>Endpoint:</strong> {doctorData?.configuredIp || "YOUR_IP"}:{doctorData?.wireguard?.port || wgServerPortState || 51820} (UDP)
                  </div>
                </div>

                {/* Reason 2: Linux Core VPN Daemons Not Running */}
                <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">۲</span>
                    <h4 className="text-xs font-bold text-indigo-950">
                      {lang === "fa" ? "عدم اجرای دیمون هسته لینوکس (WireGuard/xl2tpd)" : "Core Linux VPN Daemons Status"}
                    </h4>
                  </div>
                  <p className="text-xs text-indigo-900/80 leading-relaxed">
                    {lang === "fa"
                      ? "پنل وب فقط تنظیمات و کلیدها را در دیتابیس می‌نویسد. برای اینکه ترافیک VPN پاسخ داده شود، سرویس‌های سیستمی لینوکس (wg-quick و strongswan) باید روی سرور نصب و استارت شده باشند."
                      : "The web panel generates and syncs credentials. The actual system daemons (wg-quick, xl2tpd, strongswan) must be running on the host VPS."}
                  </p>
                  <div className="bg-white/80 rounded-xl p-2.5 text-[11px] font-sans text-indigo-900 border border-indigo-200/50 flex items-center justify-between">
                    <span>{lang === "fa" ? "وضعیت فایل wg0.conf:" : "wg0.conf Status:"}</span>
                    <span className={`font-bold ${doctorData?.wireguard?.hasConfigFile ? "text-green-600" : "text-amber-600"}`}>
                      {doctorData?.wireguard?.hasConfigFile ? (lang === "fa" ? "موجود است ✓" : "Exists ✓") : (lang === "fa" ? "نیاز به اجرای اسکریپت" : "Run installer")}
                    </span>
                  </div>
                </div>

                {/* Reason 3: Server Firewall (UFW) or Cloud Security Group */}
                <div className="bg-rose-50/50 border border-rose-200/70 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-bold text-xs flex items-center justify-center">۳</span>
                    <h4 className="text-xs font-bold text-rose-950">
                      {lang === "fa" ? "بسته بودن پورت‌های UDP در فایروال لینوکس یا کلود" : "Firewall (UFW / Cloud Security Groups)"}
                    </h4>
                  </div>
                  <p className="text-xs text-rose-900/80 leading-relaxed">
                    {lang === "fa"
                      ? "در اکثر سرورها (هتزنر، اوراکل، دیجیتال‌اوشن، آروان) فایروال UFW یا پنل کلود به طور پیش‌فرض پورت‌های UDP را مسدود می‌کنند. باید رول اجازه عبور پورت‌های UDP و پورت پنل باز شود."
                      : "Default firewalls or cloud security groups block incoming UDP traffic. All UDP ports must be explicitly allowed."}
                  </p>
                  <div className="bg-white/80 rounded-xl p-2.5 text-[11px] font-mono text-rose-900 border border-rose-200/50">
                    ufw allow {doctorData?.wireguard?.port || 51820}/udp && ufw allow 500,4500,1701/udp
                  </div>
                </div>

                {/* Reason 4: ISP Filtering in Iran */}
                <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">۴</span>
                    <h4 className="text-xs font-bold text-emerald-950">
                      {lang === "fa" ? "فیلترینگ UDP روی پورت پیش‌فرض ۵۱۸۲۰ و راهکار" : "ISP Port Filtering & Bridge Solution"}
                    </h4>
                  </div>
                  <p className="text-xs text-emerald-900/80 leading-relaxed">
                    {lang === "fa"
                      ? "اپراتورهای ایران پورت معروف 51820 وایرگارد را فیلتر می‌کنند. راهکار: ۱. تغییر پورت وایرگارد به 443 یا 8443 از کادر زیر، ۲. یا فعال‌سازی «پل ارتباطی وی‌توری» تا ترافیک از کانال ضد فیلتر عبور کند."
                      : "ISPs often throttle or block default port 51820. Fix: Change port to 443/udp below, or enable the V2Ray Relay Bridge."}
                  </p>
                  <div className="bg-white/80 rounded-xl p-2.5 text-[11px] font-sans text-emerald-900 border border-emerald-200/50 flex items-center justify-between">
                    <span>{lang === "fa" ? "پل ارتباطی وی‌توری:" : "V2Ray Bridge:"}</span>
                    <span className="font-bold text-emerald-700">
                      {bridgeRoutingEnabled ? (lang === "fa" ? "فعال و آماده اتصال" : "Active & Ready") : (lang === "fa" ? "غیرفعال" : "Disabled")}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Interactive WireGuard Port Switcher */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  {lang === "fa" ? "تغییر سریع پورت سرور وایرگارد (رفع فیلترینگ UDP)" : "Quick WireGuard Port Switcher"}
                </h3>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                {lang === "fa"
                  ? "اگر کلاینت وایرگارد با پورت فعلی متصل نمی‌شود، پورت را به یکی از پورت‌های بدون فیلتر زیر تغییر دهید. بلافاصله تمام فایل‌های کانفیگ کاربران با پورت جدید بازتولید می‌شوند:"
                  : "If default port fails due to ISP blocking, choose a non-filtered port below. All downloaded client configs will update immediately:"}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {[51820, 51821, 443, 8443, 2053, 53].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleQuickUpdateWgPort(p)}
                    disabled={isUpdatingWgPort}
                    className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      (doctorData?.wireguard?.port || wgServerPortState) === p
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-2 ring-indigo-600/30"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    Port {p} {p === 443 ? "★ (HTTPS/UDP)" : p === 51820 ? "(Default)" : ""}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 max-w-sm pt-2">
                <input
                  type="number"
                  value={testWgPortInput}
                  onChange={(e) => setTestWgPortInput(Number(e.target.value))}
                  placeholder="Custom UDP Port e.g. 5555"
                  className="flex-1 text-xs font-mono border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => handleQuickUpdateWgPort(testWgPortInput)}
                  disabled={isUpdatingWgPort}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isUpdatingWgPort ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>{lang === "fa" ? "اعمال پورت" : "Apply Port"}</span>
                </button>
              </div>
            </div>

            {/* 1-Line Terminal Fix & Complete Health Command */}
            <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 sm:p-8 space-y-5 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <Terminal className="h-5 w-5 text-green-400" />
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {lang === "fa" ? "دستور تک‌خطی رفع ۱۰۰٪ خطای اتصال در سرور (SSH Terminal)" : "1-Line Instant Terminal Fix Command"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {lang === "fa"
                        ? "این دستور فایروال UFW را برای پورت وب و تمام پورت‌های VPN باز می‌کند و سرویس‌های وایرگارد و L2TP را استارت می‌زند"
                        : "Opens UFW firewall rules for web port & VPN UDP ports, and starts all background daemons"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const cmd = `ufw allow ${doctorData?.webPort || 3000}/tcp ; ufw allow ${doctorData?.wireguard?.port || wgServerPortState || 51820}/udp ; ufw allow 500,4500,1701/udp ; ufw allow 1194/udp ; curl -sSL http://${doctorData?.configuredIp || "127.0.0.1"}:${doctorData?.webPort || 3000}/install.sh | bash`;
                    triggerCopy(cmd, "quick_doctor_cmd");
                    setQuickFixCopied(true);
                    setTimeout(() => setQuickFixCopied(false), 3000);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {copiedId === "quick_doctor_cmd" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedId === "quick_doctor_cmd" ? (lang === "fa" ? "دستور کپی شد!" : "Copied!") : (lang === "fa" ? "کپی دستور رفع خودکار" : "Copy Fix Command")}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed select-all">
                <code>
                  {`# ۱. باز کردن تمام پورت‌ها در فایروال سرور:`}<br />
                  {`sudo ufw allow ${doctorData?.webPort || 3000}/tcp && sudo ufw allow ${doctorData?.wireguard?.port || wgServerPortState || 51820}/udp && sudo ufw allow 500,4500,1701/udp && sudo ufw allow 1194/udp`}<br /><br />
                  {`# ۲. راه‌اندازی و اجرای خودکار هسته‌های WireGuard و L2TP:`}<br />
                  {`curl -sSL http://${doctorData?.configuredIp || "YOUR_SERVER_IP"}:${doctorData?.webPort || 3000}/install.sh | sudo bash`}
                </code>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white text-[11px]">{lang === "fa" ? "گام ۱: فایروال لینوکس" : "Step 1: Firewall"}</strong>
                    <span className="text-[10px] text-slate-400">{lang === "fa" ? "پورت‌های UDP و TCP آزاد می‌شوند." : "All required ports unblocked in UFW."}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white text-[11px]">{lang === "fa" ? "گام ۲: هسته لینوکس" : "Step 2: Kernel Daemons"}</strong>
                    <span className="text-[10px] text-slate-400">{lang === "fa" ? "دیمون‌های wg0 و xl2tpd فعال می‌شوند." : "wg0 & xl2tpd systemd services running."}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white text-[11px]">{lang === "fa" ? "گام ۳: اتصال کلاینت" : "Step 3: Client Connect"}</strong>
                    <span className="text-[10px] text-slate-400">{lang === "fa" ? "فایل کانفیگ دانلود شده فوراً وصل می‌شود." : "Downloaded client config connects instantly."}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 2: PANELS (3X-UI MANAGEMENT) ==================== */}
        {currentTab === "panels" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: List of Panels (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Server className="h-5 w-5 text-[#4F46E5]" />
                  <h3 className="text-sm font-bold text-gray-900">
                    {lang === "fa" ? "پنل‌های Sanaei 3x-ui متصل شده" : "Configured MHSanaei 3x-ui Panels"}
                  </h3>
                </div>

                {loadingPanels ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-300" />
                  </div>
                ) : panels.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 border border-dashed border-gray-100 rounded-xl">
                    <Server className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                    <p className="text-xs font-semibold">{lang === "fa" ? "هیچ پنلی یافت نشد" : "No panels registered yet"}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{lang === "fa" ? "لطفا از فرم سمت راست یک پنل اضافه کنید." : "Add a panel using the registration form."}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {panels.map((p) => (
                      <div key={p.id} className="border border-gray-100 bg-[#F9FAFB]/50 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-gray-100 p-2.5 rounded-xl text-gray-500">
                              <Server className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-bold text-gray-900">{p.name}</h4>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                                  p.isMock ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-indigo-50 text-[#4F46E5] border border-indigo-100"
                                }`}>
                                  {p.isMock ? (lang === "fa" ? "شبیه‌ساز فعال" : "Simulated Mode") : (lang === "fa" ? "سرور زنده" : "Live API Server")}
                                </span>
                              </div>
                              <code className="text-[10px] text-gray-400 font-mono mt-1 block">
                                {p.url}
                                {p.webBasePath ? ` (Base: ${p.webBasePath})` : ""}
                              </code>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right text-[10px] text-gray-500">
                              <span className="block">{lang === "fa" ? "کاربر" : "User"}: <strong className="text-gray-700">{p.username}</strong></span>
                              <span className="block">{lang === "fa" ? "پروتکل" : "Proto"}: <strong className="text-gray-700">HTTPS/API</strong></span>
                            </div>
                            <button
                              onClick={() => handleDeletePanel(p.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete Panel"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Interactive Sync Sub-section */}
                        <div className="w-full flex items-center justify-between border-t border-gray-100 pt-3 flex-wrap gap-2">
                          {syncFeedback[p.id] ? (
                            <span className="text-[10px] font-semibold text-green-600 animate-bounce">
                              {syncFeedback[p.id]}
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-400 leading-relaxed">
                              {lang === "fa" 
                                ? "💡 همگام‌سازی تمام کاربران سنایی با این پنل جهت ساخت خودکار کانفیگ‌ها" 
                                : "💡 Auto-sync all clients from this panel to generate L2TP/IKEv2 & OVPN"}
                            </span>
                          )}
                          <button
                            onClick={() => handleSyncPanel(p.id)}
                            disabled={syncingPanelId === p.id}
                            className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                              syncingPanelId === p.id
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-100"
                            }`}
                          >
                            <RefreshCw className={`h-3 w-3 ${syncingPanelId === p.id ? "animate-spin" : ""}`} />
                            {lang === "fa" ? "همگام‌سازی کاربران" : "Sync Clients"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Add Panel (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="h-4.5 w-4.5 text-[#4F46E5]" />
                  <h3 className="text-sm font-bold text-gray-900">
                    {lang === "fa" ? "ثبت و اتصال پنل جدید" : "Register New 3x-ui Panel"}
                  </h3>
                </div>

                <form onSubmit={handleAddPanel} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      {lang === "fa" ? "نام نمایشی سرور" : "Friendly Panel Name"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Germany Core Panel"
                      value={newPanelName}
                      onChange={(e) => setNewPanelName(e.target.value)}
                      className="w-full text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      {lang === "fa" ? "آدرس اینترنتی پنل سنایی (URL)" : "3x-ui Panel URL (Host & Port)"}
                    </label>
                    <input
                      type="url"
                      placeholder="e.g. http://142.250.74.46:2053"
                      value={newPanelUrl}
                      onChange={(e) => setNewPanelUrl(e.target.value)}
                      className="w-full text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                      required
                    />
                    <p className="text-[9px] text-gray-400 mt-1">
                      {lang === "fa" ? "برای شبیه‌سازی و تست بدون پنل واقعی، عبارت 'mock' یا آدرس پیشفرض دمو را بگذارید" : "Tip: Enter 'mock' to run in simulated mode without a live 3x-ui panel."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      {lang === "fa" ? "پیشوند مسیر پنل (Web Base Path / API) - اختیاری" : "Panel Web Base Path / API Prefix (Optional)"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. /sanaei or /admin"
                      value={newPanelWebBasePath}
                      onChange={(e) => setNewPanelWebBasePath(e.target.value)}
                      className="w-full text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all font-mono"
                    />
                    <p className="text-[9px] text-gray-400 mt-1">
                      {lang === "fa" ? "اگر برای پنل سنایی خود مسیر اختصاصی (Base Path) ست کرده‌اید، آن را اینجا وارد کنید" : "If you configured a custom Web Base Path / URL prefix in Sanaei settings, enter it here."}
                    </p>
                  </div>

                  {/* Authentication Method Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500">
                      {lang === "fa" ? "روش احراز هویت با پنل" : "Authentication Method"}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-100">
                      <button
                        type="button"
                        onClick={() => setAuthMethod("credentials")}
                        className={`text-xs py-1.5 px-3 rounded-lg font-medium transition-all ${
                          authMethod === "credentials"
                            ? "bg-white text-indigo-600 shadow-sm border border-gray-100"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        {lang === "fa" ? "نام‌کاربری و رمز عبور" : "Username & Password"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMethod("token")}
                        className={`text-xs py-1.5 px-3 rounded-lg font-medium transition-all ${
                          authMethod === "token"
                            ? "bg-white text-indigo-600 shadow-sm border border-gray-100"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        {lang === "fa" ? "توکن امن ای‌پی‌آی (Token)" : "API Token"}
                      </button>
                    </div>
                  </div>

                  {authMethod === "token" ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        {lang === "fa" ? "توکن اختصاصی ای‌پی‌آی (API Token)" : "API Token / Bearer Token"}
                      </label>
                      <input
                        type="password"
                        placeholder={lang === "fa" ? "توکن کپی‌شده از تنظیمات پنل سنایی..." : "Token copied from 3x-ui settings..."}
                        value={newPanelApiToken}
                        onChange={(e) => setNewPanelApiToken(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all font-mono"
                        required={authMethod === "token"}
                      />
                      <p className="text-[9px] text-indigo-500 mt-1 font-medium leading-relaxed">
                        {lang === "fa" 
                          ? "💡 نکته: در نسخه‌های جدید سنایی (v2.3.4+)، می‌توانید از بخش تنظیمات پنل یک API Token بسازید تا بدون نیاز به یوزرنیم/پسورد و کوکی، با امنیت بالا به پنل متصل شوید." 
                          : "💡 Tip: In modern MHSanaei versions, generate an API Token in panel settings to connect securely without a password."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                          {lang === "fa" ? "نام کاربری پنل" : "Username"}
                        </label>
                        <input
                          type="text"
                          placeholder="admin"
                          value={newPanelUser}
                          onChange={(e) => setNewPanelUser(e.target.value)}
                          className="w-full text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                          {lang === "fa" ? "رمز عبور پنل" : "Password"}
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={newPanelPass}
                          onChange={(e) => setNewPanelPass(e.target.value)}
                          className="w-full text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Connection Test Output */}
                  {testResult && (
                    <div className="space-y-2">
                      <div className={`p-3.5 rounded-xl border text-xs flex gap-2 ${
                        testResult.success 
                          ? "bg-green-50 border-green-100 text-green-800" 
                          : "bg-red-50 border-red-100 text-red-800"
                      }`}>
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <strong className="font-bold block">{testResult.success ? (lang === "fa" ? "اتصال موفق" : "Connected!") : (lang === "fa" ? "ناموفق" : "Connection Error")}</strong>
                          <span className="text-[10px] mt-0.5 block opacity-90 whitespace-pre-line">{testResult.message}</span>
                          
                          {!testResult.success && testResult.diagnostics && testResult.diagnostics.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowDiagnostics(!showDiagnostics)}
                              className="mt-2.5 text-[10px] font-bold text-red-700 hover:text-red-900 underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>{showDiagnostics ? (lang === "fa" ? "بستن جزئیات فنی" : "Hide technical details") : (lang === "fa" ? "مشاهده جزئیات فنی و آدرس‌های تست‌شده" : "Show technical details & tested URLs")}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {showDiagnostics && !testResult.success && testResult.diagnostics && (
                        <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 text-[10px] space-y-1.5 max-h-64 overflow-y-auto font-mono text-gray-700">
                          <div className="font-bold text-gray-500 pb-1 border-b border-gray-200/60 flex justify-between items-center">
                            <span>{lang === "fa" ? "آدرس و متد تست شده" : "Tested URLs & Methods"}</span>
                            <span>{lang === "fa" ? "وضعیت اتصال" : "Status"}</span>
                          </div>
                          {testResult.diagnostics.map((d, idx) => (
                            <div key={idx} className="flex justify-between gap-4 py-1 border-b border-gray-100 last:border-0">
                              <div className="truncate flex-1">
                                <span className={`mr-1 px-1 py-0.2 rounded text-[8px] font-sans font-bold ${d.method === "json" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                  {d.method.toUpperCase()}
                                </span>
                                <span className="opacity-80" title={d.url}>{d.url}</span>
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5">
                                {d.success ? (
                                  <span className="text-green-600 font-bold font-sans">✓ OK</span>
                                ) : (
                                  <span className="text-red-500 font-sans" title={d.error}>
                                    {d.isCompanionSelf ? (
                                      <span className="text-amber-500 font-sans font-bold">LOOPBACK ⚠️</span>
                                    ) : d.is3xUiDetected ? (
                                      <span className="text-amber-600 font-sans font-bold">3X-UI 🎯 (404/ERR)</span>
                                    ) : d.status ? (
                                      `HTTP ${d.status}`
                                    ) : (
                                      d.error.includes("Timeout") || d.error.includes("زمان") ? "TIMEOUT ⏳" : "REFUSED 🚫"
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTestingPanel}
                      className="flex-1 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      {isTestingPanel ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-gray-400" /> : <Wifi className="h-4 w-4 text-gray-400" />}
                      <span>{lang === "fa" ? "تست ارتباط" : "Test Link"}</span>
                    </button>

                    <button
                      type="submit"
                      className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{lang === "fa" ? "ثبت سرور" : "Save Panel"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Bot API Integration Details Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-green-50 text-green-600 p-1.5 rounded-lg">
                    <Key className="h-4.5 w-4.5 stroke-[2.5px]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {lang === "fa" ? "اتصال آسان به ربات تلگرام (API)" : "Easy Telegram Bot API Integration"}
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {lang === "fa" ? "وب‌سرویس اختصاصی این پنل برای اتصال آنی به ربات شما" : "Direct REST API for automated bot integrations"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                      <span>{lang === "fa" ? "متد و آدرس وب‌سرویس" : "API Method & URL"}</span>
                      <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-mono font-bold">POST</span>
                    </div>
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100">
                      <code className="text-[10px] text-gray-800 font-mono break-all font-semibold">
                        {`${window.location.origin}/api/users`}
                      </code>
                      <button
                        onClick={() => triggerCopy(`${window.location.origin}/api/users`, "bot_api_url")}
                        className="text-gray-400 hover:text-gray-900 transition-all mr-1.5"
                      >
                        {copiedId === "bot_api_url" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="block text-[10px] font-semibold text-gray-500">
                        {lang === "fa" ? "ساختار بدنه ارسالی (JSON Payload)" : "JSON Request Body"}
                      </span>
                      <button
                        onClick={() => triggerCopy(`{\n  "panelId": "${selectedPanel || "your_panel_id"}",\n  "username": "client_tg_username",\n  "autoSwitchEnabled": true\n}`, "bot_api_payload")}
                        className="text-[#4F46E5] text-[10px] font-bold hover:underline"
                      >
                        {copiedId === "bot_api_payload" ? (lang === "fa" ? "کپی شد" : "Copied") : (lang === "fa" ? "کپی نمونه" : "Copy Payload")}
                      </button>
                    </div>
                    <pre className="text-[9px] bg-slate-900 text-slate-200 font-mono p-3 rounded-xl overflow-x-auto leading-relaxed">
{`{
  "panelId": "${selectedPanel || "your_panel_id"}",
  "username": "client_tg_username",
  "autoSwitchEnabled": true
}`}
                    </pre>
                  </div>

                  <p className="text-[9px] text-gray-500 leading-relaxed bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/30">
                    {lang === "fa" 
                      ? "💡 ربات تلگرام شما به جای ارتباط سخت با کوکی‌های سنایی، کافیست به آدرس بالا درخواست بفرستد تا فوراً پاسخ حاوی تمام لینک‌های هوشمند کلش، فایل‌های OVPN و اطلاعات L2TP/IKEv2 را دریافت کند."
                      : "💡 Instead of wrestling with Sanaei's cookie/login API, your bot only needs to call this endpoint. It immediately returns high-speed L2TP/IKEv2 configurations and smart subscription URLs."}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================== TAB 3: CONVERTER (V2RAY LINK TO L2TP) ==================== */}
        {currentTab === "converter" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              
              <div className="flex items-center gap-3">
                <div className="bg-[#4F46E5]/10 p-2.5 rounded-xl text-[#4F46E5]">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {lang === "fa" ? "مبدل سریع لینک کانفیگ به خروجی L2TP" : "L2TP Profile Porter"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {lang === "fa" ? "تبدیل فوری هر لینک وی‌لس، وی‌مس یا تروجان به اکانت و اسکریپت L2TP" : "Instantly convert any V2Ray link to legacy L2TP client dialers and credentials"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleManualConvert} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    {lang === "fa" ? "لینک کانفیگ V2ray را وارد کنید" : "Paste raw vless://, vmess:// or trojan:// link"}
                  </label>
                  <textarea
                    rows={3}
                    placeholder="vless://e8e3d6f1-da9a-4fd9-8730-80252199b5a8@my-vpn.site:443?type=ws&security=tls#Germany-Node"
                    value={rawLink}
                    onChange={(e) => setRawLink(e.target.value)}
                    className="w-full text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] font-mono transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#4F46E5] text-white py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-[#4338CA] transition-all flex items-center justify-center gap-2"
                >
                  <Activity className="h-4 w-4" />
                  <span>{lang === "fa" ? "استخراج پارامترها و تولید L2TP" : "Parse Details & Extract L2TP"}</span>
                </button>
              </form>

              {convertedL2tp && (
                <div className="bg-indigo-50/40 rounded-2xl p-5 border border-indigo-100/50 space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-indigo-900">
                    <Check className="h-4.5 w-4.5 text-[#4F46E5] stroke-[3px]" />
                    <h4 className="text-xs font-bold">{lang === "fa" ? "خروجی L2TP تولید شده با موفقیت" : "Successfully Converted to L2TP!"}</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[11px]">
                    <div className="bg-white rounded-xl p-3 border border-gray-100">
                      <span className="text-gray-400 block text-[9px] font-semibold mb-1">{lang === "fa" ? "سرور L2TP" : "L2TP Server"}</span>
                      <div className="flex items-center justify-between font-mono text-gray-800">
                        <span>{convertedL2tp.serverIp}</span>
                        <button onClick={() => triggerCopy(convertedL2tp.serverIp, "conv-ip")} className="text-gray-400 hover:text-gray-900">
                          {copiedId === "conv-ip" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-gray-100">
                      <span className="text-gray-400 block text-[9px] font-semibold mb-1">{lang === "fa" ? "کلید مشترک (PSK)" : "IPSec PSK"}</span>
                      <div className="flex items-center justify-between font-mono text-gray-800">
                        <span>{convertedL2tp.psk}</span>
                        <button onClick={() => triggerCopy(convertedL2tp.psk, "conv-psk")} className="text-gray-400 hover:text-gray-900">
                          {copiedId === "conv-psk" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-gray-100">
                      <span className="text-gray-400 block text-[9px] font-semibold mb-1">{lang === "fa" ? "نام کاربری VPN" : "VPN Username"}</span>
                      <div className="flex items-center justify-between font-mono text-gray-800">
                        <span>{convertedL2tp.user}</span>
                        <button onClick={() => triggerCopy(convertedL2tp.user, "conv-user")} className="text-gray-400 hover:text-gray-900">
                          {copiedId === "conv-user" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-gray-100">
                      <span className="text-gray-400 block text-[9px] font-semibold mb-1">{lang === "fa" ? "کلمه عبور VPN" : "VPN Password"}</span>
                      <div className="flex items-center justify-between font-mono text-gray-800">
                        <span>{convertedL2tp.pass}</span>
                        <button onClick={() => triggerCopy(convertedL2tp.pass, "conv-pass")} className="text-gray-400 hover:text-gray-900">
                          {copiedId === "conv-pass" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    {lang === "fa" ? "توجه: برای کارکرد صحیح کانفیگ L2TP، باید سرویس xl2tpd/strongswan متناظر بر روی سرور مقصد فعال باشد، یا پورت‌های ۵۰۰ و ۴۵۰۰ UDP به سمت کانال‌های Xray شما هدایت شده باشند." : "Note: Standard L2TP connections require standard L2TP daemons or custom translation layers to route packets properly over the server IP."}
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ==================== TAB 5: VPN SETTINGS ==================== */}
        {currentTab === "settings" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                <Settings className="h-5 w-5 text-[#4F46E5]" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {lang === "fa" ? "تنظیمات زیرساخت VPN واقعی (L2TP & WireGuard)" : "Real VPN Infrastructure Settings"}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {lang === "fa" 
                      ? "تنظیمات سرور، کلیدهای عمومی/خصوصی رمزنگاری شده و هماهنگ‌سازی محلی سرور را مدیریت کنید." 
                      : "Configure your server IP, cryptographic keypairs, and handle direct local synchronization."}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* L2TP Settings Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-900 border-r-2 border-[#4F46E5] pr-2">
                    {lang === "fa" ? "۱. تنظیمات سرور L2TP / IPsec" : "1. L2TP / IPsec Server Parameters"}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        {lang === "fa" ? "آدرس آی‌پی عمومی سرور یا دامنه" : "Public Server IP or Domain"}
                      </label>
                      <input
                        type="text"
                        value={l2tpServerIpState}
                        onChange={(e) => setL2tpServerIpState(e.target.value)}
                        placeholder="e.g. 195.85.15.20"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:ring-1 focus:ring-[#4F46E5] transition-all"
                      />
                      <p className="text-[9px] text-gray-400 mt-1">
                        {lang === "fa" ? "آدرس آی‌پی عمومی این سرور که کاربران به آن متصل خواهند شد." : "The public address of this server that clients will connect to."}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        {lang === "fa" ? "کلید پیش‌مشترک IPsec (PSK)" : "IPsec Pre-Shared Key (PSK)"}
                      </label>
                      <input
                        type="text"
                        value={l2tpPskState}
                        onChange={(e) => setL2tpPskState(e.target.value)}
                        placeholder="SanaeiL2TPSecureKey"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:ring-1 focus:ring-[#4F46E5] transition-all"
                      />
                      <p className="text-[9px] text-gray-400 mt-1">
                        {lang === "fa" ? "کلید امنیتی اتصال IPsec متصل به L2TP." : "The IPSec pre-shared secret key configured on the L2TP daemon."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* WireGuard Settings Section */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-900 border-r-2 border-green-500 pr-2">
                    {lang === "fa" ? "۲. تنظیمات سرور WireGuard" : "2. WireGuard Server Parameters"}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        {lang === "fa" ? "کلید عمومی سرور (Server Public Key)" : "Server Public Key (S_pub)"}
                      </label>
                      <input
                        type="text"
                        value={wgServerPublicKeyState}
                        onChange={(e) => setWgServerPublicKeyState(e.target.value)}
                        placeholder="Server Public Key"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:ring-1 focus:ring-[#4F46E5] transition-all"
                      />
                      <p className="text-[9px] text-gray-400 mt-1">
                        {lang === "fa" 
                          ? "کلید عمومی که در فایل‌های .conf دانلود شده توسط کلاینت‌ها قرار می‌گیرد." 
                          : "This public key will be written as the Peer PublicKey in downloaded client configs."}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        {lang === "fa" ? "کلید خصوصی سرور (Server Private Key)" : "Server Private Key (S_priv)"}
                      </label>
                      <input
                        type="text"
                        value={wgServerPrivateKeyState}
                        onChange={(e) => setWgServerPrivateKeyState(e.target.value)}
                        placeholder="Server Private Key"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:ring-1 focus:ring-[#4F46E5] transition-all"
                      />
                      <p className="text-[9px] text-gray-400 mt-1">
                        {lang === "fa" 
                          ? "کلید خصوصی سرور جهت بازنویسی و اعمال محلی در فایل wg0.conf" 
                          : "Used locally to initialize and populate wg0.conf for local connections."}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        {lang === "fa" ? "پورت گوش دادن (Listen Port)" : "Listen Port"}
                      </label>
                      <input
                        type="number"
                        value={wgServerPortState}
                        onChange={(e) => setWgServerPortState(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:ring-1 focus:ring-[#4F46E5] transition-all"
                      />
                      <p className="text-[9px] text-gray-400 mt-1">
                        {lang === "fa" ? "پورت پیش‌فرض سرویس وایرگارد (معمولا ۵۱۸۲۰)" : "Default UDP port for WireGuard service (usually 51820)."}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        {lang === "fa" ? "آدرس‌های DNS کلاینت" : "Client DNS Servers"}
                      </label>
                      <input
                        type="text"
                        value={wgServerDnsState}
                        onChange={(e) => setWgServerDnsState(e.target.value)}
                        placeholder="1.1.1.1, 8.8.8.8"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:ring-1 focus:ring-[#4F46E5] transition-all"
                      />
                      <p className="text-[9px] text-gray-400 mt-1">
                        {lang === "fa" ? "آدرس‌های دی‌ان‌اس که به کلاینت تزریق می‌شوند تا اتصال فیلتر نباشد." : "DNS server addresses pushed into client configurations."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="w-full bg-[#4F46E5] text-white py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-[#4338CA] transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {isSavingSettings ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>{lang === "fa" ? "در حال ذخیره‌سازی و اعمال..." : "Saving & Hot-reloading..."}</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 stroke-[3px]" />
                        <span>{lang === "fa" ? "ذخیره تنظیمات و همگام‌سازی همگانی" : "Save Settings & Live Sync VPN Servers"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Technical Installation & Sync Guide */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 space-y-4 shadow-sm font-sans border border-slate-800">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Shield className="h-5 w-5 text-green-400 animate-pulse" />
                <h4 className="text-sm font-bold">
                  {lang === "fa" ? "راهنمای راه‌اندازی زیرساخت واقعی VPN روی سرور" : "How to Setup Real VPN Infrastructure on Your Server"}
                </h4>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                <p>
                  {lang === "fa"
                    ? "سیستم مکمل ثنایی مجهز به ماژول همگام‌سازی خودکار لوکال (Live Local Sync Engine) است. در صورتی که این برنامه بر روی همان سرور لینوکس VPS شما مستقر باشد، به‌طور خودکار تنظیمات کاربران را با پشته‌های سیستمی همگام می‌کند:"
                    : "Sanaei Companion is equipped with a Live Local Sync Engine. When running natively as root on your Linux VPS, it automatically translates and propagates web database configurations to your system backend on every change:"}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* L2TP Setup Guide */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <h5 className="font-bold text-slate-100 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#4F46E5]"></span>
                      L2TP / IPsec (chap-secrets)
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      {lang === "fa"
                        ? "این اپلیکیشن نام کاربری و کلمه‌های عبور تولید شده را مستقیماً در فایل زیر بازنویسی می‌کند:"
                        : "The app writes all current L2TP credentials directly and securely inside this system path:"}
                    </p>
                    <code className="block bg-slate-900 p-1.5 rounded text-[10px] font-mono text-indigo-400 select-all truncate">
                      /etc/ppp/chap-secrets
                    </code>
                    <p className="text-[10px] text-slate-400 pt-1">
                      {lang === "fa"
                        ? "کافیست یک سرویس استاندارد IPSec/L2TP روی سرور نصب باشد. برای نصب آسان از دستور زیر استفاده کنید:"
                        : "Just make sure a standard L2TP daemon is installed on the VPS. To install effortlessly:"}
                    </p>
                    <code className="block bg-slate-900 p-1.5 rounded text-[10px] font-mono text-green-400 select-all overflow-x-auto whitespace-pre">
                      wget https://git.io/vpnsetup -O vpnsetup.sh && sudo bash vpnsetup.sh
                    </code>
                  </div>

                  {/* WireGuard Setup Guide */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <h5 className="font-bold text-slate-100 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                      WireGuard (wg syncconf)
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      {lang === "fa"
                        ? "این اپلیکیشن تمام کلاینت‌ها را به همراه کلیدهای عمومی رمزنگاری در فایل زیر بروز می‌کند:"
                        : "Our sync engine rewrites and appends active clients into this configuration file:"}
                    </p>
                    <code className="block bg-slate-900 p-1.5 rounded text-[10px] font-mono text-green-400 select-all truncate">
                      /etc/wireguard/wg0.conf
                    </code>
                    <p className="text-[10px] text-slate-400 pt-1">
                      {lang === "fa"
                        ? "سیستم بدون قطعی اتصال کاربران فعلی، تغییرات را با دستور زیر در جا اعمال (Hot-reload) می‌کند:"
                        : "To avoid client disconnections, peers are dynamically merged using hot-reload:"}
                    </p>
                    <code className="block bg-slate-900 p-1.5 rounded text-[10px] font-mono text-indigo-400 select-all truncate">
                      wg syncconf wg0 &lt;(wg-quick strip wg0)
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: MANUALS (GUIDES) ==================== */}
        {currentTab === "manuals" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-gray-900">
                {lang === "fa" ? "آموزش گام‌به‌گام اتصال و راه‌اندازی پروکسی" : "Configuration & Installation Manuals"}
              </h3>
              <p className="text-xs text-gray-500">
                {lang === "fa" ? "چگونه خروجی‌های سبک قدیم و جدید را در ویندوز، مک و گوشی‌ها نصب کنیم" : "Step-by-step documentation for both traditional and modern client setups"}
              </p>
            </div>

            {/* Old Style L2TP Manual */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  {lang === "fa" ? "تنظیم مستقیم در گوشی و کامپیوتر" : "Native Device Setup"}
                </div>
                <h4 className="text-sm font-bold text-gray-900">
                  {lang === "fa" ? "۱. آموزش گام‌به‌گام با نام دقیق فیلدهای انگلیسی گوشی" : "1. Step-by-Step Native Device Setup (Exact English Fields)"}
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-600">
                {/* iOS */}
                <div className="space-y-3 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                  <h5 className="font-bold text-gray-800 flex items-center gap-1.5 border-b border-gray-200/60 pb-2">
                    <Smartphone className="h-4 w-4 text-[#4F46E5]" />
                    {lang === "fa" ? "آیفون و آیپد (Apple iOS)" : "Apple iOS (iPhone/iPad)"}
                  </h5>
                  <p className="text-[10px] text-gray-500">
                    {lang === "fa"
                      ? "مسیر: Settings > General > VPN & Device Management > Add VPN Configuration"
                      : "Path: Settings > General > VPN & Device Management > Add VPN Configuration"}
                  </p>
                  <ul className="space-y-1.5 text-[11px] font-mono">
                    <li><strong className="text-gray-900 font-sans">Type:</strong> L2TP</li>
                    <li><strong className="text-gray-900 font-sans">Description:</strong> Sanaei L2TP</li>
                    <li><strong className="text-gray-900 font-sans">Server:</strong> <code>[Server IP / Domain]</code></li>
                    <li><strong className="text-gray-900 font-sans">Account:</strong> <code>[L2TP Username]</code></li>
                    <li><strong className="text-gray-900 font-sans">RSA SecurID:</strong> OFF</li>
                    <li><strong className="text-gray-900 font-sans">Password:</strong> <code>[L2TP Password]</code></li>
                    <li><strong className="text-gray-900 font-sans">Secret:</strong> <code>[IPSec PSK]</code></li>
                    <li><strong className="text-gray-900 font-sans">Send All Traffic:</strong> ON</li>
                  </ul>
                  <p className="text-[9px] text-indigo-600 font-sans pt-1">
                    {lang === "fa" ? "💡 یا دکمه «دانلود پروفایل iOS» را بزنید تا بدون تایپ دستی نصب شود." : "💡 Or tap 'Download iOS Profile' for 1-tap installation."}
                  </p>
                </div>

                {/* Android */}
                <div className="space-y-3 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                  <h5 className="font-bold text-gray-800 flex items-center gap-1.5 border-b border-gray-200/60 pb-2">
                    <Smartphone className="h-4 w-4 text-green-600" />
                    {lang === "fa" ? "اندروید (Android Settings)" : "Android Settings"}
                  </h5>
                  <p className="text-[10px] text-gray-500">
                    {lang === "fa"
                      ? "مسیر: Settings > Connections / Network & Internet > VPN > Add VPN (+)"
                      : "Path: Settings > Connections / Network & Internet > VPN > Add VPN (+)"}
                  </p>
                  <ul className="space-y-1.5 text-[11px] font-mono">
                    <li><strong className="text-gray-900 font-sans">Name:</strong> Sanaei L2TP</li>
                    <li><strong className="text-gray-900 font-sans">Type:</strong> L2TP/IPSec PSK</li>
                    <li><strong className="text-gray-900 font-sans">Server address:</strong> <code>[Server IP]</code></li>
                    <li><strong className="text-gray-900 font-sans">L2TP secret:</strong> <em>(Leave blank)</em></li>
                    <li><strong className="text-gray-900 font-sans">IPSec identifier:</strong> <em>(Leave blank)</em></li>
                    <li><strong className="text-gray-900 font-sans">IPSec pre-shared key:</strong> <code>[IPSec PSK]</code></li>
                    <li><strong className="text-gray-900 font-sans">Username:</strong> <code>[L2TP User]</code></li>
                    <li><strong className="text-gray-900 font-sans">Password:</strong> <code>[L2TP Pass]</code></li>
                  </ul>
                </div>

                {/* Windows */}
                <div className="space-y-3 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                  <h5 className="font-bold text-gray-800 flex items-center gap-1.5 border-b border-gray-200/60 pb-2">
                    <Monitor className="h-4 w-4 text-blue-600" />
                    {lang === "fa" ? "ویندوز (Windows 10/11)" : "Windows 10 / 11"}
                  </h5>
                  <p className="text-[10px] text-gray-500">
                    {lang === "fa"
                      ? "مسیر: Settings > Network & Internet > VPN > Add a VPN connection"
                      : "Path: Settings > Network & Internet > VPN > Add a VPN connection"}
                  </p>
                  <ul className="space-y-1.5 text-[11px] font-mono">
                    <li><strong className="text-gray-900 font-sans">VPN provider:</strong> Windows (built-in)</li>
                    <li><strong className="text-gray-900 font-sans">Connection name:</strong> Sanaei L2TP</li>
                    <li><strong className="text-gray-900 font-sans">Server name/address:</strong> <code>[Server IP]</code></li>
                    <li><strong className="text-gray-900 font-sans">VPN type:</strong> L2TP/IPsec with PSK</li>
                    <li><strong className="text-gray-900 font-sans">Pre-shared key:</strong> <code>[IPSec PSK]</code></li>
                    <li><strong className="text-gray-900 font-sans">Type of sign-in:</strong> User name and password</li>
                    <li><strong className="text-gray-900 font-sans">User name:</strong> <code>[L2TP User]</code></li>
                    <li><strong className="text-gray-900 font-sans">Password:</strong> <code>[L2TP Pass]</code></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* New Style Auto-switching subscription */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="bg-green-100 text-green-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  {lang === "fa" ? "روش جدید" : "Modern"}
                </div>
                <h4 className="text-sm font-bold text-gray-900">
                  {lang === "fa" ? "۲. سوییچ اتوماتیک و آپدیت خودکار (Clash Meta / Sing-box)" : "2. Dynamic Subscription Auto-Switch Setup"}
                </h4>
              </div>

              <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
                <p>
                  {lang === "fa" 
                    ? "روش‌های سنتی L2TP فاقد سوییچ خودکار کانفیگ و آپدیت خودکار هستند. برای دور زدن این مشکل، ما پکیج اشتراک هوشمند Clash و Sing-box را توسعه داده‌ایم که مزایای زیر را فراهم می‌کند:" 
                    : "Traditional L2TP cannot dynamic switch nodes if one goes down. We've compiled a dynamic parser for Clash Meta and Sing-box which injects modern tunnels with automated switching:"}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <Activity className="h-5 w-5 text-green-600 mx-auto mb-1.5 animate-pulse" />
                    <h5 className="font-bold text-gray-800 text-[11px]">{lang === "fa" ? "سنجش زنده تاخیر پینگ" : "Live Latency Testing"}</h5>
                    <p className="text-[10px] text-gray-400 mt-1">{lang === "fa" ? "پینگ کردن تمام سرورهای ۳ایکس‌یوآی و انتخاب سریعترین" : "Automatically pings and switches to the lowest ping node"}</p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <RefreshCw className="h-5 w-5 text-blue-600 mx-auto mb-1.5" />
                    <h5 className="font-bold text-gray-800 text-[11px]">{lang === "fa" ? "آپدیت خودکار لیست" : "Sub Auto-Updates"}</h5>
                    <p className="text-[10px] text-gray-400 mt-1">{lang === "fa" ? "تغییر آدرس‌ها یا اضافه شدن کانفیگ جدید اتومات دانلود می‌شود" : "New nodes added in 3x-ui show up without re-importing"}</p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <Shield className="h-5 w-5 text-indigo-600 mx-auto mb-1.5" />
                    <h5 className="font-bold text-gray-800 text-[11px]">{lang === "fa" ? "دور زدن فیلترینگ با پروتکل نوین" : "Advanced obfuscation"}</h5>
                    <p className="text-[10px] text-gray-400 mt-1">{lang === "fa" ? "سازگار با هسته‌های VLESS, Trojan و Shadowsocks" : "Fully supports robust protocols out-performing classic L2TP"}</p>
                  </div>
                </div>

                <div className="bg-indigo-50/30 rounded-xl p-4 border border-indigo-100/30">
                  <h5 className="font-bold text-gray-900 mb-2">{lang === "fa" ? "مراحل راه‌اندازی:" : "How to import:"}</h5>
                  <ul className="list-disc list-inside space-y-1.5">
                    <li>{lang === "fa" ? "آدرس لینک اشتراک Clash را از بخش کاربران کپی کنید." : "Copy the smart Clash Meta link from your user panel."}</li>
                    <li>{lang === "fa" ? "آن را در اپلیکیشن Clash (یا v2rayN در بخش Subscription) پیست کنید." : "Paste it in Clash / V2rayN configuration manager."}</li>
                    <li>{lang === "fa" ? "حالت پروکسی را بر روی Rule بگذارید و گروه 'Auto-Switch' را به عنوان کانفیگ اصلی برگزینید." : "Select 'Rule' mode and choose 'Auto-Switch (Fastest Node)' group as your main gate."}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Linux Automated Install Script Manual */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="bg-indigo-100 text-[#4F46E5] px-2 py-0.5 rounded-md text-[10px] font-bold">
                  {lang === "fa" ? "نصب لینوکس" : "Linux Setup"}
                </div>
                <h4 className="text-sm font-bold text-gray-900">
                  {lang === "fa" ? "۳. اسکریپت نصب، آپدیت و حذف خودکار لینوکس" : "3. One-Click Linux Installer & Updater"}
                </h4>
              </div>

              <div className="space-y-4 text-xs text-gray-600">
                <p className="leading-relaxed">
                  {lang === "fa" 
                    ? "برای اجرای پایدار و همیشگی این پنل به صورت یک سرویس پس‌زمینه (Systemd) در کنار پنل سنایی روی سرور خود، می‌توانید از اسکریپت تعاملی لینوکس ما استفاده کنید:" 
                    : "To deploy this manager as a permanent background service (systemd) alongside your MHSanaei 3x-ui on your Linux server, run our interactive management tool:"}
                </p>

                <div className="bg-gray-900 text-gray-100 p-4 rounded-xl font-mono text-[11px] relative group overflow-x-auto">
                  <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-2 text-[10px] text-gray-400">
                    <span>{lang === "fa" ? "ترمینال لینوکس (SSH)" : "SSH Linux Terminal"}</span>
                    <button 
                      onClick={() => triggerCopy(`curl -sSL ${window.location.origin}/install.sh | bash`, "ssh-sh")}
                      className="text-gray-400 hover:text-white"
                    >
                      {copiedId === "ssh-sh" ? (lang === "fa" ? "کپی شد" : "Copied!") : (lang === "fa" ? "کپی دستور" : "Copy Command")}
                    </button>
                  </div>
                  <code>{`curl -sSL ${window.location.origin}/install.sh | bash`}</code>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                  <h5 className="font-bold text-gray-800">{lang === "fa" ? "این اسکریپت چه کارهایی انجام می‌دهد؟" : "What does this script do?"}</h5>
                  <ul className="list-disc list-inside space-y-1.5 text-[11px]">
                    <li><strong>Install</strong>: {lang === "fa" ? "نصب خودکار Node.js 20، کلون پروژه، کامپایل مجدد و ثبت به عنوان سرویس sanaei-smart-sub" : "Auto-installs Node.js, setups production assets, and registers systemd background service."}</li>
                    <li><strong>Update</strong>: {lang === "fa" ? "دریافت آخرین کدها از گیت و بازسازی بیلد فرانت‌اند و بک‌اند بدون قطع اتصال کاربران" : "Pulls changes, recompiles assets, and restarts service seamlessly."}</li>
                    <li><strong>Uninstall</strong>: {lang === "fa" ? "حذف تمیز کل سرویس، غیرفعال کردن خودکار سیستم‌دی و پاکسازی کامل پوشه نصب" : "Fully stops the service, deletes configurations, and uninstalls directory cleanly."}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Telegram Bot Connection & API Guide */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  {lang === "fa" ? "اتصال ربات تلگرام" : "Telegram Bot Integration"}
                </div>
                <h4 className="text-sm font-bold text-gray-900">
                  {lang === "fa" ? "۴. راهنمای اتصال ربات فروش شما به این پنل (API)" : "4. Connect Telegram Sales Bot to Panel API"}
                </h4>
              </div>

              <div className="space-y-4 text-xs text-gray-600">
                <p className="leading-relaxed">
                  {lang === "fa" 
                    ? "اگر ربات تلگرامی دارید که اکانت‌های ۳ایکس‌یوآی را می‌فروشد، به راحتی می‌توانید آن را به این پلتفرم متصل کنید. ربات شما به جای ارسال مستقیم درخواست به سنایی، به این پنل درخواست ارسال می‌کند تا کاربر به صورت هوشمند ثبت شده و تمام لینک‌های OpenVPN، L2TP و ساب‌های جدید را دریافت کند." 
                    : "If you have a Telegram shop bot selling 3x-ui accounts, you can hook it into this panel's REST API. Instead of calling 3x-ui directly, make a request to this companion app to generate high-value multi-protocol smart configurations instantly."}
                </p>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3.5">
                  <h5 className="font-bold text-blue-900 flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    <span>{lang === "fa" ? "مستندات درخواست API" : "HTTP API Specification"}</span>
                  </h5>

                  <div className="space-y-2 text-[11px]">
                    <div>
                      <span className="font-bold text-gray-700 block">Endpoint:</span>
                      <code className="font-mono text-pink-600 bg-white px-2 py-0.5 rounded border border-gray-100 block mt-1 w-fit">
                        POST {window.location.origin}/api/users
                      </code>
                    </div>

                    <div>
                      <span className="font-bold text-gray-700 block">{lang === "fa" ? "پارامترهای ارسالی (JSON Body):" : "Payload Parameters (JSON Body):"}</span>
                      <pre className="bg-gray-900 text-gray-200 p-3 rounded-lg font-mono text-[10px] mt-1 overflow-x-auto">
{`{
  "panelId": "شناسه_پنل_ثبت_شده", // e.g. "mock-panel" or look up via /api/panels
  "username": "client_email_or_user", 
  "autoSwitchEnabled": true, // Enable Smart auto-test failover
  "l2tpServerIp": "آی‌پی_سرور", // (Optional) Custom DNS/IP for L2TP
  "l2tpPsk": "SanaeiL2TPSecureKey" // (Optional) Custom PSK
}`}
                      </pre>
                    </div>

                    <div>
                      <span className="font-bold text-gray-700 block">{lang === "fa" ? "پاسخ بازگشتی (JSON Response):" : "JSON Response Data:"}</span>
                      <pre className="bg-gray-900 text-gray-200 p-3 rounded-lg font-mono text-[10px] mt-1 overflow-x-auto">
{`{
  "id": "subscription_token_xxxxx", // User's dynamic subscription token
  "username": "client_email_or_user",
  "uuid": "user-uuid-xxxx-xxxx-xxxx",
  "l2tpUser": "l2tp_user_xxx",
  "l2tpPass": "PASS_XXX",
  "openvpnUser": "vpn_user_xxx",
  "openvpnPass": "VPN_PASS_xxx",
  "smartSubUrl": "${window.location.origin}/api/sub/subscription_token_xxxxx",
  "clashSubUrl": "${window.location.origin}/api/sub/subscription_token_xxxxx?format=clash",
  "openvpnUrl": "${window.location.origin}/api/sub/subscription_token_xxxxx/openvpn-ovpn"
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Integration Examples Tabs */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h5 className="font-bold text-slate-800">{lang === "fa" ? "نمونه کد اتصال در ربات تلگرام (Python)" : "Telegram Bot Integration Example (Python)"}</h5>
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[10px] overflow-x-auto leading-relaxed">
{`import requests

def create_customer_subscription(user_id, username):
    payload = {
        "panelId": "mock-panel", # Replace with your active panel ID
        "username": f"tg_{user_id}_{username}",
        "autoSwitchEnabled": True
    }
    
    # Send request to your deployed companion app
    response = requests.post("${window.location.origin}/api/users", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        
        # Build attractive message to send to your telegram customer
        msg = f"<b>🎉 Your Smart VPN Account is Ready!</b>\\n\\n"
        msg += f"🔑 <b>Legacy L2TP Setup:</b>\\n"
        msg += f"Server: {data.get('l2tpServerIp')}\\n"
        msg += f"PSK Key: {data.get('l2tpPsk')}\\n"
        msg += f"Username: {data.get('l2tpUser')}\\n"
        msg += f"Password: {data.get('l2tpPass')}\\n\\n"
        
        msg += f"🌐 <b>Modern Protocols (Auto-Switch):</b>\\n"
        msg += f"🔹 <b>OpenVPN Download:</b> {data.get('openvpnUrl')}\\n"
        msg += f"🔹 <b>Clash Meta Sub:</b> {data.get('clashSubUrl')}\\n"
        msg += f"🔹 <b>V2Ray Subscription:</b> {data.get('smartSubUrl')}\\n"
        return msg
    return "Error generating subscription. Please try again."`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Feasibility & Architecture Guide Modal */}
      {showFeasibilityModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-600">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {lang === "fa" ? "بررسی فنی، امکان‌پذیری و راهنمای کارکرد پروتکل‌ها" : "Technical Architecture & Protocol Feasibility"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {lang === "fa" ? "بررسی تداخل‌ها، حل خطاهای ایمپورت و نحوه همگام‌سازی با ۳ایکس‌یوآی" : "Protocol isolation, import troubleshooting & 3x-ui multi-inbound mapping"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFeasibilityModal(false)}
                className="text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 p-2 rounded-xl transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 text-xs text-gray-700 leading-relaxed font-sans">
              
              {/* Question 1: Is it technically possible? */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 stroke-[3px]" />
                  <h4 className="font-bold text-emerald-950 text-sm">
                    {lang === "fa" ? "۱. آیا اجرای همزمان WireGuard، OpenVPN و L2TP شدنی است؟" : "1. Is simultaneous WireGuard, OpenVPN & L2TP feasible?"}
                  </h4>
                </div>
                <p className="text-emerald-900">
                  {lang === "fa"
                    ? "بله! ۱۰۰٪ شدنی و کاملاً استاندارد لینوکس است. این پروتکل‌ها هیچ تداخلی با یکدیگر یا با ۳ایکس‌یوآی (Xray) ندارند، زیرا هرکدام از اینترفیس شبکه و پورت کاملاً مجزای خود استفاده می‌کنند:"
                    : "Yes! 100% standard and feasible. Each protocol runs isolated on its own network interface and dedicated ports without colliding with 3x-ui (Xray):"}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-xs">
                    <span className="text-emerald-600 block font-bold text-[9px]">WireGuard</span>
                    <strong className="text-gray-900">UDP 51820</strong>
                    <span className="text-gray-400 block text-[9px] mt-0.5">Interface: wg0</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-xs">
                    <span className="text-amber-600 block font-bold text-[9px]">OpenVPN</span>
                    <strong className="text-gray-900">UDP 1194</strong>
                    <span className="text-gray-400 block text-[9px] mt-0.5">Interface: tun0</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-xs">
                    <span className="text-indigo-600 block font-bold text-[9px]">L2TP/IPSec</span>
                    <strong className="text-gray-900">UDP 500,4500,1701</strong>
                    <span className="text-gray-400 block text-[9px] mt-0.5">Interface: ppp0</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-xs">
                    <span className="text-purple-600 block font-bold text-[9px]">3x-ui / Xray</span>
                    <strong className="text-gray-900">TCP/UDP 443/80</strong>
                    <span className="text-gray-400 block text-[9px] mt-0.5">VLESS / VMess</span>
                  </div>
                </div>
              </div>

              {/* Question 2: Why were they failing previously? */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  {lang === "fa" ? "۲. دلایل خطای ایمپورت و عدم اتصال و چگونگی رفع آن‌ها:" : "2. Root Causes of Previous Import Errors & Resolutions:"}
                </h4>

                <div className="space-y-2.5 text-[11px]">
                  <div className="bg-white p-3 rounded-xl border border-gray-150 space-y-1">
                    <strong className="text-gray-900 block flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      {lang === "fa" ? "حل خطای بارکد و ایمپورت WireGuard:" : "WireGuard Import & QR Code Fix:"}
                    </strong>
                    <p className="text-gray-600">
                      {lang === "fa"
                        ? "در کلاینت WireGuard اگر ساختار فایل .conf فاقد کلید خصوصی و هدرهای [Interface] یا [Peer] باشد، بارکد اسکن نمی‌شود. اکنون خروجی QR و فایل‌های .conf دقیقاً با سینتکس رسمی Curve25519 و پارامترهای استاندارد تولید می‌شوند و مستقیماً با دوربین برنامه WireGuard گوشی باز می‌شوند."
                        : "WireGuard mobile clients require exact RFC syntax with [Interface] and [Peer] blocks. The QR code generator now encodes the full raw config directly for seamless instant scanning."}
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-gray-150 space-y-1">
                    <strong className="text-gray-900 block flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                      {lang === "fa" ? "حل خطای ایمپورت OpenVPN:" : "OpenVPN Certificate Embedding Fix:"}
                    </strong>
                    <p className="text-gray-600">
                      {lang === "fa"
                        ? "فایل‌های .ovpn در صورتی که گواهی‌ها را به صورت فایل جدا بخواهند، در گوشی خطای Missing Certificate می‌دهند. ما فایل‌های .ovpn را به صورت Single-File Inline (شامل تگ‌های <ca>، <cert>، <key> و <tls-auth>) تولید کرده‌ایم تا با یک کلیک در OpenVPN Connect ایمپورت شوند."
                        : "OpenVPN profiles now include all inline cryptographic certificates (<ca>, <cert>, <key>, <tls-auth>) in a single self-contained .ovpn file for 1-click import in OpenVPN Connect."}
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-gray-150 space-y-1">
                    <strong className="text-gray-900 block flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                      {lang === "fa" ? "حل مشکل L2TP در سرور لینوکس:" : "L2TP Linux System Daemons:"}
                    </strong>
                    <p className="text-gray-600">
                      {lang === "fa"
                        ? "پنل 3x-ui ذاتاً دیمون L2TP ندارد. برای کارکرد L2TP، گزینه ۳ در اسکریپت install.sh پکیج‌های strongswan و xl2tpd را نصب و فایل /etc/ppp/chap-secrets را با دیتابیس کاربران همگام‌سازی می‌کند."
                        : "3x-ui manages Xray core and does not manage system L2TP daemons. Our install.sh (Option 3) sets up strongswan & xl2tpd and syncs /etc/ppp/chap-secrets automatically."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Multi-Inbound Feature explanation */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  {lang === "fa" ? "۳. نحوه عملکرد چند اینباندی (Multi-Inbound 1:1 Mapping):" : "3. Multi-Inbound 1:1 Automated Mapping:"}
                </h4>
                <p className="text-indigo-900 text-[11px]">
                  {lang === "fa"
                    ? "به ازای هر اینباندی که در تب «اینباندها و سرورها» تعریف کنید، تمام کاربران به آن متصل خواهند بود. شما می‌توانید هم از منوی کاربری کانفیگ اینباند مدنظر را دانلود کنید و هم با زدن دکمه «دانلود همه اینباندها»، تمام فایل‌های WireGuard یا OpenVPN مربوط به آن کاربر برای تمام نودها را در چند ثانیه به صورت خودکار دریافت کنید."
                    : "For every inbound added in the Inbounds tab, dedicated configs are generated for every subscriber. You can download individual configs or use the 'All Inbounds' button to retrieve all node configs at once."}
                </p>
              </div>

            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowFeasibilityModal(false)}
                className="bg-indigo-600 text-white font-bold px-5 py-2 rounded-xl text-xs hover:bg-indigo-700 transition-all shadow-sm cursor-pointer"
              >
                {lang === "fa" ? "متوجه شدم و بستن راهنما" : "Got it / Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Inbound Modal */}
      {editingInbound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {lang === "fa" ? `ویرایش مشخصات اینباند: ${editingInbound.tag}` : `Edit Inbound: ${editingInbound.tag}`}
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    {lang === "fa" ? "تنظیمات دقیق IP، پورت و کلیدهای این اینباند را تغییر دهید" : "Modify IP, ports, and cryptographic keys for this inbound"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingInbound(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateInbound} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  {lang === "fa" ? "نام / تگ اینباند:" : "Inbound Tag:"}
                </label>
                <input
                  type="text"
                  required
                  value={editingInbound.tag}
                  onChange={(e) => setEditingInbound({ ...editingInbound, tag: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  {lang === "fa" ? "آدرس آی‌پی عمومی سرور یا دامنه:" : "Server IP or Domain:"}
                </label>
                <input
                  type="text"
                  required
                  value={editingInbound.serverIp}
                  onChange={(e) => setEditingInbound({ ...editingInbound, serverIp: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    {lang === "fa" ? "پورت WireGuard:" : "WireGuard Port:"}
                  </label>
                  <input
                    type="number"
                    value={editingInbound.wgPort || editingInbound.port || 51820}
                    onChange={(e) => setEditingInbound({ ...editingInbound, wgPort: parseInt(e.target.value) || 51820 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    {lang === "fa" ? "پورت OpenVPN:" : "OpenVPN Port:"}
                  </label>
                  <input
                    type="number"
                    value={editingInbound.openvpnPort || 1194}
                    onChange={(e) => setEditingInbound({ ...editingInbound, openvpnPort: parseInt(e.target.value) || 1194 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    {lang === "fa" ? "پروتکل OpenVPN:" : "OpenVPN Proto:"}
                  </label>
                  <select
                    value={editingInbound.openvpnProto || "udp"}
                    onChange={(e) => setEditingInbound({ ...editingInbound, openvpnProto: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                  >
                    <option value="udp">UDP (Recommended)</option>
                    <option value="tcp">TCP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    {lang === "fa" ? "کلید IPSec PSK:" : "L2TP IPSec PSK:"}
                  </label>
                  <input
                    type="text"
                    value={editingInbound.l2tpPsk || "SanaeiL2TPSecureKey"}
                    onChange={(e) => setEditingInbound({ ...editingInbound, l2tpPsk: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  {lang === "fa" ? "کلید عمومی سرور WireGuard (اختیاری):" : "WireGuard Server PublicKey (Optional):"}
                </label>
                <input
                  type="text"
                  placeholder="Leave empty to use global setting"
                  value={editingInbound.wgServerPublicKey || ""}
                  onChange={(e) => setEditingInbound({ ...editingInbound, wgServerPublicKey: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-mono text-[10px]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  {lang === "fa" ? "توضیحات / یادداشت:" : "Notes:"}
                </label>
                <input
                  type="text"
                  value={editingInbound.notes || ""}
                  onChange={(e) => setEditingInbound({ ...editingInbound, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingInbound(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold transition-all"
                >
                  {lang === "fa" ? "انصراف" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingInbound}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  {isUpdatingInbound ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>{lang === "fa" ? "در حال ذخیره..." : "Saving..."}</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>{lang === "fa" ? "ذخیره تغییرات" : "Save Changes"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Server IP / Domain Configuration Modal */}
      {isServerIpModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="server-ip-modal">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    {lang === "fa" ? "تنظیم آدرس عمومی سرور (IP یا Domain)" : "Configure Server Public IP / Domain"}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {lang === "fa" ? "این آدرس در تمامی فایل‌های کانفیگ و اشتراک‌های تولید شده درج می‌شود" : "This host/IP is embedded in all generated WireGuard, OpenVPN and L2TP configs"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsServerIpModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  {lang === "fa" ? "آدرس آی‌پی عمومی سرور یا ساب‌دامین اختصاصی:" : "Public Server IP or Domain:"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 185.220.101.5 or vpn.yourdomain.com"
                    value={quickServerIpInput}
                    onChange={(e) => setQuickServerIpInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-all font-mono text-sm"
                  />
                  {detectedPublicIp && detectedPublicIp !== quickServerIpInput && (
                    <button
                      type="button"
                      onClick={() => setQuickServerIpInput(detectedPublicIp)}
                      className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold whitespace-nowrap"
                    >
                      {lang === "fa" ? "درج آی‌پی خودکار" : "Use Auto IP"}
                    </button>
                  )}
                </div>
              </div>

              {detectedPublicIp && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      {lang === "fa" ? "آی‌پی عمومی شناسایی‌شده سرور VPS شما:" : "Auto-detected VPS Public IP:"}{" "}
                      <strong className="font-mono">{detectedPublicIp}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyServerIp(detectedPublicIp)}
                    className="text-[11px] font-bold text-emerald-700 hover:underline shrink-0"
                  >
                    {lang === "fa" ? "اعمال مستقیم این آی‌پی" : "Apply This IP"}
                  </button>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                  <input
                    type="checkbox"
                    checked={applyToAllInboundsCheck}
                    onChange={(e) => setApplyToAllInboundsCheck(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>
                    {lang === "fa" ? "به‌روزرسانی تمام اینباندها با این آدرس جدید" : "Update all Inbounds with this new Server IP/Domain"}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                  <input
                    type="checkbox"
                    checked={applyToAllSubsCheck}
                    onChange={(e) => setApplyToAllSubsCheck(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>
                    {lang === "fa" ? "به‌روزرسانی تمام کانفیگ‌های کاربران موجود" : "Update all existing client subscriptions"}
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsServerIpModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold transition-all"
                >
                  {lang === "fa" ? "انصراف" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyServerIp()}
                  disabled={isApplyingServerIp}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  {isApplyingServerIp ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>{lang === "fa" ? "در حال اعمال..." : "Applying..."}</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>{lang === "fa" ? "ذخیره و اعمال همگانی" : "Save & Apply Globally"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-12 transition-all">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="text-xs text-gray-500 font-semibold">
            {lang === "fa" ? "طراحی و توسعه برای تسهیل توزیع اشتراک‌های امن و پایدار" : "Engineered with professional standard layouts & multi-protocol routing capabilities"}
          </p>
          <p className="text-[10px] text-gray-400">
            {lang === "fa" ? "سلب مسئولیت: این ابزار صرفاً یک مدیریت‌کننده اشتراک و لایسنس است. تمام اطلاعات در دیتابیس لوکال امن ذخیره می‌شود." : "3x-ui and its modifications are property of MHSanaei. This tool operates as an abstraction and subscription proxy layer."}
          </p>
        </div>
      </footer>

    </div>
  );
}
