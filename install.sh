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
  
  # For demonstration, we create package.json and copy source files.
  # In a live setup, this would clone the git repo:
  # git clone https://github.com/your-username/sanaei-smart-sub.git "$INSTALL_DIR"
  
  echo -e "${YELLOW}Downloading/Installing application repository...${NC}"
  # Here we assume the source is packed or cloned
  cp -r . "$INSTALL_DIR" 2>/dev/null || tar -czf - . | (cd "$INSTALL_DIR" && tar -xzf -)

  cd "$INSTALL_DIR" || exit

  echo -e "${BLUE}[3/5] Installing package dependencies...${NC}"
  npm install

  echo -e "${BLUE}[4/5] Compiling and building production builds...${NC}"
  npm run build

  echo -e "${BLUE}[5/5] Creating Systemd service for auto-start...${NC}"
  
  # Prompt user for custom port selection
  read -p "Please enter the port you want this panel to run on [Default: 3000]: " CUSTOM_PORT
  if [ -z "$CUSTOM_PORT" ]; then
    CUSTOM_PORT="3000"
  fi

  cat <<EOF >/etc/systemd/system/${SERVICE_NAME}.service
[Unit]
Description=Sanaei 3x-ui Smart L2TP Companion Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=$(command -v npm) start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=${CUSTOM_PORT}

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable ${SERVICE_NAME}
  systemctl restart ${SERVICE_NAME}

  echo -e "${GREEN}==========================================================${NC}"
  echo -e "${GREEN}  Installation completed successfully!${NC}"
  echo -e "${GREEN}  Service is running on port ${CUSTOM_PORT}.${NC}"
  echo -e "${GREEN}  You can access it at: http://\$(curl -s ipv4.icanhazip.com):${CUSTOM_PORT}${NC}"
  echo -e "${GREEN}==========================================================${NC}"
}

update_service() {
  show_logo
  echo -e "${YELLOW}Updating Sanaei Smart Subscription Panel...${NC}"
  if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${RED}Error: Installation directory not found at $INSTALL_DIR.${NC}"
    exit 1
  fi

  cd "$INSTALL_DIR" || exit
  echo -e "${BLUE}Stopping service...${NC}"
  systemctl stop ${SERVICE_NAME}

  echo -e "${BLUE}Pulling updates and rebuilding...${NC}"
  # git pull
  npm install
  npm run build

  echo -e "${BLUE}Restarting service...${NC}"
  systemctl start ${SERVICE_NAME}
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

# Main Interactive Menu
clear
show_logo
echo -e "Please select an option:"
echo -e "  ${GREEN}1)${NC} Install Sanaei Smart Sub Panel"
echo -e "  ${YELLOW}2)${NC} Update Panel to Latest Version"
echo -e "  ${RED}3)${NC} Uninstall Panel"
echo -e "  ${BLUE}4)${NC} Exit"
read -p "Enter selection [1-4]: " choice

case $choice in
  1)
    install_service
    ;;
  2)
    update_service
    ;;
  3)
    uninstall_service
    ;;
  4)
    exit 0
    ;;
  *)
    echo -e "${RED}Invalid selection.${NC}"
    exit 1
    ;;
esac
