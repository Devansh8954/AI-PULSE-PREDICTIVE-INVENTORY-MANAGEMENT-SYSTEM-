# Contributing to AI Pulse

## Project Structure
This repository contains two main applications:
- `/frontend` - Angular 17 Application
- `/backend` - Node.js / Express Application

## Local Development Environment

We use Docker Compose to simplify local setup, specifically for the MySQL database.

### 1. Database Setup
```bash
# Start MySQL via Docker
docker-compose up -d mysql
```

### 2. Backend Setup
```bash
cd backend
npm ci

# Setup environment
cp .env.example .env
# Edit .env and ensure DB_PASSWORD matches your local setup
# Add your GEMINI_API_KEY to test the Trend Analysis features

# Run migrations (assuming Sequelize CLI is installed or configured in scripts)
npm run migrate

# Start dev server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm ci
npm start
```

## Pull Request Guidelines

1. **Branch Naming:** Use `feat/`, `fix/`, or `chore/` prefixes.
2. **Commit Messages:** We enforce Conventional Commits via our CI pipeline. Your PR title MUST match this format (e.g., `feat(inventory): add low stock alert`).
3. **Tests:** All PRs must pass the Karma (frontend) and Jest (backend) test suites.
4. **Bundle Size:** Pay attention to the automated Bundle Size comment placed on your PR. If a new dependency massively increases the Angular bundle, you may be asked to find a lighter alternative.
