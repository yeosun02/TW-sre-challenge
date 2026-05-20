# Metrics / Latency Monitoring System

Take-home project: a **Python metrics agent** sends host metrics over **gRPC** to a **Rust server**, and a **Next.js** dashboard reads and visualizes them.

| Step | What | Where |
|------|------|--------|
| 1 | API contract (Protobuf) | [`proto/metrics/metrics.proto`](proto/metrics/metrics.proto) |
| 2 | gRPC server + in-memory store | [`server/`](server/) |
| 3 | Metrics collector | [`agent/`](agent/) |
| 4 | Containers (Docker Compose) | Dockerfiles, [`docker-compose.yml`](docker-compose.yml) |
| 5 | Web dashboard | [`www/`](www/) |
| 6 | Docs + Codespaces | This README, [`.devcontainer/`](.devcontainer/), [`docker-compose.yml`](docker-compose.yml) |

Full spec: [`requirements.md`](requirements.md).

## Architecture

```text
┌──────────────┐  SubmitMetrics (gRPC)   ┌──────────────┐  GetMetrics (gRPC)   ┌──────────────┐
│ metrics-agent│ ──────────────────────► │metrics-server│ ◄─────────────────── │ metrics-www  │
│   (Python)   │                         │    (Rust)    │                      │  (Next.js)   │
└──────────────┘                         └──────────────┘                      └──────▲───────┘
                                                                                      │
                                                                               Browser (HTTP)
```

---

## Quick start (Docker Compose) — recommended

**Best for GitHub Codespaces and local demo.** Requires [Docker](https://docs.docker.com/get-docker/) (Docker Desktop, Rancher Desktop, etc.).

From the **repository root**:

```bash
docker compose up --build
```

| URL / port | Purpose |
|------------|---------|
| **http://localhost:3000** | Metrics dashboard (auto-refresh every 5s) |
| **localhost:3002** | gRPC server on the host (for a local `python main.py` while Compose is up) |

Stop with `Ctrl+C`, or `docker compose down`.

**Verify the pipeline:**

```bash
docker compose logs -f metrics-agent    # should show "Submitted 3/3 metrics"
docker compose logs -f metrics-server     # should show "SubmitMetrics: accepted 3/3"
```

### Container images (what & why)

| Service | Base image | Why |
|---------|------------|-----|
| **metrics-agent** | `python:3.12-slim` | Required containerized agent; `psutil` for CPU/memory/disk. |
| **metrics-server** | Multi-stage Rust → `debian:bookworm-slim` | Small runtime image with only the compiled binary. |
| **metrics-www** | `node:20-alpine` + Next.js `standalone` | Production-sized Node image; `/proto` mounted for gRPC from API routes. |

Compose wires services by DNS name (`metrics-server:3000`). The agent **must** run in a container for the assignment; Compose runs the containerized agent for you.

---

## GitHub Codespaces

1. Push this repo to GitHub.
2. **Code → Create codespace on main** (or open in Codespaces).
3. Wait for the dev container to finish building (Docker feature is enabled in [`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json)).
4. In the Codespace terminal, from the repo root:

   ```bash
   docker compose up --build
   ```

5. When port **3000** is forwarded, open the **Metrics Dashboard** URL (Codespaces shows a popup, or use the **Ports** tab).

No manual install of Rust/Node/Python is required for the demo path—only Docker inside the Codespace.

---

## Local development (without Docker)

Use three terminals if you prefer running binaries directly.

### 1. Rust server

```bash
cd server
cargo run
# gRPC on 0.0.0.0:3000
```

### 2. Python agent

```bash
cd agent
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Regenerate Python stubs after editing `.proto`:

```bash
./agent/generate_proto.sh
```

### 3. Next.js web

```bash
cd www
npm install
npm run dev -- -p 3001
```

Open **http://127.0.0.1:3001**.

| Env var | Default | Used by |
|---------|---------|---------|
| `METRICS_SERVER_HOST` | `127.0.0.1` | Agent, www |
| `METRICS_SERVER_PORT` | `3000` | Agent, www |
| `POLL_INTERVAL_SEC` | `5` | Agent |
| `AGENT_ID` | hostname | Agent |
| `GRPC_BIND_ADDR` | `0.0.0.0:3000` | Server |
| `PROTO_ROOT` | `../proto` (www) | www API routes |

---

## Project layout

```text
.
├── proto/
│   ├── metrics/metrics.proto    # MetricsService (SubmitMetrics, GetMetrics)
│   └── test/test.proto          # Original POC (TestMethod)
├── server/                      # Rust + Tonic
│   ├── src/main.rs              # gRPC handlers
│   ├── src/store.rs             # In-memory storage
│   └── Dockerfile
├── agent/
│   ├── main.py                  # Collector loop
│   ├── metrics/                 # Generated metrics_pb2*.py
│   └── Dockerfile               # Required containerized agent
├── www/
│   ├── pages/index.tsx          # Dashboard UI
│   ├── pages/api/metrics.ts     # GET → GetMetrics
│   └── Dockerfile
├── docker-compose.yml           # One-command full stack
└── .devcontainer/               # GitHub Codespaces
```

---

## Troubleshooting

### `docker: command not found` (macOS)

Add Docker Desktop’s CLI to your PATH in `~/.zshrc`:

```bash
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
```

Open **Docker Desktop** until it shows **Running**, then run `docker version`.

### Dashboard shows “No metrics yet”

1. `docker compose up` must be running (server + agent + www).
2. Check logs: `docker compose logs -f metrics-agent` (expect `Submitted 3/3 metrics`).

### Host `python main.py` while Compose is running

Host port **3000** is the web UI. gRPC is on host port **3002**:

```bash
METRICS_SERVER_PORT=3002 python main.py
```

---

## Metrics collected

| Name | Source |
|------|--------|
| `cpu_percent` | `psutil.cpu_percent` |
| `memory_used_percent` | `psutil.virtual_memory().percent` |
| `disk_used_percent` | `psutil.disk_usage("/").percent` |

Data is stored **in memory** on the server (cleared when the server process restarts).
