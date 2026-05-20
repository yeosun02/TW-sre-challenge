use crate::pb::metrics::{GetMetricsRequest, Metric};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const DEFAULT_LIMIT: u32 = 100;
const MAX_STORED: usize = 10_000;

pub struct MetricsStore {
    metrics: Mutex<Vec<Metric>>,
}

impl MetricsStore {
    pub fn new() -> Self {
        Self {
            metrics: Mutex::new(Vec::new()),
        }
    }

    pub fn submit(&self, batch: Vec<Metric>) -> u32 {
        let mut stored = self.metrics.lock().expect("metrics lock poisoned");
        let mut accepted = 0u32;

        for mut metric in batch {
            if metric.name.trim().is_empty() {
                continue;
            }
            if metric.timestamp_unix_ms == 0 {
                metric.timestamp_unix_ms = now_unix_ms();
            }
            stored.push(metric);
            accepted += 1;
        }

        if stored.len() > MAX_STORED {
            let excess = stored.len() - MAX_STORED;
            stored.drain(0..excess);
        }

        accepted
    }

    pub fn get(&self, req: GetMetricsRequest) -> Vec<Metric> {
        let stored = self.metrics.lock().expect("metrics lock poisoned");
        let limit = if req.limit == 0 {
            DEFAULT_LIMIT
        } else {
            req.limit
        } as usize;

        let mut results: Vec<Metric> = stored
            .iter()
            .filter(|m| {
                if let Some(ref name) = req.name {
                    if &m.name != name {
                        return false;
                    }
                }
                if let Some(ref agent_id) = req.agent_id {
                    if &m.agent_id != agent_id {
                        return false;
                    }
                }
                if let Some(since) = req.since_unix_ms {
                    if m.timestamp_unix_ms < since {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect();

        results.sort_by(|a, b| b.timestamp_unix_ms.cmp(&a.timestamp_unix_ms));
        results.truncate(limit);
        results
    }
}

fn now_unix_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pb::metrics::Metric;

    fn sample(name: &str, value: f64, ts: i64, agent: &str) -> Metric {
        Metric {
            name: name.to_string(),
            value,
            timestamp_unix_ms: ts,
            agent_id: agent.to_string(),
            labels: Default::default(),
        }
    }

    #[test]
    fn submit_and_get_returns_newest_first() {
        let store = MetricsStore::new();
        store.submit(vec![
            sample("cpu_percent", 10.0, 1000, "a1"),
            sample("cpu_percent", 20.0, 2000, "a1"),
        ]);

        let got = store.get(GetMetricsRequest {
            limit: 10,
            ..Default::default()
        });

        assert_eq!(got.len(), 2);
        assert_eq!(got[0].value, 20.0);
        assert_eq!(got[1].value, 10.0);
    }

    #[test]
    fn get_filters_by_name_and_agent() {
        let store = MetricsStore::new();
        store.submit(vec![
            sample("cpu_percent", 1.0, 1, "a1"),
            sample("mem_bytes", 2.0, 2, "a1"),
            sample("cpu_percent", 3.0, 3, "a2"),
        ]);

        let got = store.get(GetMetricsRequest {
            name: Some("cpu_percent".to_string()),
            agent_id: Some("a1".to_string()),
            limit: 10,
            since_unix_ms: None,
        });

        assert_eq!(got.len(), 1);
        assert_eq!(got[0].value, 1.0);
    }
}
