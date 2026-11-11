//! Metric aggregation: raw events are queued on ingest and folded into
//! one-minute buckets by a background job. Each bucket keeps count, sum, min,
//! max and a bounded sample for percentiles.

use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, VecDeque};

pub const BUCKET_MS: u64 = 60_000;
pub const KEEP_BUCKETS: usize = 120;
const SAMPLE_MAX: usize = 512;

#[derive(Debug, Clone, Deserialize)]
pub struct Event {
    pub metric: String,
    pub value: f64,
    /// Milliseconds since the Unix epoch; the ingest time when missing.
    #[serde(default)]
    pub ts: Option<u64>,
}

#[derive(Debug, Default, Clone)]
pub struct Bucket {
    pub count: u64,
    pub sum: f64,
    pub min: f64,
    pub max: f64,
    sample: Vec<f64>,
    seen: u64,
}

impl Bucket {
    fn add(&mut self, v: f64) {
        if self.count == 0 {
            self.min = v;
            self.max = v;
        } else {
            self.min = self.min.min(v);
            self.max = self.max.max(v);
        }
        self.count += 1;
        self.sum += v;
        self.seen += 1;
        if self.sample.len() < SAMPLE_MAX {
            self.sample.push(v);
        } else {
            // Deterministic reservoir: replace a slot chosen from the running count.
            let slot = (self.seen.wrapping_mul(2654435761) % self.seen) as usize;
            if slot < SAMPLE_MAX {
                self.sample[slot] = v;
            }
        }
    }

    fn percentile(&self, p: f64) -> f64 {
        if self.sample.is_empty() {
            return 0.0;
        }
        let mut s = self.sample.clone();
        s.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let idx = ((p / 100.0) * (s.len() - 1) as f64).round() as usize;
        s[idx.min(s.len() - 1)]
    }
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Point {
    pub minute: u64,
    pub count: u64,
    pub sum: f64,
    pub avg: f64,
    pub min: f64,
    pub max: f64,
    pub p50: f64,
    pub p95: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub metric: String,
    pub last5m: Totals,
    pub last60m: Totals,
}

#[derive(Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Totals {
    pub count: u64,
    pub sum: f64,
    pub avg: f64,
    pub max: f64,
}

#[derive(Debug, Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct JobRun {
    pub run: u64,
    pub at_ms: u64,
    pub events: usize,
    pub metrics: usize,
    pub micros: u128,
}

#[derive(Default)]
pub struct Store {
    pub queue: Vec<Event>,
    pub series: HashMap<String, BTreeMap<u64, Bucket>>,
    pub runs: VecDeque<JobRun>,
    pub total_events: u64,
}

impl Store {
    /// The background job: folds the queue into buckets and drops old ones.
    pub fn fold(&mut self, now_ms: u64) -> JobRun {
        let started = std::time::Instant::now();
        let events = std::mem::take(&mut self.queue);
        let n = events.len();
        let mut touched = std::collections::HashSet::new();
        for e in events {
            let minute = e.ts.unwrap_or(now_ms) / BUCKET_MS * BUCKET_MS;
            self.series.entry(e.metric.clone()).or_default().entry(minute).or_default().add(e.value);
            touched.insert(e.metric);
        }
        let oldest = (now_ms / BUCKET_MS).saturating_sub(KEEP_BUCKETS as u64) * BUCKET_MS;
        for buckets in self.series.values_mut() {
            while let Some((&k, _)) = buckets.iter().next() {
                if k >= oldest {
                    break;
                }
                buckets.remove(&k);
            }
        }
        self.total_events += n as u64;
        let run = JobRun {
            run: self.runs.back().map(|r| r.run + 1).unwrap_or(1),
            at_ms: now_ms,
            events: n,
            metrics: touched.len(),
            micros: started.elapsed().as_micros(),
        };
        self.runs.push_back(run.clone());
        if self.runs.len() > 50 {
            self.runs.pop_front();
        }
        run
    }

    pub fn points(&self, metric: &str, minutes: u64, now_ms: u64) -> Vec<Point> {
        let from = (now_ms / BUCKET_MS).saturating_sub(minutes.saturating_sub(1)) * BUCKET_MS;
        self.series
            .get(metric)
            .map(|b| {
                b.range(from..)
                    .map(|(&minute, b)| Point {
                        minute,
                        count: b.count,
                        sum: b.sum,
                        avg: if b.count > 0 { b.sum / b.count as f64 } else { 0.0 },
                        min: b.min,
                        max: b.max,
                        p50: b.percentile(50.0),
                        p95: b.percentile(95.0),
                    })
                    .collect()
            })
            .unwrap_or_default()
    }

    fn totals(&self, metric: &str, minutes: u64, now_ms: u64) -> Totals {
        let pts = self.points(metric, minutes, now_ms);
        let count: u64 = pts.iter().map(|p| p.count).sum();
        let sum: f64 = pts.iter().map(|p| p.sum).sum();
        Totals {
            count,
            sum,
            avg: if count > 0 { sum / count as f64 } else { 0.0 },
            max: pts.iter().map(|p| p.max).fold(0.0, f64::max),
        }
    }

    pub fn summary(&self, now_ms: u64) -> Vec<Summary> {
        let mut names: Vec<&String> = self.series.keys().collect();
        names.sort();
        names
            .into_iter()
            .map(|m| Summary { metric: m.clone(), last5m: self.totals(m, 5, now_ms), last60m: self.totals(m, 60, now_ms) })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ev(metric: &str, value: f64, ts: u64) -> Event {
        Event { metric: metric.into(), value, ts: Some(ts) }
    }

    #[test]
    fn folds_into_minute_buckets() {
        let mut s = Store::default();
        let now = 10 * BUCKET_MS + 5_000;
        s.queue = vec![ev("latency", 10.0, now), ev("latency", 30.0, now), ev("latency", 20.0, now - BUCKET_MS)];
        let run = s.fold(now);
        assert_eq!(run.events, 3);
        let pts = s.points("latency", 5, now);
        assert_eq!(pts.len(), 2);
        assert_eq!(pts[1].count, 2);
        assert_eq!(pts[1].avg, 20.0);
        assert_eq!(pts[1].max, 30.0);
        let sum = s.summary(now);
        assert_eq!(sum[0].last5m.count, 3);
    }

    #[test]
    fn drops_old_buckets() {
        let mut s = Store::default();
        s.queue = vec![ev("x", 1.0, 0)];
        s.fold(0);
        s.fold((KEEP_BUCKETS as u64 + 5) * BUCKET_MS);
        assert!(s.points("x", 1_000, (KEEP_BUCKETS as u64 + 5) * BUCKET_MS).is_empty());
    }

    #[test]
    fn percentiles() {
        let mut b = Bucket::default();
        for v in 1..=100 {
            b.add(v as f64);
        }
        assert_eq!(b.percentile(50.0), 51.0);
        assert_eq!(b.percentile(95.0), 95.0);
    }
}
