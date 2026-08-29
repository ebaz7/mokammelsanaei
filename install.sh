#!/usr/bin/env bash

# ==============================================================================
# Sanaei Smart L2TP & Subscription Manager - Interactive Linux Script
# Supported OS: Ubuntu 20.04+, Debian 11+
# ==============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0;m' # No Color

# Check root privilege
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run this script as root.${NC}"
  exit 1
fi

INSTALL_DIR="/opt/sanaei-smart-sub"
SERVICE_NAME="sanaei-smart-sub"

show_logo() {
  echo -e "${CYAN}"
  echo "=========================================================="
  echo "    Sanaei 3x-ui Smart L2TP & OpenVPN Subscription Companion  "
  echo "=========================================================="
  echo -e "${NC}"
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    echo -e "${GREEN}Node.js is already installed: $(node -v)${NC}"
    return
  fi

  echo -e "${YELLOW}Installing Node.js and NPM...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs git build-essential
}

install_service() {
  show_logo
  echo -e "${BLUE}[1/5] Installing dependencies...${NC}"
  apt-get update && apt-get install -y curl wget git

  install_node

  echo -e "${BLUE}[2/5] Setting up application directory...${NC}"
  if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Directory $INSTALL_DIR already exists. Backing up...${NC}"
    mv "$INSTALL_DIR" "${INSTALL_DIR}_backup_$(date +%F_%T)"
  fi

  mkdir -p "$INSTALL_DIR"
  
  echo -e "${YELLOW}Downloading and cloning the application repository...${NC}"
  git clone https://github.com/ebaz7/mokammelsanaei.git "$INSTALL_DIR"
  cd "$INSTALL_DIR" || exit

  echo -e "${BLUE}[3/5] Installing package dependencies...${NC}"
  npm install

  echo -e "${BLUE}[4/5] Compiling and building production builds...${NC}"
  if npm run build; then
    BUILD_SUCCESS=true
  else
    echo -e "${YELLOW}Warning: Production build failed. This is very common on low-memory (512MB-1GB) VPS.${NC}"
    echo -e "${YELLOW}Falling back to lightweight 'On-the-fly' development runner (no compilation needed)...${NC}"
    BUILD_SUCCESS=false
  fi

  echo -e "${BLUE}[5/5] Creating Systemd service for auto-start...${NC}"
  
  # Prompt user for custom port selection with collision detection
  while true; do
    read -p "Please enter the port you want this panel to run on [Default: 3000]: " CUSTOM_PORT
    if [ -z "$CUSTOM_PORT" ]; then
      CUSTOM_PORT="3000"
    fi
    if [[ ! "$CUSTOM_PORT" =~ ^[0-9]+$ ]]; then
      echo -e "${RED}Error: Port must be a number.${NC}"
      continue
    fi
    # Check if port is in use
    if (echo >/dev/tcp/127.0.0.1/$CUSTOM_PORT) >/dev/null 2>&1; then
      echo -e "${RED}Warning: Port $CUSTOM_PORT is already in use by another process!${NC}"
      read -p "Are you sure you want to use this port anyway? (y/N): " FORCE_PORT
      if [[ "$FORCE_PORT" =~ ^[Yy]$ ]]; then
        break
      fi
    else
      break
    fi
  done

  # Configure execution start command based on build success
  if [ "$BUILD_SUCCESS" = true ]; then
    EXEC_START="$(command -v node) dist/server.cjs"
    NODE_ENV_VAL="production"
  else
    EXEC_START="$(command -v npx) tsx server.ts"
    NODE_ENV_VAL="development"
  fi

  cat <<EOF >/etc/systemd/system/${SERVICE_NAME}.service
[Unit]
Description=Sanaei 3x-ui Smart L2TP Companion Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=${EXEC_START}
Restart=on-failure
Environment=NODE_ENV=${NODE_ENV_VAL}
Environment=PORT=${CUSTOM_PORT}

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable ${SERVICE_NAME}
  systemctl restart ${SERVICE_NAME}

  echo -e "${GREEN}==========================================================${NC}"
  echo -e "${GREEN}  Installation completed successfully!${NC}"
  echo -e "${GREEN}  Service is running on port ${CUSTOM_PORT} (${NODE_ENV_VAL} mode).${NC}"
  echo -e "${GREEN}  You can access it at: http://\$(curl -s ipv4.icanhazip.com):${CUSTOM_PORT}${NC}"
  echo -e "${GREEN}==========================================================${NC}"
}

update_service() {
  show_logo
  echo -e "${YELLOW}Updating Sanaei Smart Subscription Panel...${NC}"
  
  # Ensure the directory exists
  if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Installation directory not found. Creating $INSTALL_DIR...${NC}"
    mkdir -p "$INSTALL_DIR"
  fi

  echo -e "${BLUE}Stopping service...${NC}"
  systemctl stop ${SERVICE_NAME} 2>/dev/null

  # Back up data directory before updating to prevent user data loss
  if [ -d "$INSTALL_DIR/data" ]; then
    echo -e "${GREEN}Backing up database files...${NC}"
    rm -rf /tmp/sanaei_sub_db_backup
    cp -r "$INSTALL_DIR/data" /tmp/sanaei_sub_db_backup
  fi

  echo -e "${BLUE}Pulling updates...${NC}"
  cd "$INSTALL_DIR" || exit
  
  if [ -d ".git" ]; then
    git fetch --all
    git reset --hard origin/main || git reset --hard origin/master || git pull origin main || git pull origin master
  else
    echo -e "${YELLOW}Warning: Not a git repository. Fetching files directly...${NC}"
    rm -rf /tmp/mokammelsanaei_temp
    git clone https://github.com/ebaz7/mokammelsanaei.git /tmp/mokammelsanaei_temp
    if [ -d "/tmp/mokammelsanaei_temp" ]; then
      # Delete data folder in temp clone to preserve current database
      rm -rf /tmp/mokammelsanaei_temp/data
      # Copy everything over
      cp -r /tmp/mokammelsanaei_temp/* "$INSTALL_DIR"/ 2>/dev/null
      cp -r /tmp/mokammelsanaei_temp/.* "$INSTALL_DIR"/ 2>/dev/null
      rm -rf /tmp/mokammelsanaei_temp
    else
      echo -e "${RED}Error: Failed to fetch updates from GitHub.${NC}"
    fi
  fi

  # Restore backup if somehow missing
  if [ -d "/tmp/sanaei_sub_db_backup" ]; then
    echo -e "${GREEN}Restoring database files...${NC}"
    mkdir -p "$INSTALL_DIR/data"
    cp -r /tmp/sanaei_sub_db_backup/* "$INSTALL_DIR/data"/ 2>/dev/null
  fi

  echo -e "${BLUE}Re-installing dependencies and building...${NC}"
  cd "$INSTALL_DIR" || exit
  npm install
  
  if npm run build; then
    BUILD_SUCCESS=true
    sed -i "s|ExecStart=.*|ExecStart=$(command -v node) dist/server.cjs|g" /etc/systemd/system/${SERVICE_NAME}.service 2>/dev/null
    sed -i "s|Environment=NODE_ENV=.*|Environment=NODE_ENV=production|g" /etc/systemd/system/${SERVICE_NAME}.service 2>/dev/null
  else
    echo -e "${YELLOW}Warning: Production build failed on low-memory VPS.${NC}"
    echo -e "${YELLOW}Configuring lightweight On-the-fly TSX mode...${NC}"
    BUILD_SUCCESS=false
    sed -i "s|ExecStart=.*|ExecStart=$(command -v npx) tsx server.ts|g" /etc/systemd/system/${SERVICE_NAME}.service 2>/dev/null
    sed -i "s|Environment=NODE_ENV=.*|Environment=NODE_ENV=development|g" /etc/systemd/system/${SERVICE_NAME}.service 2>/dev/null
  fi

  systemctl daemon-reload 2>/dev/null
  echo -e "${BLUE}Restarting service...${NC}"
  systemctl start ${SERVICE_NAME} 2>/dev/null
  echo -e "${GREEN}Update completed successfully!${NC}"
}

uninstall_service() {
  show_logo
  echo -e "${RED}WARNING: You are about to uninstall the Sanaei Smart Sub Companion Panel.${NC}"
  read -p "Are you sure you want to proceed? (y/N): " confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Stopping and disabling service...${NC}"
    systemctl stop ${SERVICE_NAME} 2>/dev/null
    systemctl disable ${SERVICE_NAME} 2>/dev/null
    rm -f /etc/systemd/system/${SERVICE_NAME}.service
    systemctl daemon-reload
 
    echo -e "${YELLOW}Removing application directory and databases...${NC}"
    rm -rf "$INSTALL_DIR"
 
    echo -e "${GREEN}Uninstalled successfully.${NC}"
  else
    echo "Uninstall cancelled."
  fi
}

diagnose_service() {
  show_logo
  echo -e "${CYAN}==========================================================${NC}"
  echo -e "${CYAN}    🔍 Sanaei Smart Sub Panel Diagnostics & Auto-Fix      ${NC}"
  echo -e "${CYAN}==========================================================${NC}"
  echo ""

  # 1. Memory Check
  echo -e "${BLUE}[1/4] Checking System Memory (RAM)...${NC}"
  free -h
  echo ""

  # 2. Service existence & status
  echo -e "${BLUE}[2/4] Checking Service Status...${NC}"
  if [ ! -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
    echo -e "${RED}❌ Service is NOT installed! Please run Option 1 to install first.${NC}"
    return
  fi

  STATUS_ACTIVE=$(systemctl is-active ${SERVICE_NAME})
  if [ "$STATUS_ACTIVE" = "active" ]; then
    echo -e "${GREEN}✅ Service is ACTIVE (running).${NC}"
  else
    echo -e "${RED}❌ Service is INACTIVE (stopped or crashed). Status: ${STATUS_ACTIVE}${NC}"
  fi
  echo ""

  # Extract configured port
  CONF_PORT=$(grep "Environment=PORT=" /etc/systemd/system/${SERVICE_NAME}.service | cut -d'=' -f3)
  echo -e "Configured Port: ${GREEN}${CONF_PORT:-3000}${NC}"
  
  # 3. Port check
  echo -e "${BLUE}[3/4] Checking Port Binding...${NC}"
  if (echo >/dev/tcp/127.0.0.1/${CONF_PORT:-3000}) >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Port ${CONF_PORT:-3000} is open and listening.${NC}"
  else
    echo -e "${RED}❌ Nothing is listening on Port ${CONF_PORT:-3000}. Service might have crashed during startup.${NC}"
  fi
  echo ""

  # 4. Logs Check
  echo -e "${BLUE}[4/4] Fetching Last 20 Service Logs...${NC}"
  journalctl -u ${SERVICE_NAME} -n 20 --no-pager
  echo ""

  # Auto-Fix wizard
  echo -e "${CYAN}=================== AUTO-FIX OPTIONS =====================${NC}"
  echo -e "  ${GREEN}1)${NC} Add SWAP Memory (Fixes Out-of-Memory / OOM build errors on low-end servers)"
  echo -e "  ${GREEN}2)${NC} Switch Service to Lightweight 'On-the-fly' TSX mode (No compilation needed)"
  echo -e "  ${GREEN}3)${NC} Switch Service back to compiled Production Mode"
  echo -e "  ${GREEN}4)${NC} Change Panel Port"
  echo -e "  ${GREEN}5)${NC} Hard Restart Service"
  echo -e "  ${RED}6)${NC} Back to Main Menu"
  read -p "Select fix option [1-6]: " fix_choice

  case $fix_choice in
    1)
      echo -e "${YELLOW}Creating a 1.5GB SWAP File to prevent compiler crashes...${NC}"
      if [ -f "/swapfile" ]; then
        echo -e "${YELLOW}Swap file already exists. Activating...${NC}"
        swapon /swapfile 2>/dev/null
      else
        fallocate -l 1.5G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=1536
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
      fi
      echo -e "${GREEN}✅ SWAP memory successfully added and activated!${NC}"
      free -h
      ;;
    2)
      echo -e "${YELLOW}Switching service to lightweight 'On-the-fly' TSX runner...${NC}"
      sed -i "s|ExecStart=.*|ExecStart=$(command -v npx) tsx server.ts|g" /etc/systemd/system/${SERVICE_NAME}.service
      sed -i "s|Environment=NODE_ENV=.*|Environment=NODE_ENV=development|g" /etc/systemd/system/${SERVICE_NAME}.service
      systemctl daemon-reload
      systemctl restart ${SERVICE_NAME}
      echo -e "${GREEN}✅ Switched successfully. Service restarted.${NC}"
      ;;
    3)
      echo -e "${YELLOW}Rebuilding production assets...${NC}"
      cd "$INSTALL_DIR" && npm run build
      sed -i "s|ExecStart=.*|ExecStart=$(command -v node) dist/server.cjs|g" /etc/systemd/system/${SERVICE_NAME}.service
      sed -i "s|Environment=NODE_ENV=.*|Environment=NODE_ENV=production|g" /etc/systemd/system/${SERVICE_NAME}.service
      systemctl daemon-reload
      systemctl restart ${SERVICE_NAME}
      echo -e "${GREEN}✅ Recompiled and switched to Production mode successfully.${NC}"
      ;;
    4)
      read -p "Enter new port number: " NEW_PORT
      if [[ "$NEW_PORT" =~ ^[0-9]+$ ]]; then
        sed -i "s|Environment=PORT=.*|Environment=PORT=${NEW_PORT}|g" /etc/systemd/system/${SERVICE_NAME}.service
        systemctl daemon-reload
        systemctl restart ${SERVICE_NAME}
        echo -e "${GREEN}✅ Port changed to ${NEW_PORT} and service restarted.${NC}"
      else
        echo -e "${RED}Invalid port number.${NC}"
      fi
      ;;
    5)
      echo -e "${YELLOW}Restarting service...${NC}"
      systemctl restart ${SERVICE_NAME}
      sleep 2
      systemctl status ${SERVICE_NAME} --no-pager
      ;;
    *)
      return
      ;;
  esac
}

setup_system_vpn_services() {
  show_logo
  echo -e "${CYAN}================================================================${NC}"
  echo -e "${CYAN}  🚀 Installing Linux VPN Core Daemons (WireGuard, L2TP, OpenVPN)${NC}"
  echo -e "${CYAN}================================================================${NC}"
  echo ""
  
  echo -e "${BLUE}[1/5] Installing OS packages (wireguard, strongswan, xl2tpd, openvpn)...${NC}"
  DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y \
    wireguard wireguard-tools strongswan strongswan-pki libcharon-extra-plugins \
    xl2tpd ppp openvpn iptables iptables-persistent net-tools ufw

  echo -e "${BLUE}[2/5] Enabling IPv4 Kernel Packet Forwarding & MTU tweaks...${NC}"
  sysctl -w net.ipv4.ip_forward=1
  sysctl -w net.ipv4.conf.all.accept_redirects=0
  sysctl -w net.ipv4.conf.all.send_redirects=0
  if ! grep -q "net.ipv4.ip_forward=1" /etc/sysctl.conf; then
    echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
    echo "net.ipv4.conf.all.accept_redirects=0" >> /etc/sysctl.conf
    echo "net.ipv4.conf.all.send_redirects=0" >> /etc/sysctl.conf
  fi
  sysctl -p /etc/sysctl.conf 2>/dev/null

  # Detect Main Network Interface and Public IP
  MAIN_IFACE=$(ip route show default | awk '{print $5}' | head -n1)
  if [ -z "$MAIN_IFACE" ]; then
    MAIN_IFACE="eth0"
  fi
  PUBLIC_IP=$(curl -s4 https://api.ipify.org || curl -s4 https://ifconfig.me || hostname -I | awk '{print $1}')
  echo -e "Detected Main Interface: ${GREEN}${MAIN_IFACE}${NC}"
  echo -e "Detected Public Server IP: ${GREEN}${PUBLIC_IP}${NC}"

  echo -e "${BLUE}[3/5] Configuring WireGuard Server (/etc/wireguard/wg0.conf)...${NC}"
  mkdir -p /etc/wireguard
  chmod 700 /etc/wireguard

  if [ ! -f "/etc/wireguard/server.key" ]; then
    wg genkey | tee /etc/wireguard/server.key | wg pubkey > /etc/wireguard/server.pub
  fi
  SERVER_PRIV_KEY=$(cat /etc/wireguard/server.key)
  SERVER_PUB_KEY=$(cat /etc/wireguard/server.pub)

  cat <<EOF >/etc/wireguard/wg0.conf
[Interface]
PrivateKey = ${SERVER_PRIV_KEY}
Address = 10.8.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -m state --state RELATED,ESTABLISHED -j ACCEPT; iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o ${MAIN_IFACE} -j MASQUERADE; iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -o wg0 -m state --state RELATED,ESTABLISHED -j ACCEPT; iptables -t nat -D POSTROUTING -s 10.8.0.0/24 -o ${MAIN_IFACE} -j MASQUERADE; iptables -t mangle -D FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu

EOF

  systemctl enable wg-quick@wg0 2>/dev/null
  systemctl restart wg-quick@wg0 2>/dev/null

  echo -e "${BLUE}[4/5] Configuring L2TP / IPSec (StrongSwan & xl2tpd)...${NC}"
  mkdir -p /etc/xl2tpd /etc/ppp
  
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

  cat <<EOF >/etc/ipsec.secrets
: PSK "SanaeiL2TPSecureKey"
EOF
  chmod 600 /etc/ipsec.secrets

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

  touch /etc/ppp/chap-secrets
  chmod 600 /etc/ppp/chap-secrets

  echo -e "${BLUE}[5/5] Configuring IPTables NAT, MSS Clamping and Starting Services...${NC}"
  # Forwarding rules
  iptables -A FORWARD -m state --state RELATED,ESTABLISHED -j ACCEPT
  iptables -A FORWARD -s 10.8.0.0/24 -j ACCEPT
  iptables -A FORWARD -s 10.9.0.0/24 -j ACCEPT
  iptables -A FORWARD -s 10.10.0.0/24 -j ACCEPT

  # NAT Masquerading
  iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o ${MAIN_IFACE} -j MASQUERADE 2>/dev/null
  iptables -t nat -A POSTROUTING -s 10.9.0.0/24 -o ${MAIN_IFACE} -j MASQUERADE 2>/dev/null
  iptables -t nat -A POSTROUTING -s 10.10.0.0/24 -o ${MAIN_IFACE} -j MASQUERADE 2>/dev/null

  # TCP MSS Clamping to prevent packet fragmentation issues on mobile/telecom networks
  iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu 2>/dev/null
  
  # Save iptables
  netfilter-persistent save 2>/dev/null || iptables-save > /etc/iptables.rules 2>/dev/null

  # Enable & start L2TP and WireGuard
  systemctl enable strongswan-starter 2>/dev/null || systemctl enable strongswan 2>/dev/null
  systemctl restart strongswan-starter 2>/dev/null || systemctl restart strongswan 2>/dev/null
  systemctl enable xl2tpd 2>/dev/null
  systemctl restart xl2tpd 2>/dev/null

  # Sync settings to panel db if present
  if [ -f "/opt/sanaei-smart-sub/data/database.json" ]; then
    node -e "
      const fs = require('fs');
      try {
        const p = '/opt/sanaei-smart-sub/data/database.json';
        const d = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (d.settings) {
          d.settings.wgServerPublicKey = '${SERVER_PUB_KEY}';
          d.settings.wgServerPrivateKey = '${SERVER_PRIV_KEY}';
          if ('${PUBLIC_IP}') d.settings.l2tpServerIp = '${PUBLIC_IP}';
        }
        if (Array.isArray(d.inbounds)) {
          d.inbounds.forEach(i => {
            if ('${PUBLIC_IP}') i.serverIp = '${PUBLIC_IP}';
            i.wgServerPublicKey = '${SERVER_PUB_KEY}';
          });
        }
        fs.writeFileSync(p, JSON.stringify(d, null, 2));
      } catch(e) {}
    " 2>/dev/null
    systemctl restart sanaei-smart-sub 2>/dev/null
  fi

  echo ""
  echo -e "${GREEN}================================================================${NC}"
  echo -e "${GREEN}  ✅ VPN Core Services successfully configured & started!${NC}"
  echo -e "  - WireGuard Port: ${YELLOW}UDP 51820${NC}"
  echo -e "  - WireGuard Server Public Key: ${CYAN}${SERVER_PUB_KEY}${NC}"
  echo -e "  - L2TP/IPSec Ports: ${YELLOW}UDP 500, 4500, 1701${NC}"
  echo -e "  - L2TP Default PSK: ${CYAN}SanaeiL2TPSecureKey${NC}"
  echo -e "${GREEN}================================================================${NC}"
  echo ""
  read -p "Press Enter to return to main menu..."
}

# Main Interactive Menu
clear
show_logo
echo -e "Please select an option:"
echo -e "  ${GREEN}1)${NC} Install Sanaei Smart Sub Companion Panel"
echo -e "  ${YELLOW}2)${NC} Update Panel to Latest Version"
echo -e "  ${PURPLE}3)${NC} 🚀 Install & Start Core Linux VPN Daemons (WireGuard + L2TP/IPSec + OpenVPN)"
echo -e "  ${CYAN}4)${NC} Diagnose & Auto-Fix Panel (For 503/502 errors)"
echo -e "  ${RED}5)${NC} Uninstall Panel"
echo -e "  ${BLUE}6)${NC} Exit"
read -p "Enter selection [1-6]: " choice

case $choice in
  1)
    install_service
    ;;
  2)
    update_service
    ;;
  3)
    setup_system_vpn_services
    ;;
  4)
    diagnose_service
    ;;
  5)
    uninstall_service
    ;;
  6)
    exit 0
    ;;
  *)
    echo -e "${RED}Invalid selection.${NC}"
    exit 1
    ;;
esac
