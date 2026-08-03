# Frontend Service

## Overview

The frontend service provides the user interface for the Pipeline360 hotel reservation system.

It is a static web application built with HTML, CSS, and JavaScript, and served by NGINX inside a Docker container.

The frontend communicates with the backend through the `/api` path.

---

## Main Features

The frontend allows users to:

- View available hotels
- View hotel details
- Create a reservation
- Receive a unique reservation ID
- Search for a reservation
- Search by reservation ID, full name, or email
- Display reservation details
- Cancel an existing reservation

---

## Technology Stack

- HTML5
- CSS3
- JavaScript
- NGINX
- Docker

---

## Project Structure

```text
frontend-repo/
├── src/
│   ├── index.html
│   ├── lookup.html
│   ├── script.js
│   ├── lookup-script.js
│   └── style.css
├── Dockerfile
├── nginx.conf
├── package.json
└── README.md
```

---

## Application Pages

### Reservation Page

File:

```text
src/index.html
```

Responsibilities:

- Load hotels from the backend
- Display hotel details
- Collect reservation information
- Submit a reservation request
- Display the generated reservation ID

### Reservation Lookup Page

File:

```text
src/lookup.html
```

Responsibilities:

- Search by reservation ID
- Search by full name
- Search by email address
- Display reservation details
- Cancel a reservation

---

## API Communication

The frontend uses relative API paths:

```text
/api/reservations/hotels
/api/reservations
/api/reservations/lookup/{query}
/api/reservations/{reservationId}
```

NGINX proxies `/api` requests to the backend service.

Current internal backend destination:

```text
backend-service.hotel-system.svc.cluster.local:3000
```

---

## NGINX Configuration

Configuration file:

```text
frontend-repo/nginx.conf
```

The configuration:

- Serves static files from `/usr/share/nginx/html`
- Uses `index.html` as the default document
- Proxies `/api/` requests to the backend
- Preserves request headers
- Supports direct access to application pages

---

## Docker

Dockerfile:

```text
frontend-repo/Dockerfile
```

The frontend image is built by GitHub Actions and pushed to Docker Hub.

Image repository:

```text
eli0504167101/hotel-frontend
```

The workflow publishes:

- A versioned image tag
- The `latest` image tag

---

## Kubernetes

Deployment manifest:

```text
infra-repo/kubernetes/frontend/deployment.yaml
```

Service manifest:

```text
infra-repo/kubernetes/frontend/service.yaml
```

Desired replica count:

```text
5
```

Container port:

```text
80
```

Readiness and liveness checks use:

```text
/index.html
```

---

## Ingress Access

The frontend is exposed through the NGINX Ingress host:

```text
hotel.local
```

In the current Kind environment:

```text
http://hotel.local:3000
```

The Windows hosts file must contain:

```text
127.0.0.1 hotel.local
```

---

## Local Development

The frontend is a static application and does not require a JavaScript build process.

To inspect it locally, the recommended method is to build and run its Docker image or use the active Kubernetes deployment.

Example Docker build:

```bash
docker build -t pipeline360-frontend:test frontend-repo
```

Example Docker run:

```bash
docker run --rm -p 8080:80 pipeline360-frontend:test
```

Then open:

```text
http://127.0.0.1:8080
```

---

## Verification

Check the Kubernetes Deployment:

```bash
kubectl get deployment frontend-deployment -n hotel-system
```

Check frontend Pods:

```bash
kubectl get pods -n hotel-system -l app=frontend
```

Check the deployed image:

```bash
kubectl get deployment frontend-deployment \
  -n hotel-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

Check the page through Ingress:

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

## Related Documentation

- `../README.md`
- `../PIPELINE360_STARTUP_GUIDE.md`
- `../backend-repo/README.md`
- `../infra-repo/README.md`