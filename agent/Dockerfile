# Build context: repository root (docker build -f agent/Dockerfile .)
FROM python:3.12-slim

WORKDIR /app

COPY agent/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent/main.py .
COPY agent/metrics ./metrics

ENV METRICS_SERVER_HOST=metrics-server \
    METRICS_SERVER_PORT=3000 \
    POLL_INTERVAL_SEC=5

CMD ["python", "main.py"]
