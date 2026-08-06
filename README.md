# Pipeline360 Frontend

## Overview

Pipeline360 Frontend is the web user interface of the Pipeline360 cloud-native hotel reservation platform.

The application is implemented as a static website using HTML, CSS and JavaScript and is served by NGINX inside a Docker container.

The frontend communicates with the backend through relative `/api` routes, allowing both services to be accessed through the same Kubernetes Ingress.

This repository is responsible for:

- Frontend source code
- NGINX configuration
- Docker image
- Frontend CI/CD pipelines

The complete platform architecture, Kubernetes manifests, GitOps workflow and Argo CD configuration are documented in the **Pipeline360-Infra** repository.

---

## Related Repositories

| Repository | Responsibility |
|------------|----------------|
| Pipeline360-Frontend | Frontend application, Docker image and frontend CI/CD |
| Pipeline360-Backend | Node.js REST API and business logic |
| Pipeline360-Infra | Kubernetes manifests, Argo CD, GitOps deployment and complete project documentation |

---

## Features

The frontend allows users to:

- View available hotels
- Display hotel details
- Create hotel reservations
- Select check-in and check-out dates
- Receive a unique reservation identifier
- Search reservations
- View reservation details
- Cancel existing reservations

---

## Technology Stack

| Area | Technology |
|------|------------|
| Markup | HTML5 |
| Styling | CSS3 |
| Client Logic | JavaScript (ES6) |
| Web Server | NGINX |
| Containerization | Docker |
| Container Registry | Docker Hub |
| CI/CD | GitHub Actions |
| Deployment | Kubernetes |
| GitOps | Argo CD |

---

## Repository Structure

```text
Pipeline360-Frontend/
│
├── .github/
│   └── workflows/
│       ├── ci.yaml
│       └── deployment-preparation.yaml
│
├── src/
│   ├── index.html
│   ├── lookup.html
│   ├── script.js
│   ├── lookup-script.js
│   └── style.css
│
├── .dockerignore
├── Dockerfile
├── nginx.conf
├── package.json
├── package-lock.json
└── README.md
```

---

## Application Pages

### New Reservation

File

```text
src/index.html
```

Responsibilities

- Load hotels from the Backend API
- Display available hotels
- Collect reservation details
- Validate user input
- Submit reservation requests
- Display the generated reservation ID

---

### Reservation Lookup

File

```text
src/lookup.html
```

Responsibilities

- Search by reservation ID
- Search by customer name
- Search by email address
- Display reservation details
- Cancel reservations

---

## Backend Communication

The frontend communicates with the backend using relative API routes.

```text
GET    /api/reservations/hotels
POST   /api/reservations
GET    /api/reservations/lookup/{query}
DELETE /api/reservations/{reservationId}
```

NGINX proxies all `/api` requests to the Backend Kubernetes Service.

This design enables the browser to communicate with both services through a single Ingress endpoint without exposing internal cluster addresses.

---

## Docker Image

The frontend Docker image is published automatically by GitHub Actions.

Docker Hub repository:

```text
eli0504167101/hotel-frontend
```

Published tags:

```text
frontend-N
latest
```

Where:

- `frontend-N` is an immutable version generated from the GitHub Actions workflow run number.
- `latest` always points to the newest successful build.

Kubernetes always deploys the immutable versioned image.

Example:

```text
eli0504167101/hotel-frontend:frontend-14
```

---

## Local Validation

Install dependencies:

```bash
npm install
```

Run frontend validation:

```bash
npm test
```

Build the Docker image:

```bash
docker build \
  -t pipeline360-frontend:local .
```

Run locally:

```bash
docker run \
  --rm \
  -p 8080:80 \
  pipeline360-frontend:local
```

Open:

```text
http://127.0.0.1:8080
```

> [!NOTE]
> Local execution serves only the frontend.
> Backend API requests require either the Backend service or the complete Kubernetes environment.

---

# GitHub Actions

The frontend repository implements **two independent GitHub Actions pipelines**.

This architecture follows the project requirements by separating:

- Continuous Integration (CI)
- Deployment Preparation

The deployment preparation workflow is triggered **only after** a successful CI workflow.

---

## Pipeline 1 — Frontend CI

Workflow:

```text
.github/workflows/ci.yaml
```

Trigger:

```text
Push → dev branch
```

Responsibilities

- Validate the frontend source code
- Install project dependencies
- Execute JavaScript validation
- Verify repository structure
- Build Docker image
- Push Docker image to Docker Hub

Generated Docker tags:

```text
frontend-N
latest
```

Pipeline overview:

```text
Developer
      │
      ▼
Push to dev
      │
      ▼
Validate Frontend
      │
      ▼
Install Dependencies
      │
      ▼
Run Tests
      │
      ▼
Build Docker Image
      │
      ▼
Push frontend-N
      │
      ▼
Push latest
```

---

## Pipeline 2 — Frontend Deployment Preparation

Workflow:

```text
.github/workflows/deployment-preparation.yaml
```

Trigger:

```text
Successful completion of Frontend CI
```

Responsibilities

1. Read the completed workflow information.

2. Generate the matching Docker image tag.

Example:

```text
frontend-14
```

3. Clone the Infrastructure repository.

```text
Pipeline360-Infra
```

4. Update only:

```text
kubernetes/frontend/deployment.yaml
```

5. Create a deployment branch.

Example:

```text
deployment/frontend-123456789
```

6. Commit the manifest update.

7. Push the deployment branch.

8. Automatically open a Pull Request to:

```text
Pipeline360-Infra/main
```

The Infrastructure repository remains the **single source of truth**.

No deployment is performed directly from this repository.

---

## GitOps Deployment Workflow

```text
Developer
      │
      ▼
Push to Frontend/dev
      │
      ▼
──────────────────────────────
Pipeline 1
Frontend CI
──────────────────────────────
      │
      ▼
Validate
      │
      ▼
Build Docker Image
      │
      ▼
Push frontend-N
      │
      ▼
──────────────────────────────
Pipeline 2
Deployment Preparation
──────────────────────────────
      │
      ▼
Update
Pipeline360-Infra
      │
      ▼
Create Deployment Branch
      │
      ▼
Open Pull Request
      │
      ▼
Code Review
      │
      ▼
Merge to main
      │
      ▼
Argo CD detects manifest change
      │
      ▼
Rolling Update
      │
      ▼
Frontend Deployment
```

---

## Required GitHub Actions Secrets

The repository requires the following GitHub Secrets.

| Secret | Purpose |
|---------|---------|
| `DOCKERHUB_USERNAME` | Docker Hub account |
| `DOCKERHUB_TOKEN` | Docker Hub authentication |
| `INFRA_REPO_TOKEN` | Create deployment branches and Pull Requests in Pipeline360-Infra |

> [!IMPORTANT]
> No passwords, Personal Access Tokens, Kubernetes Secrets or decoded Secret values are stored inside this repository.


---

# Kubernetes Deployment

The frontend Kubernetes manifests are maintained in the **Pipeline360-Infra** repository.

Manifest location:

```text
kubernetes/frontend/
```

Files:

```text
deployment.yaml
service.yaml
```

The frontend repository never updates the Kubernetes cluster directly.

Instead, it updates the Infrastructure repository through an automated Pull Request, following the GitOps deployment model.

---

## Deployment Configuration

Current deployment:

| Resource | Value |
|----------|-------|
| Deployment | frontend-deployment |
| Namespace | hotel-system |
| Replicas | 5 |
| Service | frontend-service |
| Service Port | 80 |
| Container Port | 80 |

---

## Health Checks

The frontend container uses Kubernetes readiness and liveness probes.

Probe endpoint:

```text
/index.html
```

These probes allow Kubernetes to:

- Detect unhealthy containers
- Prevent traffic from reaching containers that are not ready
- Perform automatic Rolling Updates
- Recover failed containers

---

# Argo CD

The frontend deployment is managed by Argo CD.

Application:

```text
pipeline360-frontend
```

Repository:

```text
Pipeline360-Infra
```

Target Branch:

```text
main
```

Managed Path:

```text
kubernetes/frontend
```

Argo CD continuously monitors the Infrastructure repository.

Whenever a new frontend image tag is merged into the deployment manifest, Argo CD automatically synchronizes the Kubernetes cluster.

---

## GitOps Workflow

Pipeline360 follows a GitOps deployment strategy.

The deployment process is intentionally divided into two stages:

1. Build and publish a Docker image.
2. Update Infrastructure through a Pull Request.

Only after the Infrastructure Pull Request has been reviewed and merged does Argo CD deploy the new version.

This ensures that every deployment is:

- Version controlled
- Reviewable
- Auditable
- Reproducible

---

## Rolling Update

Frontend deployments use the default Kubernetes RollingUpdate strategy.

Benefits include:

- Zero downtime deployment
- No interruption to active users
- Gradual replacement of Pods
- Automatic rollback support when required

Typical deployment flow:

```text
5 Ready Pods
      │
      ▼
Create New Pod
      │
      ▼
Readiness Check
      │
      ▼
Route Traffic
      │
      ▼
Terminate Old Pod
      │
      ▼
Repeat Until Complete
```

---

# Ingress

The application is exposed through the Kubernetes Ingress.

Development URL:

```text
http://hotel.local:3000
```

Windows hosts file:

```text
C:\Windows\System32\drivers\etc\hosts
```

Required entry:

```text
127.0.0.1 hotel.local
```

Verify access:

```bash
curl -I \
  -H "Host: hotel.local" \
  http://127.0.0.1:3000/
```

Expected response:

```text
HTTP/1.1 200 OK
```

---

# Verification

Verify the Argo CD application:

```bash
kubectl get application pipeline360-frontend \
  -n argocd \
  -o custom-columns='SYNC:.status.sync.status,HEALTH:.status.health.status,REVISION:.status.sync.revision'
```

Expected:

```text
Synced
Healthy
```

---

Verify the Deployment:

```bash
kubectl get deployment frontend-deployment \
  -n hotel-system
```

---

Verify the Pods:

```bash
kubectl get pods \
  -n hotel-system \
  -l app=frontend
```

---

Verify the active Docker image:

```bash
kubectl get deployment frontend-deployment \
  -n hotel-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

Example:

```text
eli0504167101/hotel-frontend:frontend-14
```

---

Monitor the rollout:

```bash
kubectl rollout status \
  deployment/frontend-deployment \
  -n hotel-system \
  --timeout=180s
```

> [!NOTE]
> This command monitors an existing rollout.
> It does not initiate a deployment.

---

## Browser Validation

After a successful deployment:

- Open:

```text
http://hotel.local:3000
```

Verify:

- The frontend loads successfully
- Hotels are displayed
- Reservations can be created
- Reservation lookup works
- Reservation cancellation works


---

# Git Workflow

Development follows a Git Flow strategy using two long-lived branches.

| Branch | Purpose |
|---------|---------|
| `dev` | Active development |
| `main` | Production-ready code |

Development process:

```bash
git switch dev
git pull --ff-only origin dev
git status
```

Commit only the intended files:

```bash
git add <specific-files>

git commit -m "Describe the frontend change"

git push origin dev
```

After the automated CI workflow completes:

1. The Docker image is published.
2. A deployment Pull Request is created automatically in **Pipeline360-Infra**.
3. The Pull Request is reviewed.
4. The Pull Request is merged into `main`.
5. Argo CD deploys the new frontend version.

After merging:

```bash
git fetch origin --prune

git merge --ff-only origin/main

git push origin dev
```

Verify synchronization:

```bash
git rev-list \
    --left-right \
    --count \
    origin/main...origin/dev
```

Expected:

```text
0    0
```

---

# Troubleshooting

## Browser still displays the previous version

Verify the deployed image:

```bash
kubectl get deployment frontend-deployment \
    -n hotel-system \
    -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

If the image is correct:

- Press **Ctrl + F5**
- Or open a private browsing window

---

## Argo CD has not detected the latest manifest

Normally Argo CD detects changes automatically during its reconciliation cycle.

For troubleshooting only:

```bash
kubectl annotate application pipeline360-frontend \
    -n argocd \
    argocd.argoproj.io/refresh=hard \
    --overwrite
```

This command should **not** be part of the normal deployment workflow.

---

## Verify the CSS inside the running container

```bash
kubectl exec \
    deployment/frontend-deployment \
    -n hotel-system \
    -- grep -n "input\\[type=\"date\"\\]" \
    /usr/share/nginx/html/style.css
```

---

## Verify the currently deployed image

```bash
kubectl get deployment frontend-deployment \
    -n hotel-system \
    -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

---

## Check rollout progress

```bash
kubectl rollout status \
    deployment/frontend-deployment \
    -n hotel-system \
    --timeout=180s
```

---

## Check frontend Pods

```bash
kubectl get pods \
    -n hotel-system \
    -l app=frontend
```

All Pods should eventually reach:

```text
READY   STATUS
1/1     Running
```

---

# Documentation

This repository documents only the frontend application.

Complete project documentation is maintained in the **Pipeline360-Infra** repository, including:

- Overall architecture
- GitOps workflow
- Kubernetes manifests
- Argo CD configuration
- MongoDB StatefulSet
- CI/CD architecture
- Deployment process
- Infrastructure validation
- Startup procedures
- Troubleshooting guide

Additional repositories:

- Pipeline360-Backend
- Pipeline360-Infra

---

# Author

**Eli Hildesheim**

DevOps Final Project

Pipeline360

---

# License

This repository was created as part of a DevOps final project.

The project demonstrates modern cloud-native software delivery using:

- Docker
- GitHub Actions
- Kubernetes
- Argo CD
- GitOps
- MongoDB
- NGINX

for educational purposes.