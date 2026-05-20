import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchMetrics } from '../../lib/metrics-grpc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, agent_id, limit, since_unix_ms } = req.query;

  try {
    const metrics = await fetchMetrics({
      name: typeof name === 'string' ? name : undefined,
      agent_id: typeof agent_id === 'string' ? agent_id : undefined,
      limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      since_unix_ms: typeof since_unix_ms === 'string' ? since_unix_ms : undefined,
    });

    res.status(200).json({ metrics });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GetMetrics gRPC error:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
      message,
    });
  }
}
