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

# Function to verify cert is from Let's Encrypt (not self-signed)
is_letsencrypt_cert() {
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -text -noout 2>/dev/null | grep -q "Let's Encrypt"
        return $?
    fi
    return 1
}

# Try to renew existing certificate first (if it exists and is expiring/expired)
if check_cert_expiry; then
    echo "================================================="
    echo "Attempting to renew Let's Encrypt certificate for $DOMAIN"
    echo "================================================="
    certbot renew --standalone --non-interactive --agree-tos -m $EMAIL --quiet || true
fi

# Check if a valid Let's Encrypt certificate exists after renewal attempt
if ! is_letsencrypt_cert; then
    echo "================================================="
    echo "Requesting Let's Encrypt certificate for $DOMAIN"
    echo "================================================="

    # Remove any existing cert with same name to avoid conflicts
    certbot delete --cert-name $DOMAIN --non-interactive 2>/dev/null || true

    # Request cert using standalone server with explicit cert-name
    # This ensures cert is saved to /etc/letsencrypt/live/$DOMAIN/
    certbot certonly --standalone --cert-name $DOMAIN -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

    # Verify cert was created at the expected path
    if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        # Certbot may have created it with a different path - find and symlink
        CERT_PATH=$(find /etc/letsencrypt/live -name "fullchain.pem" -path "*$DOMAIN*" 2>/dev/null | head -1)
        if [ -n "$CERT_PATH" ]; then
            mkdir -p /etc/letsencrypt/live/$DOMAIN
            ln -sf "$CERT_PATH" /etc/letsencrypt/live/$DOMAIN/fullchain.pem
            ln -sf "${CERT_PATH/fullchain/privkey}" /etc/letsencrypt/live/$DOMAIN/privkey.pem
        fi
    fi
fi

# Final verification - if still no valid Let's Encrypt cert, use self-signed fallback
if ! is_letsencrypt_cert; then
    echo "================================================="
    echo "Let's Encrypt failed! Generating self-signed fallback"
    echo "================================================="
    mkdir -p /etc/letsencrypt/live/$DOMAIN
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
        -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
        -subj "/CN=$DOMAIN"
fi

# Start Nginx in the foreground
echo "Starting Nginx..."
exec nginx -g "daemon off;"