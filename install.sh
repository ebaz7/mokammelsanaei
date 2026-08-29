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

# Main Interactive Menu
clear
show_logo
echo -e "Please select an option:"
echo -e "  ${GREEN}1)${NC} Install Sanaei Smart Sub Panel"
echo -e "  ${YELLOW}2)${NC} Update Panel to Latest Version"
echo -e "  ${RED}3)${NC} Uninstall Panel"
echo -e "  ${CYAN}4)${NC} Diagnose & Auto-Fix Panel (For 503/502 errors)"
echo -e "  ${BLUE}5)${NC} Exit"
read -p "Enter selection [1-5]: " choice

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
    diagnose_service
    ;;
  5)
    exit 0
    ;;
  *)
    echo -e "${RED}Invalid selection.${NC}"
    exit 1
    ;;
esac
