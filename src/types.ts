export interface Panel {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  isActive: boolean;
  isMock?: boolean;
  webBasePath?: string;
  apiToken?: string;
  workingLoginUrl?: string;
  workingInboundsUrl?: string;
  workingContentType?: "form" | "json";
}

export interface InboundNode {
  id: string;
  panelId?: string;
  nodeId?: number | string;
  tag: string;
  serverIp: string;
  country?: string;
  ping?: number;
  protocol: 'vless' | 'vmess' | 'trojan' | 'shadowsocks' | 'wireguard' | 'openvpn' | 'l2tp';
  port: number;
  wgPort?: number;
  wgServerPublicKey?: string;
  openvpnPort?: number;
  openvpnProto?: 'udp' | 'tcp';
  l2tpPsk?: string;
  isDefault?: boolean;
  notes?: string;
  sourceType?: 'tag' | 'sni' | 'reality' | 'external_proxy' | 'node_cluster' | 'listen' | 'panel_url' | 'custom';
  extractedFrom?: string;
  // Per-inbound dedicated Bridge routing settings
  bridgeWgPort?: number;
  bridgeOpenvpnPort?: number;
  bridgeSubnetIndex?: number;
  bridgeSocksPort?: number;
}

export interface SmartSubscription {
  id: string; // Token used in URL
  panelId: string;
  panelName: string;
  username: string; // User email / identifier
  uuid: string; // V2Ray client uuid
  inboundId: number; // Mapped inbound
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

export interface MockNode {
  id: string;
  name: string;
  type: 'vless' | 'vmess' | 'trojan' | 'shadowsocks';
  address: string;
  port: number;
  uuid: string;
  network: 'tcp' | 'ws' | 'grpc';
  security: 'tls' | 'none' | 'xtls';
  ping: number;
  status: 'active' | 'down';
}

