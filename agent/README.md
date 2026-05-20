# Metrics Agent (Python)

Collects CPU, memory, and disk usage and submits them to the Rust server via gRPC.

## Run with Docker (full stack)

From the repository root:

```bash
docker compose up --build
```

See the root [README](../README.md) for URLs and Codespaces instructions.

## Setup (virtual environment)

```bash
cd agent
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
./generate_proto.sh         # only needed after changing metrics.proto
```

## Run

Start the Rust server first (`cd server && cargo run`), then:

```bash
cd agent
source .venv/bin/activate
python main.py
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `METRICS_SERVER_HOST` | `127.0.0.1` | gRPC server host |
| `METRICS_SERVER_PORT` | `3000` | gRPC server port |

If **Docker Compose** is up (`docker compose up`), use port **3002** on the host (port 3000 is the web UI):

```bash
METRICS_SERVER_PORT=3002 python main.py
```
| `POLL_INTERVAL_SEC` | `5` | Seconds between submissions |
| `AGENT_ID` | hostname | Identifier attached to each metric |
