# 🚢 Production Deployment Guide

This document covers the cloud infrastructure and actual deployment steps for the AI-Pulse system.

## ☁️ Cloud Infrastructure (AWS)
- **Host**: AWS EC2 Instance (Ubuntu) - Free Tier (`t2.micro` or `t3.micro`).
- **Domain**: DuckDNS (`ai-pulse-inventory.duckdns.org`).
- **Network Security (AWS Security Groups)**:
  - Port `22` (SSH): Open for server administration.
  - Port `80` (HTTP): Open for Let's Encrypt verification and forced 301 redirects to HTTPS.
  - Port `443` (HTTPS): Open for secure web traffic.
  - *Ports `3000` (Node.js) and `3306` (MySQL) are strictly blocked from the outside world.*

## 🔒 Automated HTTPS Setup
The project achieves zero-cost, fully automated SSL encryption using **Certbot (Let's Encrypt)**.

When the `docker compose up` command is run, the frontend Nginx container executes a custom `entrypoint.sh` script before starting the web server:
1. It requests a trusted 2048-bit RSA certificate from Let's Encrypt using the HTTP-01 challenge.
2. If Let's Encrypt is temporarily down or DNS hasn't propagated, it falls back to a self-signed OpenSSL certificate to ensure the container doesn't crash.
3. Nginx then starts and mounts these certificates to secure the site.

## ⚙️ Deployment Commands

To deploy new changes to the AWS production server, the following commands are executed via SSH:

```bash
# 1. Pull the latest verified code from GitHub
git pull origin main

# 2. Stop the current running containers
docker compose down

# 3. Rebuild the images from source and start the new containers
# (The --build flag ensures the latest code is compiled into the Docker images)
docker compose up --build -d
```

### Viewing Logs
To debug production issues without stopping the server:
```bash
# View backend API logs
docker logs -f ai_pulse_backend

# View Nginx access/error logs
docker logs -f ai_pulse_frontend
```
