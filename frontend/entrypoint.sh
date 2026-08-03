#!/bin/sh

DOMAIN="ai-pulse-inventory.duckdns.org"
EMAIL="devanshtyagi5066@gmail.com"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

# Ensure cert directory exists (volume may be empty on first run)
mkdir -p "$CERT_DIR"

# ── Obtain cert only if one doesn't already exist ────────────────────────────
# With the named Docker volume, the cert persists across restarts + CI/CD
# redeploys, so this block only runs ONCE (or after cert deletion).
if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
    echo "================================================="
    echo "No cert found — requesting Let's Encrypt cert for $DOMAIN"
    echo "================================================="

    certbot certonly \
        --standalone \
        -d "$DOMAIN" \
        --non-interactive \
        --agree-tos \
        -m "$EMAIL"

    # Fallback to self-signed if certbot fails (rate limit, DNS issue, etc.)
    if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
        echo "================================================="
        echo "Let's Encrypt failed! Using self-signed fallback cert"
        echo "================================================="
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$CERT_DIR/privkey.pem" \
            -out    "$CERT_DIR/fullchain.pem" \
            -subj   "/CN=$DOMAIN"
    fi
else
    echo "================================================="
    echo "Existing cert found — skipping Let's Encrypt request"
    echo "================================================="
fi

# ── Background cert renewal (runs every 12h, renews when <30 days left) ──────
# certbot renew is a no-op until cert has <30 days remaining, so this is safe.
(
    while true; do
        sleep 43200  # 12 hours
        echo "[certbot] Running scheduled renewal check..."
        certbot renew --quiet --deploy-hook "nginx -s reload" 2>&1 || true
    done
) &

# ── Start Nginx in the foreground ─────────────────────────────────────────────
echo "Starting Nginx..."
exec nginx -g "daemon off;"
