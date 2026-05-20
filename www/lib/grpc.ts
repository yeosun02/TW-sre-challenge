import path from 'path';

/** gRPC server host:port (Compose service name or 127.0.0.1 locally). */
export function grpcServerTarget(): string {
  const host = process.env.METRICS_SERVER_HOST ?? '127.0.0.1';
  const port = process.env.METRICS_SERVER_PORT ?? '3000';
  return `${host}:${port}`;
}

/** Root directory containing test/ and metrics/ proto packages. */
export function protoRoot(): string {
  return process.env.PROTO_ROOT ?? path.resolve(process.cwd(), '../proto');
}
