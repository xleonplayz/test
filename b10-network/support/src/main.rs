use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, State},
    http::{HeaderMap, StatusCode, header},
    response::{Html, IntoResponse},
    routing::get,
};
use clap::Parser;
use funkraum::{Action, Store, now};
use serde::Deserialize;
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};
#[derive(Parser)]
#[command(version, about = "Funkraum · Lokaler Support-Desk")]
struct Args {
    #[arg(long, env = "PORT", default_value_t = 8080)]
    port: u16,
    #[arg(long, env = "HOST", default_value = "127.0.0.1")]
    host: String,
    #[arg(long, default_value = "data/funkraum.sqlite")]
    db: PathBuf,
}
#[derive(Clone)]
struct App {
    store: Arc<Mutex<Store>>,
}
type ApiError = (StatusCode, Json<serde_json::Value>);
fn error(e: funkraum::Error) -> ApiError {
    (
        StatusCode::from_u16(e.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
        Json(serde_json::json!({"error":e.message})),
    )
}
fn lock_error() -> ApiError {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({"error":"Datenbank nicht verfügbar."})),
    )
}
async fn snapshot(State(app): State<App>) -> Result<impl IntoResponse, ApiError> {
    let s = app
        .store
        .lock()
        .map_err(|_| lock_error())?
        .snapshot()
        .map_err(error)?;
    Ok(([(header::CACHE_CONTROL, "no-store")], Json(s)))
}
#[derive(Deserialize)]
struct Command {
    revision: i64,
    action: Action,
}
async fn command(
    State(app): State<App>,
    headers: HeaderMap,
    Json(c): Json<Command>,
) -> Result<impl IntoResponse, ApiError> {
    let scheme = if headers.get("x-forwarded-proto").and_then(|v| v.to_str().ok()) == Some("https") { "https" } else { "http" };
    let allowed = headers
        .get(header::HOST)
        .and_then(|v| v.to_str().ok())
        .filter(|h| !h.is_empty())
        .map(|h| format!("{scheme}://{h}"));
    if headers.get("x-funkraum").and_then(|v| v.to_str().ok()) != Some("1")
        || allowed.is_none()
        || headers
            .get(header::ORIGIN)
            .is_some_and(|o| Some(o.as_bytes()) != allowed.as_ref().map(|s| s.as_bytes()))
    {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error":"Anfrage nicht zugelassen."})),
        ));
    }
    let s = app
        .store
        .lock()
        .map_err(|_| lock_error())?
        .command(c.revision, c.action, now())
        .map_err(error)?;
    Ok(Json(s))
}
async fn export(State(app): State<App>) -> Result<impl IntoResponse, ApiError> {
    let s = app
        .store
        .lock()
        .map_err(|_| lock_error())?
        .snapshot()
        .map_err(error)?;
    Ok((
        [
            (
                header::CONTENT_DISPOSITION,
                "attachment; filename=\"funkraum-export.json\"",
            ),
            (header::CACHE_CONTROL, "no-store"),
        ],
        Json(s),
    ))
}
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();
    let store = Store::open(&args.db)?;
    store.seed().map_err(|e| e.message)?;
    let app = App {
        store: Arc::new(Mutex::new(store)),
    };
    let router=Router::new().route("/",get(||async{([(header::CONTENT_SECURITY_POLICY,"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'")],Html(include_str!("../web/index.html")))}))
 .route("/app.css",get(||async{([(header::CONTENT_TYPE,"text/css")],include_str!("../web/app.css"))}))
 .route("/app.js",get(||async{([(header::CONTENT_TYPE,"text/javascript")],include_str!("../web/app.js"))}))
 .route("/health",get(||async{Json(serde_json::json!({"ok":true}))}))
 .route("/api/state",get(snapshot)).route("/api/commands",axum::routing::post(command)).route("/api/export",get(export))
 .layer(DefaultBodyLimit::max(64000)).with_state(app);
    let listener = tokio::net::TcpListener::bind((args.host.as_str(), args.port)).await?;
    println!("Funkraum: http://{}:{}", args.host, args.port);
    axum::serve(listener, router)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await?;
    Ok(())
}
