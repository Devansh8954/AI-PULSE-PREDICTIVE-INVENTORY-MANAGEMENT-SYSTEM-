# 🚀 Production Deployment Guide

This document outlines the production-ready deployment architecture for the **AI-Pulse Predictive Inventory Management System**. It is designed to be highly secure, automated, and cost-effective using AWS Free Tier resources.

## 🏗️ Deployment Architecture

The application is deployed on an **AWS EC2 instance** using a containerized **Docker Compose** stack. 

### Why Docker?
Containerizing the database, backend API, and frontend ensures **environment parity**. The application runs exactly the same way on a developer's Windows laptop as it does on a production Ubuntu server in AWS.

1. **`ai_pulse_db`**: A MySQL 8.4 container with persistent data volumes.
2. **`ai_pulse_backend`**: A Node.js container that connects to the database and serves the REST API.
3. **`ai_pulse_frontend`**: An Nginx container that acts as both a static file server for the Angular application and a Reverse Proxy for the backend API.

---

## 🔒 Security & HTTPS (Let's Encrypt)

To ensure all data (especially JWT authentication tokens) is encrypted in transit, the application uses **HTTPS**.

### Automatic SSL Provisioning
The `frontend/Dockerfile` uses a custom `entrypoint.sh` script to automatically negotiate with the **Let's Encrypt Certificate Authority**.
1. When the container boots, it checks if a valid certificate exists.
2. If not, it uses `certbot` in standalone mode to verify domain ownership (via HTTP-01 challenge) and downloads a trusted 2048-bit RSA certificate.
3. If Let's Encrypt fails (e.g. due to DNS propagation delays), it automatically falls back to generating a self-signed OpenSSL certificate to ensure Nginx doesn't crash.

### Nginx Reverse Proxy & Routing
Nginx is configured to:
- Listen on Port 80 and strictly **redirect (301)** all HTTP traffic to HTTPS (Port 443).
- Terminate the SSL connection using the Let's Encrypt certificates.
- Serve the Angular Single Page Application (SPA) static files.
- **Proxy all requests** starting with `/api/` internally to the `backend:3000` container over the private Docker bridge network. This means the Node.js backend never needs to be exposed to the public internet directly.

---

## 🌐 Networking & Domain (DuckDNS)

Since AWS EC2 does not provide free static domains that are compatible with Let's Encrypt, the project utilizes **DuckDNS** (`ai-pulse-inventory.duckdns.org`).

The AWS EC2 Security Group is strictly configured to only allow:
- **Port 22 (SSH)**: For administrator access.
- **Port 80 (HTTP)**: For Certbot verification and redirection to HTTPS.
- **Port 443 (HTTPS)**: For encrypted user traffic.
- *(Port 3306 and 3000 are completely locked down from the outside world, as Nginx handles all routing internally).*

---

## 🚢 CI/CD & Updates

The project uses GitHub Actions for continuous integration.
- `ci.yml` and `pr-gate.yml` automatically run the Jest test suite and ESLint to ensure code quality on every push and Pull Request.

**To deploy new code to production:**
1. SSH into the AWS EC2 instance.
2. `git pull origin main`
3. `docker compose down`
4. `docker compose up --build -d`

*(The `--build` flag ensures Nginx and Node.js recompile the latest source code before starting).*
