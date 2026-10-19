# 🐳 Docker Notes App — Docker Practical Assignment

A simple 3-tier web application, fully containerized with Docker:

| Tier | Technology | Container | Image |
|------|-----------|-----------|-------|
| Frontend | HTML/CSS/JS served by **Nginx** | `notes-frontend` | custom, built `FROM alpine` |
| Backend | **Node.js + Express** REST API | `notes-backend` | custom, built `FROM alpine` |
| Database | **PostgreSQL 16** | `notes-db` | `postgres:16-alpine` |

Users can create notes, attach a file to a note, and delete notes. Notes are stored in PostgreSQL;
uploaded files are stored on disk inside a Docker volume.

```
            port 8080                     frontend-net                  backend-net
 Browser ───────────────► [ frontend ] ─────────────► [ backend ] ─────────────► [ db ]
                           Nginx :80   /api/* proxy    Node :5000                Postgres :5432
                                                          │                         │
                                                  notes-uploads (vol)      notes-db-data (vol)
```

## Project structure

```
.
├── docker-compose.yml      # Runs all 3 services, networks and volumes
├── setup.sh                # Pull alpine, create external volumes, start everything
├── backend/
│   ├── Dockerfile          # FROM alpine + nodejs/npm
│   ├── package.json
│   └── server.js           # Express API (notes CRUD + file upload)
├── frontend/
│   ├── Dockerfile          # FROM alpine + nginx
│   ├── nginx.conf          # Serves static files, proxies /api to backend
│   └── public/             # index.html, style.css, app.js
└── database/
    └── init.sql            # Creates the notes table on first start
```

---

## How each requirement is covered

### 1. Pull the image `alpine`
```bash
docker pull alpine:3.20
docker images alpine
```
Both custom images (`backend` and `frontend`) are built on top of it (`FROM alpine:3.20`).

### 2. Write a Dockerfile to build a custom image
- [`backend/Dockerfile`](backend/Dockerfile): installs Node.js with `apk`, installs npm dependencies, copies the code.
- [`frontend/Dockerfile`](frontend/Dockerfile): installs Nginx with `apk`, copies the config and static website.

Build them manually:
```bash
docker build -t notes-backend:1.0  ./backend
docker build -t notes-frontend:1.0 ./frontend
```

### 3. Run inside a container with port mapping
| Host port | Container port | Service |
|-----------|----------------|---------|
| `8080` | `80` | frontend → open **http://localhost:8080** |
| `5000` | `5000` | backend API → e.g. http://localhost:5000/api/health |

### 4. Docker volume to persist data (external volumes)
Two **external** volumes are used:

| Volume | Mounted at | Stores |
|--------|-----------|--------|
| `notes-db-data` | `/var/lib/postgresql/data` (db) | database data |
| `notes-uploads` | `/app/uploads` (backend) | uploaded files |

They are declared with `external: true` in `docker-compose.yml`, which means **you create them
yourself** and Docker Compose never creates or deletes them:

```bash
docker volume create notes-db-data
docker volume create notes-uploads
```

Even `docker compose down -v` (which normally removes volumes) leaves them alone, so when
containers are deleted **the data is not removed**.

### 5. Connect services using a Docker network
Two user-defined bridge networks:
- `frontend-net` → `frontend` ↔ `backend`
- `backend-net` → `backend` ↔ `db`

Containers find each other by **service name** (Docker's built-in DNS): Nginx proxies to
`http://backend:5000` and the backend connects to the host `db`. The frontend is **not** on
`backend-net`, so it cannot reach the database directly (network isolation).

### 6. Docker Compose
[`docker-compose.yml`](docker-compose.yml) defines all services, networks and volumes and runs
everything with one command.

---

## Running the project

**Requirements:** Docker and Docker Compose (Docker Desktop includes both).

### Option A: one command
```bash
./setup.sh
```

### Option B: step by step
```bash
docker pull alpine:3.20                 # 1. pull base image
docker volume create notes-db-data      # 4. create external volumes
docker volume create notes-uploads
docker compose up -d --build            # 2,3,5,6. build images and start everything
```

Then open **http://localhost:8080**.

> On Windows (PowerShell), run the Option B commands one at a time instead of `setup.sh`.

### Useful commands
```bash
docker compose ps                       # list running containers
docker compose logs -f backend          # follow backend logs
docker network ls                       # see frontend-net and backend-net
docker network inspect cloud-computing-project-_backend-net
docker volume ls                        # see notes-db-data and notes-uploads
docker volume inspect notes-db-data
docker exec -it notes-db psql -U postgres -d notesdb -c "SELECT * FROM notes;"
docker compose down                     # stop and remove containers + networks
```

---

## Demo: proving the data survives container deletion

1. Start the app and add a few notes (with a file) at http://localhost:8080.
2. Delete all containers and networks:
   ```bash
   docker compose down -v
   docker ps -a                # no notes-* containers left
   docker volume ls            # notes-db-data and notes-uploads are still there
   ```
3. Start again:
   ```bash
   docker compose up -d
   ```
4. Refresh the page: all notes and uploaded files are still there. ✅

To remove the data for real, delete the volumes manually:
```bash
docker compose down
docker volume rm notes-db-data notes-uploads
```

---

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Backend + database status |
| GET | `/api/notes` | List all notes |
| POST | `/api/notes` | Create a note (`multipart/form-data`: `title`, `content`, optional `file`) |
| DELETE | `/api/notes/:id` | Delete a note and its file |
| GET | `/api/uploads/:filename` | Download an uploaded file |
