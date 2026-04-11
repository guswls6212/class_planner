#!/bin/bash
# =============================================================
# class-planner Deploy Script
# Run from project root: ./scripts/deploy.sh
# =============================================================

set -e

DOMAIN="class-planner.info365.studio"
EMAIL="trymakeit1000@gmail.com"

echo "========================================="
echo " class-planner Deploy"
echo "========================================="

# --- Check prerequisites ---
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Run setup-server.sh first."
    exit 1
fi

if [ ! -f ".env.production" ]; then
    echo "❌ .env.production not found."
    echo "   Copy .env.production.example and fill in the values."
    exit 1
fi

if grep -q "여기에_서비스롤키_입력" .env.production; then
    echo "❌ .env.production still has placeholder values."
    echo "   Please fill in SUPABASE_SERVICE_ROLE_KEY."
    exit 1
fi

# --- Step 1: Build ---
echo "[1/4] Building Docker image..."
docker compose build --no-cache

# --- Step 2: Initial deploy (HTTP only, for SSL cert) ---
echo "[2/4] Starting with HTTP-only config (for SSL certificate)..."
cp nginx/init-ssl.conf nginx/active.conf
docker compose up -d class-planner nginx

echo "  Waiting for services to start..."
sleep 10

# Check if app is responding
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
    echo "  ✅ App is running"
else
    echo "  ⚠️  App might still be starting. Continuing..."
fi

# --- Step 3: Get SSL Certificate ---
echo "[3/4] Requesting SSL certificate for $DOMAIN..."
docker compose run --rm --entrypoint "" certbot certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# --- Step 4: Switch to HTTPS config ---
echo "[4/4] Switching to HTTPS configuration..."
cp nginx/default.conf nginx/active.conf
docker compose restart nginx

echo ""
echo "========================================="
echo " Deploy Complete!"
echo "========================================="
echo ""
echo " 🌐 https://$DOMAIN"
echo ""
echo " Useful commands:"
echo "   docker compose logs -f          # View logs"
echo "   docker compose restart          # Restart all"
echo "   docker compose down && docker compose up -d  # Full restart"
echo "   docker compose ps               # Check status"
echo "========================================="
