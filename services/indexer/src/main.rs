//! Indexer of the docs portal: parses the embedded documentation once at start
//! and serves the index to the search API. Private; only the search API calls it.

mod index;

mod embedded {
    include!(concat!(env!("OUT_DIR"), "/docs.rs"));
}

use axum::{extract::{Path, State}, http::StatusCode, routing::get, Json, Router};
use serde_json::{json, Value};
use std::sync::Arc;
use std::time::Instant;

struct App {
    index: index::Index,
    built_ms: u128,
    started: Instant,
}

async fn health(State(app): State<Arc<App>>) -> Json<Value> {
    Json(json!({
        "ok": true, "service": "indexer", "lang": "rust",
        "docs": app.index.docs.len(), "terms": app.index.df.len(),
        "buildMs": app.built_ms as u64, "uptimeS": app.started.elapsed().as_secs(),
    }))
}

async fn full_index(State(app): State<Arc<App>>) -> Json<Value> {
    Json(serde_json::to_value(&app.index).unwrap_or(Value::Null))
}

async fn doc(State(app): State<Arc<App>>, Path(id): Path<String>) -> Result<Json<Value>, StatusCode> {
    app.index
        .docs
        .iter()
        .find(|d| d.id == id)
        .map(|d| Json(json!({ "id": d.id, "title": d.title, "section": d.section, "headings": d.headings, "summary": d.summary })))
        .ok_or(StatusCode::NOT_FOUND)
}

#[tokio::main]
async fn main() {
    let t0 = Instant::now();
    let index = index::build(embedded::DOCS);
    let built_ms = t0.elapsed().as_millis();
    println!("indexed {} documents, {} terms in {} ms", index.docs.len(), index.df.len(), built_ms);
    let app = Arc::new(App { index, built_ms, started: Instant::now() });
    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(5000);
    let router = Router::new()
        .route("/health", get(health))
        .route("/index", get(full_index))
        .route("/docs/{id}", get(doc))
        .with_state(app);
    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await.expect("bind");
    println!("indexer listening on {port}");
    axum::serve(listener, router).await.expect("serve");
}
