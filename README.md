# Pipeline360 Frontend

Frontend application for the Pipeline360 cloud-native hotel reservation platform.

The service is a static browser application built with HTML, CSS and JavaScript. It is served by NGINX inside a Docker container and communicates with the Pipeline360 Backend through relative `/api` routes.

> [!IMPORTANT]
> Development work is performed on the `dev` branch. Production changes are delivered through reviewed Pull Requests and deployed through the Pipeline360 GitOps workflow.

---

## Related Repositories

| Repository | Responsibility |
|---|---|
| [Pipeline360-Frontend](https://github.com/eli0504167101/Pipeline360-Frontend) | Frontend source, NGINX, Docker image and frontend CI |
| [Pipeline360-Backend](https://github.com/eli0504167101/Pipeline360-Backend) | Node.js REST API and backend CI |
| [Pipeline360-Infra](https://github.com/eli0504167101/Pipeline360-Infra) | Kubernetes manifests, Argo CD and GitOps deployment state |

---

## Features

The frontend allows users to:

- View hotels stored in MongoDB
- View hotel details
- Create a new reservation
- Enter full name and email address
- Select check-in and check-out dates
- Receive a unique reservation ID
- Search by reservation ID, full name or email address
- Display reservation details
- Cancel an existing reservation

---

## Technology Stack

| Area | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 |
| Client logic | JavaScript |
| Web server | NGINX |
| Containerization | Docker |
| CI/CD | GitHub Actions |
| Container registry | Docker Hub |
| Deployment | Kubernetes and Argo CD |

---

## Repository Structure

```text
Pipeline360-Frontend/
├── .github/
│   └── workflows/
│       └── ci.yaml
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
├── package-lock.json
├── package.json
└── README.md
```

---

## Application Pages

### New Reservation

File:

```text
src/index.html
```

Responsibilities:

- Load the hotel list from the Backend
- Display hotel information
- Collect reservation details
- Submit a reservation request
- Display the generated reservation ID

### Reservation Lookup

File:

```text
src/lookup.html
```

Responsibilities:

- Search by reservation ID
- Search by full name
- Search by email
- Display reservation details
- Cancel an existing reservation

---

## API Communication

The frontend uses relative API routes:

```text
GET    /api/reservations/hotels
POST   /api/reservations
GET    /api/reservations/lookup/{query}
DELETE /api/reservations/{reservationId}
```

NGINX proxies `/api/` requests to the Kubernetes Backend service:

```text
backend-service.hotel-system.svc.cluster.local:3000
```

Using relative routes allows the browser to access both the frontend and API through the same Ingress host.

---

## NGINX

Configuration file:

```text
nginx.conf
```

Responsibilities:

- Serve static files from `/usr/share/nginx/html`
- Use `index.html` as the default page
- Proxy `/api/` requests to the Backend
- Forward request headers
- Support direct access to application pages

---

## Local Validation

Install dependencies:

```bash
npm install
```

Run the frontend JavaScript validation:

```bash
npm test
```

Build the Docker image from the repository root:

```bash
docker build \
  -t pipeline360-frontend:local-validation \
  .
```

Run locally:

```bash
docker run \
  --rm \
  -p 8080:80 \
  pipeline360-frontend:local-validation
```

Open:

```text
http://127.0.0.1:8080
```

> [!NOTE]
> API requests require access to the Backend. The full integrated application is normally tested through the Kubernetes Ingress.

---

## Docker Image

Docker Hub repository:

```text
eli0504167101/hotel-frontend
```

The workflow publishes:

```text
frontend-N
latest
```

Kubernetes deploys the immutable versioned tag:

```text
eli0504167101/hotel-frontend:frontend-N
```

---

## GitHub Actions

Workflow file:

```text
.github/workflows/ci.yaml
```

The current workflow is triggered by:

```text
Push to dev
Pull Request to main
```

The workflow performs three jobs:

1. **Validate frontend**
   - Install dependencies
   - Run JavaScript validation
   - Verify required files

2. **Build and push frontend image**
   - Generate a `frontend-N` tag
   - Authenticate to Docker Hub
   - Build and push the image
   - Update `latest`

3. **Open frontend deployment Pull Request**
   - Check out `Pipeline360-Infra/main`
   - Update only:
     ```text
     kubernetes/frontend/deployment.yaml
     ```
   - Create a deployment branch
   - Open a Pull Request to `main`

The workflow does not write directly to the Infrastructure `main` branch. The deployment Pull Request requires review and merge before Argo CD deploys the new image.

---

## Required GitHub Actions Secrets

The repository requires:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
INFRA_REPO_TOKEN
```

Responsibilities:

| Secret | Purpose |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub image owner |
| `DOCKERHUB_TOKEN` | Docker Hub authentication |
| `INFRA_REPO_TOKEN` | Create a branch and Pull Request in Pipeline360-Infra |

> [!WARNING]
> Never store real tokens, passwords or decoded Secret values inside the repository.

---

## Kubernetes Deployment

The Frontend Kubernetes manifests are maintained in:

```text
Pipeline360-Infra/kubernetes/frontend/
```

Files:

```text
deployment.yaml
service.yaml
```

Current desired state:

```text
Deployment: frontend-deployment
Replicas: 5
Service: frontend-service
Service port: 80
Container port: 80
```

The Deployment uses readiness and liveness checks against:

```text
/index.html
```

Argo CD Application:

```text
pipeline360-frontend
```

Managed path:

```text
kubernetes/frontend
```

Git revision:

```text
main
```

---

## Ingress Access

The application is exposed through:

```text
http://hotel.local:3000
```

The Windows hosts file should contain:

```text
127.0.0.1 hotel.local
```

Windows hosts-file path:

```text
C:\Windows\System32\drivers\etc\hosts
```

Check the frontend:

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

## Deployment Flow

```text
Developer
   |
   v
Push to Pipeline360-Frontend/dev
   |
   v
Frontend CI validation
   |
   v
Docker image frontend-N
   |
   v
Push to Docker Hub
   |
   v
Automated PR to Pipeline360-Infra/main
   |
   v
Review and merge
   |
   v
Argo CD detects manifest update
   |
   v
Kubernetes RollingUpdate
   |
   v
5 Ready frontend replicas
```

---

## Verification

Check the Argo CD Application:

```bash
kubectl get application pipeline360-frontend \
  -n argocd \
  -o custom-columns='SYNC:.status.sync.status,HEALTH:.status.health.status,REVISION:.status.sync.revision'
```

Check the Deployment:

```bash
kubectl get deployment frontend-deployment \
  -n hotel-system
```

Check the Pods:

```bash
kubectl get pods \
  -n hotel-system \
  -l app=frontend
```

Check the active image:

```bash
kubectl get deployment frontend-deployment \
  -n hotel-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

Monitor the rollout:

```bash
kubectl rollout status \
  deployment/frontend-deployment \
  -n hotel-system \
  --timeout=180s
```

> [!NOTE]
> `kubectl rollout status` only monitors the rollout. It does not start a deployment.

---

## Git Workflow

Work only on `dev`:

```bash
git switch dev
git pull --ff-only origin dev
git status
```

Commit intended files:

```bash
git add <specific-files>
git commit -m "Describe the frontend change"
git push origin dev
```

After a Pull Request is merged:

```bash
git fetch origin --prune
git merge --ff-only origin/main
git push origin dev
```

Verify branch synchronization:

```bash
git rev-list \
  --left-right \
  --count \
  origin/main...origin/dev
```

Expected:

```text
0  0
```

---

## Troubleshooting

### New image exists but the browser shows old content

Check the deployed image:

```bash
kubectl get deployment frontend-deployment \
  -n hotel-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

If the new image is active, perform a hard browser refresh:

```text
Ctrl + F5
```

Or open a private browsing window.

### Argo CD has not detected a merged manifest change

Normally Argo CD detects the change automatically. For troubleshooting only:

```bash
kubectl annotate application pipeline360-frontend \
  -n argocd \
  argocd.argoproj.io/refresh=hard \
  --overwrite
```

### Verify the CSS inside the running container

```bash
kubectl exec \
  -n hotel-system \
  deployment/frontend-deployment \
  -- grep -n 'input\[type="date"\]' \
  /usr/share/nginx/html/style.css
```

---

## Documentation

Project architecture and Infrastructure documentation are maintained in:

- [Pipeline360-Infra](https://github.com/eli0504167101/Pipeline360-Infra)
- [Pipeline360-Backend](https://github.com/eli0504167101/Pipeline360-Backend)

---

## Author

**Eli Hildesheim**

DevOps Final Project — Pipeline360