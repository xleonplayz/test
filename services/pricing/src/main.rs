//! Pricing service of the shop: computes discounts, VAT and shipping for a
//! cart. Private; only the API calls it.

mod rules;

use axum::{extract::Json, http::StatusCode, routing::{get, post}, Router};
use serde_json::{json, Value};
use std::time::Instant;
use std::sync::OnceLock;

static STARTED: OnceLock<Instant> = OnceLock::new();

async fn health() -> Json<Value> {
    let up = STARTED.get().map(|s| s.elapsed().as_secs()).unwrap_or(0);
    Json(json!({ "ok": true, "service": "pricing", "lang": "rust", "uptimeS": up }))
}

async fn quote(Json(req): Json<rules::QuoteRequest>) -> Result<Json<rules::Quote>, (StatusCode, Json<Value>)> {
    rules::quote(&req).map(Json).map_err(|e| (StatusCode::UNPROCESSABLE_ENTITY, Json(json!({ "error": e }))))
}

async fn rates() -> Json<Value> {
    let countries = ["DE", "AT", "FR", "NL", "CH"];
    let table: Vec<Value> = countries
        .iter()
        .map(|c| json!({ "country": c, "standard": rules::vat_rate(c, "goods"), "reduced": rules::vat_rate(c, "food") }))
        .collect();
    Json(json!({ "rates": table, "promos": ["WELCOME10", "TEA20"] }))
}

#[tokio::main]
async fn main() {
    STARTED.set(Instant::now()).ok();
    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(5000);
    let app = Router::new()
        .route("/health", get(health))
        .route("/rates", get(rates))
        .route("/quote", post(quote));
    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await.expect("bind");
    println!("pricing listening on {port}");
    axum::serve(listener, app).await.expect("serve");
}
