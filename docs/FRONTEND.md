# 🖥️ Frontend Architecture Guide

This document outlines the architecture, technology stack, and core design principles of the **AI-Pulse Frontend**.

## 🛠️ Technology Stack
- **Framework**: Angular 17 (TypeScript)
- **UI Library**: Angular Material & Custom SCSS
- **State/Reactivity**: RxJS (Observables, Subjects)
- **Data Visualization**: Chart.js
- **Routing**: HTML5 History API (Managed by Angular Router)

## 🏗️ Core Architecture

The frontend is built as a **Single Page Application (SPA)** with strict role-based access control.

### 1. Interceptors & Authentication
Every outgoing HTTP request to the backend is intercepted by the `JwtInterceptor`. It automatically attaches the `Bearer <token>` to the `Authorization` header. If the server responds with a `401 Unauthorized`, the interceptor automatically logs the user out and redirects them to the login screen.

### 2. Route Guards (Security)
Angular `CanActivate` route guards prevent unauthorized users from accessing specific dashboards:
- **`AuthGuard`**: Ensures the user is logged in.
- **`RoleGuard`**: Checks the JWT payload to ensure the user has the correct role (e.g., `ADMIN`, `MANAGER`) before rendering the route.

### 3. Role-Based Dashboards
The application dynamically routes users based on their role:
* **Admin Command Center**: AI trend analysis triggers, full signal tables, and CSV exports.
* **Manager Dashboard**: Purchase order (PO) approval workflows and stock alert reviews.
* **Analyst Studio**: 30-day demand forecast charts (Chart.js) and data filtering.
* **Warehouse Ops**: Bin location management and PO dispatch/receive workflows.

## 📦 Containerization (Docker Multi-Stage Build)

To keep the production image small and secure, the frontend uses a **Multi-Stage Docker Build**:
1. **Stage 1 (Builder)**: Uses `node:alpine`. Installs dependencies and runs `ng build --configuration production`. The `NODE_OPTIONS="--max-old-space-size=1536"` flag prevents the Angular esbuild compiler from crashing on low-memory servers like AWS EC2 `t2.micro`.
2. **Stage 2 (Runner)**: Uses `nginx:alpine`. It drops the heavy Node.js environment entirely, copies only the compiled static HTML/CSS/JS files from Stage 1, and serves them using Nginx. This reduces the final Docker image from ~600MB down to just ~30MB.
