import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { promisify } from 'util';
import { grpcServerTarget, protoRoot } from './grpc';

const PROTO_PATH = path.join(protoRoot(), 'metrics/metrics.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const { metrics } = grpc.loadPackageDefinition(packageDefinition) as any;

type GetMetricsRequest = {
  name?: string;
  agent_id?: string;
  limit?: number;
  since_unix_ms?: string;
};

type GetMetricsResponse = {
  metrics?: MetricRecord[];
};

export type MetricRecord = {
  name: string;
  value: number;
  timestamp_unix_ms: string;
  agent_id: string;
  labels?: Record<string, string>;
};

export type MetricsQuery = {
  name?: string;
  agent_id?: string;
  limit?: number;
  since_unix_ms?: string;
};

export async function fetchMetrics(query: MetricsQuery = {}): Promise<MetricRecord[]> {
  const client = new metrics.MetricsService(
    grpcServerTarget(),
    grpc.credentials.createInsecure()
  );

  const getMetrics = promisify(client.getMetrics.bind(client)) as (
    request: GetMetricsRequest
  ) => Promise<GetMetricsResponse>;

  const request: GetMetricsRequest = {
    limit: query.limit ?? 200,
  };
  if (query.name) request.name = query.name;
  if (query.agent_id) request.agent_id = query.agent_id;
  if (query.since_unix_ms) request.since_unix_ms = query.since_unix_ms;

  const response = await getMetrics(request);
  return response.metrics ?? [];
}
