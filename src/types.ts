export interface Panel {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  isActive: boolean;
  isMock?: boolean;
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
