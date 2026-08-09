# AI-Pulse Predictive Inventory Management System

An enterprise-grade, full-stack inventory management platform that uses AI to forecast demand and predict stock shortages before they happen.

## Key Features
- **Predictive AI Forecasting:** Integrates with the Gemini API to analyze market trends and recommend stock levels.
- **Optimistic Concurrency Control (OCC):** Ensures data integrity when multiple warehouse workers update stock simultaneously, preventing race conditions without locking the database.
- **Role-Based Access Control (RBAC):** Secure JWT authentication with distinct dashboards for Admins, Managers, Analysts, and Warehouse staff.
- **Real-Time Dashboards:** Interactive Angular UI with dynamic charting (Chart.js) to visualize inventory health.

## Tech Stack
- **Frontend:** Angular 17, TypeScript, TailwindCSS
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **AI Integration:** Google Gemini API

## Setup Instructions
Please see the [SETUP.md](SETUP.md) file for complete local installation and database seeding instructions.

## Contributing
Please see the [CONTRIBUTING.md](CONTRIBUTING.md) for our Git branching strategy and coding standards.
