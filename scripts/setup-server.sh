#!/bin/bash
# =============================================================
# class-planner Server Setup Script
# Target: Ubuntu 24.04 (AWS Lightsail, 1GB RAM)
# Run: ssh class-planner && ./setup-server.sh
# =============================================================

set -e

DOMAIN="class-planner.info365.studio"
EMAIL="trymakeit1000@gmail.com"
APP_DIR="$HOME/class-planner"

echo "========================================="
echo " class-planner Server Setup"
echo "========================================="

# --- Step 1: System Update ---
echo "[1/6] System update..."
sudo apt-get update -y
sudo apt-get upgrade -y

# --- Step 2: Install Docker ---
echo "[2/6] Installing Docker..."
if command -v docker &> /dev/null; then
    echo "  Docker already installed: $(docker --version)"
else
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    echo "  Docker installed: $(docker --version)"
    echo "  ⚠️  Docker group added. If this is the first install,"
    echo "     you may need to logout and login again, then re-run this script."
fi

# --- Step 3: Install Docker Compose ---
echo "[3/6] Checking Docker Compose..."
if docker compose version &> /dev/null; then
    echo "  Docker Compose available: $(docker compose version)"
else
    sudo apt-get install -y docker-compose-plugin
    echo "  Docker Compose installed: $(docker compose version)"
fi

# --- Step 4: Install Git ---
echo "[4/6] Checking Git..."
if command -v git &> /dev/null; then
    echo "  Git available: $(git --version)"
else
    sudo apt-get install -y git
    echo "  Git installed: $(git --version)"
fi

# --- Step 5: Create app directory ---
echo "[5/6] Setting up app directory..."
mkdir -p $APP_DIR
echo "  App directory: $APP_DIR"

# --- Step 6: Verify ---
echo "[6/6] Verification..."
echo ""
echo "========================================="
echo " Setup Complete!"
echo "========================================="
echo ""
echo " Docker:  $(docker --version 2>/dev/null || echo 'NEEDS RE-LOGIN')"
echo " Compose: $(docker compose version 2>/dev/null || echo 'NEEDS RE-LOGIN')"
echo " Git:     $(git --version 2>/dev/null || echo 'NOT FOUND')"
echo " App Dir: $APP_DIR"
echo ""
echo " Next steps:"
echo " 1. If Docker was just installed, logout and login again:"
echo "    exit && ssh class-planner"
echo ""
echo " 2. Clone or copy the project to $APP_DIR"
echo ""
echo " 3. Run the deploy script:"
echo "    cd $APP_DIR && ./scripts/deploy.sh"
echo "========================================="
