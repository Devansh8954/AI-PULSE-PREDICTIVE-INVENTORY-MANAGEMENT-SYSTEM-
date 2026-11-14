#!/bin/sh

DOMAIN="ai-pulse-inventory.duckdns.org"
EMAIL="admin@$DOMAIN"

# Create the directory where Nginx expects the certificates
mkdir -p /etc/letsencrypt/live/$DOMAIN

# Function to check if cert is expired or expiring soon (within 30 days)
check_cert_expiry() {
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        # Check if cert expires in less than 30 days (2592000 seconds)
        if openssl x509 -checkend 2592000 -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" >/dev/null 2>&1; then
            echo "Certificate is valid for more than 30 days"
            return 1  # Not expiring soon
        else
            echo "Certificate is expired or expiring within 30 days"
            return 0  # Expiring soon or expired
        fi
    fi
    return 0  # No cert found
}

# Try to renew existing certificate first (if it exists and is expiring/expired)
if check_cert_expiry; then
    echo "================================================="
    echo "Attempting to renew Let's Encrypt certificate for $DOMAIN"
    echo "================================================="
    certbot renew --standalone --non-interactive --agree-tos -m $EMAIL --quiet || true
fi

# Check if a certificate exists after renewal attempt
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
