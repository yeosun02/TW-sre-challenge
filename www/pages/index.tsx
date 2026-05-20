import { useCallback, useEffect, useMemo, useState } from 'react';

type MetricRecord = {
  name: string;
  value: number;
  timestamp_unix_ms: string;
  agent_id: string;
  labels?: Record<string, string>;
};

const REFRESH_MS = 5000;

function formatTime(ms: string) {
  const n = Number(ms);
  if (Number.isNaN(n)) return ms;
  return new Date(n).toLocaleString();
}

function formatValue(name: string, value: number) {
  if (name.includes('percent')) return `${value.toFixed(1)}%`;
  return value.toFixed(2);
}

function Sparkline({ points }: { points: { t: number; v: number }[] }) {
  if (points.length < 2) {
    return (
      <div style={{ height: 48, display: 'flex', alignItems: 'center', color: '#888', fontSize: 13 }}>
        Not enough data yet
      </div>
    );
  }

  const width = 200;
  const height = 48;
  const minT = points[0].t;
  const maxT = points[points.length - 1].t || minT + 1;
  const minV = Math.min(...points.map((p) => p.v));
  const maxV = Math.max(...points.map((p) => p.v));
  const rangeV = maxV - minV || 1;

  const polylinePoints = points
    .map((p) => {
      const x = ((p.t - minT) / (maxT - minT)) * (width - 4) + 2;
      const y = height - 2 - ((p.v - minV) / rangeV) * (height - 4);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline fill="none" stroke="#0070f3" strokeWidth="2" points={polylinePoints} />
    </svg>
  );
}

export default function Home() {
  const [metrics, setMetrics] = useState<MetricRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadMetrics = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filterName.trim()) params.set('name', filterName.trim());
      if (filterAgent.trim()) params.set('agent_id', filterAgent.trim());

      const res = await fetch(`/api/metrics?${params}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to load metrics');
      }

      setMetrics(data.metrics ?? []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [filterName, filterAgent]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(loadMetrics, REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, loadMetrics]);

  const metricNames = useMemo(
    () => [...new Set(metrics.map((m) => m.name))].sort(),
    [metrics]
  );

  const latestByName = useMemo(() => {
    const map = new Map<string, MetricRecord>();
    for (const m of metrics) {
      const existing = map.get(m.name);
      if (!existing || Number(m.timestamp_unix_ms) > Number(existing.timestamp_unix_ms)) {
        map.set(m.name, m);
      }
    }
    return map;
  }, [metrics]);

  const seriesByName = useMemo(() => {
    const map = new Map<string, { t: number; v: number }[]>();
    for (const m of metrics) {
      const list = map.get(m.name) ?? [];
      list.push({ t: Number(m.timestamp_unix_ms), v: m.value });
      map.set(m.name, list);
    }
    for (const [name, list] of map) {
      list.sort((a, b) => a.t - b.t);
      map.set(name, list);
    }
    return map;
  }, [metrics]);

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '24px 20px 48px',
        fontFamily: 'system-ui, sans-serif',
        color: '#111',
      }}
    >
      <header style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '28px' }}>Metrics Dashboard</h1>
        <p style={{ margin: 0, color: '#555' }}>
          Live samples from the metrics agent via gRPC → Rust server → Next.js
        </p>
      </header>

      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'flex-end',
          marginBottom: '24px',
          padding: '16px',
          background: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
          Metric name
          <input
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="e.g. cpu_percent"
            style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
          Agent ID
          <input
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            placeholder="hostname or pod name"
            style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            loadMetrics();
          }}
          style={{
            padding: '8px 16px',
            background: '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh ({REFRESH_MS / 1000}s)
        </label>
      </section>

      {error && (
        <div
          style={{
            padding: '14px',
            marginBottom: '20px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            color: '#900',
          }}
        >
          <strong>Error:</strong> {error}
          <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
            Ensure the Rust server and metrics agent are running.
          </div>
        </div>
      )}

      {loading && metrics.length === 0 && !error && (
        <p style={{ color: '#666' }}>Loading metrics…</p>
      )}

      {!loading && metrics.length === 0 && !error && (
        <p style={{ color: '#666' }}>
          No metrics yet. Start the agent and wait a few seconds.
        </p>
      )}

      {metricNames.length > 0 && (
        <>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Latest values</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            {metricNames.map((name) => {
              const latest = latestByName.get(name);
              const series = seriesByName.get(name) ?? [];
              if (!latest) return null;
              return (
                <article
                  key={name}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '14px',
                    background: '#fff',
                  }}
                >
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                    {name}
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 600, marginBottom: '8px' }}>
                    {formatValue(name, latest.value)}
                  </div>
                  <Sparkline points={series} />
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                    {latest.agent_id} · {formatTime(latest.timestamp_unix_ms)}
                  </div>
                </article>
              );
            })}
          </div>

          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>
            Recent samples ({metrics.length})
          </h2>
          <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f9f9f9', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Time</th>
                  <th style={{ padding: '10px 12px' }}>Metric</th>
                  <th style={{ padding: '10px 12px' }}>Value</th>
                  <th style={{ padding: '10px 12px' }}>Agent</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => (
                  <tr key={`${m.timestamp_unix_ms}-${m.name}-${i}`} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      {formatTime(m.timestamp_unix_ms)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{m.name}</td>
                    <td style={{ padding: '10px 12px' }}>{formatValue(m.name, m.value)}</td>
                    <td style={{ padding: '10px 12px' }}>{m.agent_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p style={{ marginTop: '32px', fontSize: '13px', color: '#888' }}>
        Data path: Python agent → <code>SubmitMetrics</code> → Rust server →{' '}
        <code>GetMetrics</code> → this page
      </p>
    </div>
  );
}
