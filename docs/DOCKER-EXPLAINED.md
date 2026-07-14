# 🐳 Docker Files — Full Plain-English Explanation

> Every Docker file in AI-Pulse explained simply, line by line.

---

## Why Are There So Many Files?

Because one Docker file cannot do everything.
Your app has **3 separate programs** that all need to run together:

| Program  | What it is                                       |
| -------- | ------------------------------------------------ |
| **MySQL**    | The database — stores all inventory data         |
| **Backend**  | Node.js server — the API your frontend calls     |
| **Frontend** | Angular app — the UI people see in a browser     |

Each program needs its own setup instructions (a `Dockerfile`).
Then you need a file that says "start all 3 together" (`docker-compose.yml`).
Then there are separate files for **local development** vs **production on a server**.

---

## The 7 Files — Quick Map

```
Root/
├── .dockerignore                ← "ignore these files when building images"
├── docker-compose.yml           ← "start all 3 services together" (main file)
├── docker-compose.override.yml  ← "extra settings for YOUR local machine only"
├── docker-compose.prod.yml      ← "settings for a real server/cloud"
│
├── backend/
│   └── Dockerfile               ← "how to build the Node.js backend image"
│
└── frontend/
    ├── Dockerfile               ← "how to build the Angular frontend image"
    └── nginx.conf               ← "how Nginx serves the Angular app"
```

---

## FILE 1 — `backend/Dockerfile`

**What it does:** Tells Docker how to package the Node.js backend into a small, safe container.

```dockerfile
# Stage 1 (deps):   Install production-only dependencies
# Stage 2 (runner): Copy only what's needed — no dev tools, no secrets
```

This is called a **multi-stage build**. Think of it like a factory with 2 rooms:
- Room 1 does the messy work (installs npm packages)
- Room 2 is the clean final product (only ships what the app needs to RUN)

**Why?** The final image goes from ~600 MB down to ~80 MB.

---

### Line-by-line breakdown

```dockerfile
FROM node:20-alpine AS deps
```
Start from an official Node.js image (version 20) based on Alpine Linux.  
**Alpine** = a very tiny version of Linux (~5 MB). Normal Linux is ~200 MB.  
`AS deps` = give this stage the name "deps" so Stage 2 can refer to it.

---

```dockerfile
WORKDIR /app
```
All commands from here will run inside the `/app` folder inside the container.
Same as doing `cd /app` on your computer.

---

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --prefer-offline
```
Copy the two package files **first**, then install.  
**Why not copy everything first?** Docker is smart — if `package.json` hasn't changed, it skips the install step on the next build. This saves minutes of waiting.  
`--omit=dev` = skip dev packages like Jest (not needed in production).  
`--prefer-offline` = use cached packages if possible (faster build).

---

```dockerfile
FROM node:20-alpine AS runner
```
Start a **fresh, empty** Node.js container. This is Stage 2.  
We do NOT carry over the messy build tools from Stage 1.

---

```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
```
**Security rule:** Never run your app as the "root" (admin) user inside a container.  
If a hacker breaks in, root access = they own everything.  
This creates a normal user called `appuser` in a group called `appgroup`.

---

```dockerfile
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./
```
Copy the installed `node_modules` FROM Stage 1 (deps stage) into this clean container.  
Then copy only the source code. No test files, no docs, no secrets.

---

```dockerfile
RUN mkdir -p logs && chown -R appuser:appgroup /app
USER appuser
```
Create the logs folder. Give ownership of `/app` to `appuser`.  
`USER appuser` = from this line on, all commands run as the non-root user.

---

```dockerfile
EXPOSE 3000
```
Tell Docker "this container listens on port 3000".  
This does **not** open the port — it is just documentation.  
The actual port opening happens in `docker-compose.yml`.

---

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
```
**Health check** = Docker checks "is the backend alive?" every 30 seconds.  
It calls the `/health` endpoint. If it fails 3 times in a row → container marked "unhealthy".  
`start-period=30s` = wait 30 seconds before starting checks (app needs time to boot).  
`wget -qO-` = download the URL silently and print the result. `-q` = quiet, `-O-` = print to screen.  
`|| exit 1` = if wget fails, exit with error code 1 (means unhealthy).

---

```dockerfile
CMD ["node", "src/server.js"]
```
The command that starts your app when the container boots.

---

## FILE 2 — `frontend/Dockerfile`

**What it does:** Builds the Angular app, then serves it with Nginx. Two stages again.

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline
COPY . .
RUN npm run build -- --configuration production
```
Stage 1 = "builder". Install ALL packages (including Angular CLI), then compile the app.  
`npm run build -- --configuration production` = makes minified, optimised JS/CSS files.  
Output goes to `dist/ai-pulse-frontend/browser/` folder.

---

```dockerfile
FROM nginx:1.27-alpine AS runner
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist/ai-pulse-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```
Stage 2 = "runner". Start a fresh, tiny Nginx (web server) container.  
**Nginx** = a fast, lightweight web server. Replaces Node.js for serving static files.  
Delete the default Nginx welcome page.  
Copy the compiled Angular files into the Nginx serving folder.  
Copy our custom `nginx.conf` so Nginx knows the rules (routing, API proxy, etc.).

> **Result:** The final image is ~30 MB. If we kept Node.js it would be ~600 MB.

---

## FILE 3 — `frontend/nginx.conf`

**What it does:** Tells Nginx HOW to serve the Angular app. This has 4 sections.

### Section 1 — Security Headers

```nginx
add_header X-Frame-Options           "SAMEORIGIN"   always;
add_header X-Content-Type-Options    "nosniff"      always;
add_header X-XSS-Protection          "1; mode=block" always;
add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
```

These are HTTP security headers. They protect users from common web attacks:

| Header | What it stops |
|--------|--------------|
| `X-Frame-Options SAMEORIGIN` | Other websites embedding your app in an `<iframe>` (clickjacking) |
| `X-Content-Type-Options nosniff` | Browser guessing file types (type confusion attack) |
| `X-XSS-Protection 1; mode=block` | JavaScript injection attacks in old browsers |
| `Referrer-Policy` | Too much info being shared when users click links |

### Section 2 — Gzip Compression

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript ...
gzip_min_length 1024;
```
Nginx compresses files before sending them to the browser.  
`gzip_min_length 1024` = only compress files larger than 1 KB (tiny files aren't worth it).  
Result: JS/CSS files can be 60–80% smaller → page loads faster.

### Section 3 — Reverse Proxy (most important!)

```nginx
location /api/ {
    proxy_pass http://backend:3000;
    ...
}
```
When the browser sends a request to `/api/anything`, Nginx forwards it to the backend container.  
`backend` = the name of the backend service in docker-compose. Docker automatically resolves this name to the backend container's IP address. This is called **internal DNS**.

**Why is this needed?**  
The browser can only talk to Nginx (port 4200).  
Nginx secretly forwards API requests to the backend (port 3000).  
The backend is NOT directly exposed to the internet in production.

### Section 4 — Angular HTML5 Routing Fix

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```
Angular uses "client-side routing" — URLs like `/dashboard` or `/inventory` don't exist as real files.  
If someone refreshes the page at `/dashboard`, Nginx would normally return a 404 error.  
`try_files $uri $uri/ /index.html` = "if the file doesn't exist, serve `index.html` instead."  
Angular's router then takes over and shows the correct page.

---

## FILE 4 — `docker-compose.yml` (THE MAIN FILE)

**What it does:** Starts all 3 services (db, backend, frontend) together with one command.

### The `db` service (MySQL)

```yaml
db:
  image: mysql:8.4
  environment:
    MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
    MYSQL_DATABASE:      ${DB_NAME:-ai_pulse_db}
```
Use the official MySQL 8.4 image.  
`${DB_PASSWORD}` = reads the value from your `backend/.env` file. Secrets are not hardcoded.  
`${DB_NAME:-ai_pulse_db}` = use the env var, OR default to `ai_pulse_db` if not set.

```yaml
  volumes:
    - db_data:/var/lib/mysql
    - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
    - ./database/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql:ro
```
`db_data:/var/lib/mysql` = MySQL stores data here. The named volume `db_data` means data **survives** even if you delete and recreate the container.  
`schema.sql` and `seed.sql` are auto-run on first boot (MySQL reads the `initdb.d` folder automatically).  
`:ro` = read-only. The container can read the file but not change it.

```yaml
  healthcheck:
    test: ["CMD-SHELL", "mysqladmin ping -h localhost -u root -p$$MYSQL_ROOT_PASSWORD --silent"]
```
Check if MySQL is ready to accept connections.  
`$$MYSQL_ROOT_PASSWORD` — double `$$` is needed because Docker Compose would eat the first `$`. The container's shell sees it as `$MYSQL_ROOT_PASSWORD`.

### The `backend` service

```yaml
  depends_on:
    db:
      condition: service_healthy
```
Backend does **not** start until the db health check passes. Without this, the backend would crash immediately because MySQL wasn't ready yet.

```yaml
  env_file:
    - ./backend/.env
  environment:
    DB_HOST: db
```
Load all variables from `backend/.env` into the container.  
Then **override** `DB_HOST` to be `db` (the name of the MySQL service).  
This is important — inside Docker, the MySQL server is NOT at `localhost`, it's at `db`.

### The `frontend` service

```yaml
  ports:
    - "4200:80"
```
Map port 4200 on your computer → port 80 inside the container.  
So you visit `http://localhost:4200` and it goes to Nginx (which runs on port 80).

### Named Volumes and Networks

```yaml
volumes:
  db_data:
  backend_logs:

networks:
  ai_pulse_net:
    driver: bridge
```
**Volumes** = persistent storage. `db_data` survives container restarts.  
**Networks** = all 3 containers are on the same private network (`ai_pulse_net`).  
They can talk to each other using service names (like `backend`, `db`).  
They are isolated from other Docker containers on your machine.

---

## FILE 5 — `docker-compose.override.yml` (LOCAL DEV ONLY)

**What it does:** Automatically merged with `docker-compose.yml` when you run `docker compose up` locally.  
It is listed in `.gitignore` — **never committed to GitHub** — because it's only for your local machine.

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile.dev
  volumes:
    - ./backend/src:/app/src:delegated
    - /app/node_modules
  command: ["node_modules/.bin/nodemon", "src/server.js"]
```
In development, use **nodemon** instead of plain `node`.  
**nodemon** = restarts the server automatically when you change a `.js` file.  
`./backend/src:/app/src:delegated` = **bind mount**. Your local `src/` folder is connected directly into the container. Edit a file on your PC → the container sees it instantly. **No rebuild needed.**  
`/app/node_modules` = anonymous volume. This prevents your Windows `node_modules` from overwriting the Linux `node_modules` inside the container (they are incompatible).

---

## FILE 6 — `docker-compose.prod.yml` (PRODUCTION SERVER)

**What it does:** Used on a cloud server/VPS. Instead of building images locally, it **pulls** pre-built images from Docker Hub.

```yaml
backend:
  image: ${DOCKERHUB_USERNAME}/ai-pulse-backend:latest
  build: !reset null
```
`image: ...` = pull this image from Docker Hub.  
`build: !reset null` = disable the `build:` key from `docker-compose.yml`. Without this, Docker would try to build AND pull, which is an error.

**Usage on a server:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
The two `-f` flags = "use BOTH files, merge them". The prod file wins on conflicts.

---

## FILE 7 — `.dockerignore` (ROOT)

**What it does:** Like `.gitignore` but for Docker. Tells Docker "don't copy these files into the image when building."

```
**/node_modules/     ← Never copy node_modules (huge, incompatible, rebuilt inside container)
**/.env              ← NEVER copy secrets into an image (anyone can read them with docker inspect)
!**/.env.example     ← Exception: DO copy the example file (it has no real secrets)
**/.git/             ← No need for git history inside the container
docs/                ← Documentation is not needed at runtime
```

`**` means "in any subfolder". So `**/node_modules/` matches `backend/node_modules/` AND `frontend/node_modules/`.  
The `!` at the start means "exception — don't ignore this one".

---

## Summary: When Does Each File Get Used?

| Situation | Files used |
|-----------|-----------|
| `docker compose up --build` (local dev) | `docker-compose.yml` + `docker-compose.override.yml` (auto-merged) |
| Running on a production server | `docker-compose.yml` + `docker-compose.prod.yml` (manually specified) |
| `docker build` inside `backend/` | `backend/Dockerfile` |
| `docker build` inside `frontend/` | `frontend/Dockerfile` + `frontend/nginx.conf` |
| Any `docker build` anywhere | `.dockerignore` (tells what to exclude) |

---

## The Complete Flow When You Run `docker compose up --build`

```
1.  Docker reads docker-compose.yml
2.  Docker reads docker-compose.override.yml (auto-merged)
3.  Docker builds backend image  → uses backend/Dockerfile
4.  Docker builds frontend image → uses frontend/Dockerfile + nginx.conf
5.  Docker starts the db container (MySQL)
6.  Docker WAITS until db health check passes (mysqladmin ping)
7.  Docker starts the backend container
8.  Docker WAITS until backend health check passes (/health endpoint)
9.  Docker starts the frontend (Nginx) container
10. You open http://localhost:4200 → Nginx serves Angular
11. Angular calls /api/...  → Nginx proxies to backend:3000
12. Backend queries the MySQL db container
```
