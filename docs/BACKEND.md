# ⚙️ Backend Architecture Guide

This document outlines the architecture, database design, and business logic of the **AI-Pulse Node.js Backend**.

## 🛠️ Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.x
- **ORM**: Sequelize
- **AI Integration**: Google Gemini 1.5 Flash SDK
- **Security**: Helmet, bcryptjs, jsonwebtoken, express-rate-limit
- **Validation**: Joi

## 🏗️ Core Architecture (Layered Pattern)

The backend strictly follows the **Controller → Service → Repository** pattern. This separation of concerns ensures the code is highly testable and maintainable.

1. **Controllers**: Handle HTTP concerns. They parse incoming requests, validate them using `Joi`, call the appropriate Service, and format the HTTP JSON response.
2. **Services**: Contain all business logic. They orchestrate data between multiple repositories, throw domain-specific errors (e.g., `NotFoundError`), and interact with external APIs (like Google Gemini). *No SQL or HTTP logic exists here.*
3. **Repositories**: Handle all data persistence. They execute Sequelize ORM methods or raw SQL queries against the MySQL database.

## 🧠 Key Features & Mechanisms

### 1. Optimistic Concurrency Control (OCC)
In a warehouse, two workers might try to update the same stock keeping unit (SKU) at the exact same millisecond. To prevent data corruption, AI-Pulse uses OCC.
- Every inventory row has a `version` integer.
- An update query looks like: `UPDATE inventory SET qty = ?, version = version + 1 WHERE id = ? AND version = ?`.
- If the `version` has changed since the user fetched the page, the database updates 0 rows, and the API throws an HTTP `409 Conflict`, forcing the frontend to refresh the data.

### 2. AI Trend Pipeline
When a user triggers an AI analysis (e.g., keyword: "Winter coming"):
1. The Service calls Google Gemini to predict which product categories will spike.
2. The AI returns a JSON array of predicted products.
3. The Service cross-references these AI predictions with the **live MySQL inventory levels**.
4. If a predicted product has low stock, the system automatically inserts a `trend_signal` row, alerting the procurement managers.

### 3. Middleware Security
- **JWT Auth**: Verifies tokens on protected routes.
- **Role Authorization**: Rejects requests if the user's role (extracted from the JWT) does not match the endpoint's allowed roles.
- **Rate Limiting**: Prevents DDoS and brute-force attacks by limiting IP requests (e.g., max 100 requests per 15 minutes).
