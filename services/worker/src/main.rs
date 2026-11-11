//! Background worker of the dashboard: takes raw metric events from the API,
//! aggregates them in a periodic job and serves the series. Private; only the
//! API calls it.

mod agg;

use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::Mutex;

struct App {
    store: Mutex<agg::Store>,
    started: Instant,
    interval: Duration,
}

type Shared = Arc<App>;

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

async fn health(State(app): State<Shared>) -> Json<Value> {
    let s = app.store.lock().await;
    Json(json!({
        "ok": true, "service": "worker", "lang": "rust",
        "uptimeS": app.started.elapsed().as_secs(),
        "queued": s.queue.len(), "totalEvents": s.total_events,
        "metrics": s.series.len(), "jobRuns": s.runs.back().map(|r| r.run).unwrap_or(0),
        "intervalMs": app.interval.as_millis() as u64,
    }))
}

#[derive(Deserialize)]
struct Ingest {
    events: Vec<agg::Event>,
}

async fn ingest(State(app): State<Shared>, Json(body): Json<Ingest>) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    if body.events.len() > 10_000 {
        return Err((StatusCode::PAYLOAD_TOO_LARGE, Json(json!({ "error": "at most 10000 events per call" }))));
    }
    let mut accepted = 0;
    let mut s = app.store.lock().await;
    for e in body.events {
        if e.metric.is_empty() || e.metric.len() > 64 || !e.value.is_finite() {
            continue;
        }
        s.queue.push(e);
        accepted += 1;
    }
    Ok(Json(json!({ "accepted": accepted, "queued": s.queue.len() })))
}

#[derive(Deserialize)]
struct SeriesQuery {
    metric: String,
    #[serde(default = "default_minutes")]
    minutes: u64,
}

fn default_minutes() -> u64 {
    30
}

async fn series(State(app): State<Shared>, Query(q): Query<SeriesQuery>) -> Json<Value> {
    let s = app.store.lock().await;
    Json(json!({ "metric": q.metric, "points": s.points(&q.metric, q.minutes.min(agg::KEEP_BUCKETS as u64), now_ms()) }))
}

async fn summary(State(app): State<Shared>) -> Json<Value> {
    let s = app.store.lock().await;
    Json(json!({ "metrics": s.summary(now_ms()), "totalEvents": s.total_events }))
}

async fn jobs(State(app): State<Shared>) -> Json<Value> {
    let s = app.store.lock().await;
    let runs: Vec<_> = s.runs.iter().rev().take(20).cloned().collect();
    Json(json!({ "job": "aggregate", "intervalMs": app.interval.as_millis() as u64, "runs": runs }))
}

// Runs the job right away instead of waiting for the next tick.
async fn run_now(State(app): State<Shared>) -> Json<Value> {
    let run = app.store.lock().await.fold(now_ms());
    Json(json!({ "run": run }))
}

#[tokio::main]
async fn main() {
    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(5000);
    let interval_ms: u64 = std::env::var("AGG_INTERVAL_MS").ok().and_then(|p| p.parse().ok()).unwrap_or(2000);
    let app = Arc::new(App {
        store: Mutex::new(agg::Store::default()),
        started: Instant::now(),
        interval: Duration::from_millis(interval_ms.max(100)),
    });

    let job = app.clone();
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(job.interval);
        loop {
            tick.tick().await;
            let run = job.store.lock().await.fold(now_ms());
            if run.events > 0 {
                println!("aggregate run {}: {} events, {} metrics, {} us", run.run, run.events, run.metrics, run.micros);
            }
        }
    });

    let router = Router::new()
        .route("/health", get(health))
        .route("/ingest", post(ingest))
        .route("/series", get(series))
        .route("/summary", get(summary))
        .route("/jobs", get(jobs))
        .route("/jobs/run", post(run_now))
        .with_state(app);
    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await.expect("bind");
    println!("worker listening on {port}, aggregating every {interval_ms} ms");
    axum::serve(listener, router).await.expect("serve");
}
