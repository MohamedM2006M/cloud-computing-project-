# 📘 Study Guide — explaining every line

Use this to answer the questions in the discussion.

---

## 1. `frontend/Dockerfile` (the website image)

```dockerfile
FROM alpine:3.20
RUN apk add --no-cache nginx
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY public/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

| Line | What it does |
|------|--------------|
| `FROM alpine:3.20` | Base image. Every image starts from another image. We start from **alpine** (a tiny ~8 MB Linux). If it is not on the machine, Docker pulls it automatically. |
| `RUN apk add --no-cache nginx` | Runs a command **while building** the image. `apk` is Alpine's package manager; it installs the Nginx web server. `--no-cache` doesn't keep the package index → smaller image. |
| `COPY nginx.conf /etc/nginx/http.d/default.conf` | Copies a file **from my computer into the image**. This is the Nginx configuration (where the website files are, and forward `/api` to the backend). |
| `COPY public/ /usr/share/nginx/html/` | Copies the website (HTML, CSS, JS) into the folder Nginx serves. |
| `EXPOSE 80` | **Documentation only**: says the app listens on port 80 inside the container. It does NOT open the port to the host — `ports:` / `-p` does that. |
| `CMD ["nginx", "-g", "daemon off;"]` | The command that runs **when the container starts**. `daemon off;` keeps Nginx in the foreground; if the main process ends, the container stops. |

## 2. `backend/Dockerfile`

```dockerfile
FROM alpine:3.20
RUN apk add --no-cache nodejs npm
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY server.js ./
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]
ENV PORT=5000
EXPOSE 5000
CMD ["node", "server.js"]
```

| Line | What it does |
|------|--------------|
| `FROM alpine:3.20` | Same alpine base image. |
| `RUN apk add --no-cache nodejs npm` | Installs Node.js and npm. |
| `WORKDIR /app` | Creates `/app` and makes it the current folder for the next instructions (like `cd`). |
| `COPY package.json ./` | Copies only the dependency list first. |
| `RUN npm install --omit=dev ...` | Installs the libraries (express, pg, multer). Done **before** copying the code so this layer is **cached** — changing `server.js` doesn't reinstall everything. |
| `COPY server.js ./` | Copies the application code. |
| `RUN mkdir -p /app/uploads` | Creates the folder for uploaded files. |
| `VOLUME ["/app/uploads"]` | Marks that folder as a place for persistent data. |
| `ENV PORT=5000` | Sets an environment variable inside the container. |
| `EXPOSE 5000` | Documents that the app listens on 5000. |
| `CMD ["node", "server.js"]` | Starts the API when the container starts. |

**`RUN` vs `CMD`:** `RUN` happens at **build** time (creates a layer in the image). `CMD` happens at **run** time (when the container starts). Only the last `CMD` counts.

**`COPY` vs `ADD`:** both copy files; `ADD` can also download URLs and auto-extract `.tar` files. `COPY` is preferred for simple copying.

---

## 3. `docker-compose.yml` — what each part does

| Part | Meaning |
|------|---------|
| `services:` | The list of containers. We have 3: `db`, `backend`, `frontend`. |
| `image: postgres:16-alpine` | Use a ready image from Docker Hub. |
| `build: ./backend` | Build an image from the Dockerfile in that folder. |
| `image: notes-backend:1.0` (with `build`) | The name/tag given to the built image. |
| `container_name:` | Fixed container name (otherwise Compose generates one). |
| `restart: unless-stopped` | Restart the container automatically if it crashes or Docker restarts. |
| `environment:` | Environment variables (DB user, password, host …). |
| `ports: "8080:80"` | **Port mapping** `HOST:CONTAINER`. Browser on port 8080 → container port 80. |
| `volumes:` (inside a service) | Mount a volume / folder into the container. |
| `networks:` (inside a service) | Which networks the container joins. |
| `depends_on:` | Start order. `condition: service_healthy` = wait until the db healthcheck passes. |
| `healthcheck:` | Command Docker runs to check if the container is healthy (`pg_isready`). |
| `networks:` (bottom) | Defines the networks. `driver: bridge` = normal private network on one machine. |
| `volumes:` (bottom) | Defines the volumes. `external: true` = created by me with `docker volume create`, Compose never deletes it. |

### Volumes in this project
- `notes-db-data` → used by **db** (database files).
- `notes-uploads` → used by **2 containers**: **backend** writes uploaded files, **frontend** (Nginx) reads them (`:ro` = read-only).

### Networks in this project
- `frontend-net` → **frontend + backend** (2 containers).
- `backend-net` → **backend + db** (2 containers).
- Containers on the same network reach each other **by service name** (`http://backend:5000`, host `db`) thanks to Docker's internal DNS.
- frontend is not on `backend-net` → it **cannot** reach the database (isolation/security).

---

## 4. "What happens if we remove / add …?"

| Change | What happens |
|--------|--------------|
| Remove `ports:` from frontend | App still runs, but you **can't open it** from the browser (no host port). |
| Change `"8080:80"` to `"3000:80"` | Website moves to `http://localhost:3000`. |
| Change to `"8080:8080"` | **Breaks** – Nginx listens on 80, nothing on 8080 inside the container. |
| Remove `volumes:` from db | Works, but data is stored inside the container → **lost** when the container is removed. |
| Remove `external: true` | Compose creates/manages the volume itself (named `<project>_notes-db-data`); `docker compose down -v` would **delete** it. |
| Keep `external: true` but never run `docker volume create` | `docker compose up` **fails**: "external volume not found". |
| Remove the frontend's `notes-uploads` mount | Upload still works, but download links `/uploads/...` return **404** (Nginx can't see the files). |
| Remove `:ro` | Frontend could also write/delete files in the volume (less secure). |
| Remove `backend-net` from backend | Backend **can't reach `db`** → health shows DB error. |
| Put `frontend` on `backend-net` | Frontend could reach the DB directly (works, but less secure). |
| Remove `networks:` completely | Compose puts all services on one **default** network → still works, but no isolation. |
| Remove `depends_on` | Containers start at the same time; backend may start before DB is ready (first requests fail until DB is up). |
| Remove `healthcheck` from db | `condition: service_healthy` must also be removed, otherwise Compose errors. |
| Remove `restart:` | Container stays stopped if it crashes. |
| Change `POSTGRES_PASSWORD` only in db | Backend can't log in → must change `DB_PASSWORD` too. |
| Remove `build:` from backend | Compose needs the image `notes-backend:1.0` to already exist, else it fails. |

---

## 5. How to add things (she might ask you live)

### Add a new service (example: Adminer – a web UI for the database)
```yaml
  adminer:
    image: adminer
    container_name: notes-adminer
    ports:
      - "8081:8080"
    networks:
      - backend-net        # must be on the same network as db
    depends_on:
      - db
```
Then `docker compose up -d` → open `http://localhost:8081` (server: `db`, user: `postgres`, password: `postgres`).

### Add a new volume
```yaml
services:
  backend:
    volumes:
      - notes-uploads:/app/uploads
      - notes-logs:/app/logs          # 1) mount it

volumes:
  notes-logs:                          # 2) declare it (Compose creates it)
  # or, external:
  # notes-logs:
  #   external: true                   # then: docker volume create notes-logs
```

### Add a new network
```yaml
services:
  adminer:
    networks:
      - admin-net
  db:
    networks:
      - backend-net
      - admin-net

networks:
  admin-net:
    driver: bridge
```

### Scale / other quick ones
- Run 2 copies of a service: `docker compose up -d --scale backend=2` (must remove `container_name` and the fixed host port from that service first).
- Rebuild after changing code: `docker compose up -d --build`.

---

## 6. Doing the same with plain `docker` commands (no Compose)

```bash
docker pull alpine:3.20
docker build -t notes-frontend:1.0 ./frontend
docker network create mynet
docker volume create myvol
docker run -d --name web1 --network mynet -v myvol:/data -p 8080:80 notes-frontend:1.0
docker run -d --name web2 --network mynet -v myvol:/data alpine sleep 3600
docker exec web2 ping -c 2 web1        # same network → they reach each other by name
docker exec web2 sh -c "echo hi > /data/test.txt"
docker exec web1 cat /data/test.txt    # same volume → web1 sees the file
```

## 7. Useful commands
| Command | Does |
|---------|------|
| `docker images` | List images |
| `docker ps` / `docker ps -a` | Running / all containers |
| `docker compose up -d --build` | Build + start everything in background |
| `docker compose down` | Stop and remove containers + networks (volumes kept) |
| `docker compose logs -f backend` | Follow logs of a service |
| `docker exec -it notes-backend sh` | Open a shell inside a container |
| `docker network ls` / `docker network inspect <name>` | Networks and which containers are on them |
| `docker volume ls` / `docker volume inspect <name>` | Volumes and where they live |
| `docker inspect notes-frontend` | Full details of a container (mounts, networks, ports) |
