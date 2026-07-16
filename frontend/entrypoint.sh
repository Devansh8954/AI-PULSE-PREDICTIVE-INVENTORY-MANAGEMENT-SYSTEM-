#!/bin/sh

DOMAIN="ai-pulse-inventory.duckdns.org"
EMAIL="admin@$DOMAIN"

# Create the directory where Nginx expects the certificates
mkdir -p /etc/letsencrypt/live/$DOMAIN

# Check if a certificate already exists (e.g. from a persistent volume or previous run)
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "================================================="
    echo "Requesting Let's Encrypt certificate for $DOMAIN"
    echo "================================================="
    
    # Request cert using standalone server (since Nginx isn't running yet)
    certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

    # If Certbot fails (e.g. DNS not propagated yet or rate limit reached), fallback to self-signed
    # so Nginx doesn't crash completely.
    if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        echo "================================================="
        echo "Let's Encrypt failed! Generating self-signed fallback"
        echo "================================================="
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
            -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
            -subj "/CN=$DOMAIN"
    fi
fi

# Start Nginx in the foreground
echo "Starting Nginx..."
exec nginx -g "daemon off;"
