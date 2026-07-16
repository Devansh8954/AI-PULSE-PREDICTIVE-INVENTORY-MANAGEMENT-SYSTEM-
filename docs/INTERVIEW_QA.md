# 🎤 Interview Q&A Cheat Sheet

This document contains detailed answers to technical questions you might be asked during a software engineering interview regarding this project.

---

### Q1: Why did you use Docker for this project? What problem does it solve?
**Answer**: "I used Docker to achieve **Environment Parity**. In the past, applications would work perfectly on a developer's Windows machine but crash on a Linux production server due to different Node versions or missing database configurations. By containerizing the database, backend, and frontend, I ensure the application behaves exactly the same way everywhere. It also makes deployment incredibly easy—a single `docker compose up` command spins up the entire infrastructure."

---

### Q2: What is Nginx and how are you using it?
**Answer**: "Nginx is an enterprise-grade web server. In my project, it plays three critical roles:
1. **Static File Server**: It serves the compiled Angular frontend (HTML/CSS/JS) to the user's browser very quickly.
2. **Reverse Proxy**: My Node.js backend runs on port 3000, but I don't expose port 3000 to the internet for security reasons. Instead, Nginx listens for `/api/` requests and secretly forwards them to the backend via an internal Docker network.
3. **SSL Termination**: Nginx holds my Let's Encrypt certificates, encrypts all traffic, and forces HTTP requests to redirect to HTTPS."

---

### Q3: How did you implement Continuous Integration (CI/CD)?
**Answer**: "I used **GitHub Actions**. I wrote workflow files (`ci.yml` and `pr-gate.yml`) that act as automated quality gates. Whenever I push code or create a Pull Request, GitHub spins up a virtual server, installs dependencies, and runs my ESLint checks and Jest automated test suites. If the code is broken, the pipeline fails and prevents me from deploying bad code to my AWS `main` branch."

---

### Q4: How do you prevent data corruption if two warehouse workers update the same inventory item at the exact same time?
**Answer**: "I implemented **Optimistic Concurrency Control (OCC)**. Instead of locking the database rows (which slows down the system), I added a `version` column to the inventory table. When a user tries to update stock, the SQL query requires the version number to match what the user currently sees on their screen. If it matches, the stock is updated and the version increments by 1. If worker B tries to update a split-second later, their version number is now outdated, the database rejects the update, and the API returns a `409 Conflict`, asking the user to refresh."

---

### Q5: How is the AI actually integrated? 
**Answer**: "I integrated the Google Gemini 1.5 Flash SDK in my backend Node.js Service layer. The admin inputs a market keyword (e.g., 'summer heatwave'). The backend prompts the AI to return a structured JSON array of products it predicts will spike in demand. My backend then takes that AI data and performs a SQL JOIN-like operation against my live MySQL inventory levels. If the AI predicts high demand for an item that is currently low in stock, my system automatically flags it for the procurement team."
