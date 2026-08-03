# CI/CD Pipeline Explained: AI Pulse

This project is a multi-service monorepo containing both an Angular frontend and an Express backend. We use a 2-workflow pipeline architecture.

## Workflow 1: `1-ci-tests.yml`
**Trigger:** Runs on Pull Requests AND pushes to `main`.
**Purpose:** Ensure code quality and prevent broken PRs from being merged.

This workflow handles all testing and static analysis in parallel jobs:
1. **`backend-lint`:** Runs ESLint on the Express code.
2. **`backend-test`:** Runs Jest tests with coverage and posts a summary to the GitHub Actions UI.
3. **`frontend-lint`:** Runs TypeScript type-checking (`tsc --noEmit`).
4. **`frontend-test`:** Runs Karma unit tests using a headless Chrome browser containerized in the GitHub runner.
5. **`pr-title-check`:** (PR only) Enforces Conventional Commits format (e.g., `feat: ...`, `fix: ...`).
6. **`bundle-size`:** (PR only) If frontend files were modified, builds a production bundle and comments the bundle size on the PR to prevent silent bundle bloat.
7. **`all-checks-pass`:** A required status check gate that fails if any of the parallel jobs fail.

## Workflow 2: `2-docker-deploy.yml`
**Trigger:** Runs ONLY on pushes to `main`.
**Purpose:** Deploy the validated codebase to production.

This workflow operates in two stages:
1. **Docker Build & Push:** Uses Docker Buildx with GitHub Actions cache (`type=gha`) to quickly build both the `frontend` and `backend` images and push them to Docker Hub.
2. **Deploy to AWS EC2:** Uses SSH to connect to our production EC2 instance. It pulls the latest images from Docker Hub, restarts the `docker-compose.prod.yml` stack, prunes old images, and runs a curl health check to ensure the backend booted successfully.

## Monorepo CI Optimizations
Because this is a monorepo, we use the `dorny/paths-filter` action in the bundle size job. If a PR only modifies backend Node.js files, we skip the expensive Angular production build entirely, saving CI runner minutes.
