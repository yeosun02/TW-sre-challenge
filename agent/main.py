#!/usr/bin/env python3
"""Metrics agent: collect host metrics and submit to the Rust server via gRPC."""

from __future__ import annotations

import os
import socket
import sys
import time

import grpc
import psutil

from metrics import metrics_pb2, metrics_pb2_grpc


def env(name: str, default: str) -> str:
    return os.environ.get(name, default)


def now_unix_ms() -> int:
    return int(time.time() * 1000)


def collect_metrics(agent_id: str) -> list[metrics_pb2.Metric]:
    ts = now_unix_ms()
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    return [
        metrics_pb2.Metric(
            name="cpu_percent",
            value=psutil.cpu_percent(interval=0.1),
            timestamp_unix_ms=ts,
            agent_id=agent_id,
            labels={"unit": "percent"},
        ),
        metrics_pb2.Metric(
            name="memory_used_percent",
            value=float(memory.percent),
            timestamp_unix_ms=ts,
            agent_id=agent_id,
            labels={"unit": "percent"},
        ),
        metrics_pb2.Metric(
            name="disk_used_percent",
            value=float(disk.percent),
            timestamp_unix_ms=ts,
            agent_id=agent_id,
            labels={"unit": "percent", "mount": "/"},
        ),
    ]


def main() -> int:
    host = env("METRICS_SERVER_HOST", "127.0.0.1")
    port = env("METRICS_SERVER_PORT", "3000")
    interval_sec = float(env("POLL_INTERVAL_SEC", "5"))
    agent_id = env("AGENT_ID", socket.gethostname())
    target = f"{host}:{port}"

    print(f"Metrics agent starting (agent_id={agent_id}, server={target}, interval={interval_sec}s)")

    channel = grpc.insecure_channel(target)
    stub = metrics_pb2_grpc.MetricsServiceStub(channel)

    while True:
        batch = collect_metrics(agent_id)
        request = metrics_pb2.SubmitMetricsRequest(metrics=batch)

        try:
            response = stub.SubmitMetrics(request, timeout=10)
            names = ", ".join(m.name for m in batch)
            print(f"Submitted {response.accepted_count}/{len(batch)} metrics [{names}]")
        except grpc.RpcError as err:
            print(f"Submit failed: {err.code().name} — {err.details()}", file=sys.stderr)

        time.sleep(interval_sec)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped.")
        sys.exit(0)
