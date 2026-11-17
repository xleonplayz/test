use actix_web::{web,App,HttpServer,HttpRequest,HttpResponse};
use funkraum::{Store,Action,now};
use serde::Deserialize;
use std::{path::Path,sync::Mutex};
#[derive(Deserialize)]struct Command{revision:i64,action:Action}
async fn state(req:HttpRequest,store:web::Data<Mutex<Store>>)->HttpResponse{match store.lock().unwrap().snapshot(){Ok(s)=>{let mut response=HttpResponse::Ok();response.insert_header(("Cache-Control","no-store"));if req.path()=="/api/export"{response.insert_header(("Content-Disposition","attachment; filename=funkraum.json"));}response.json(s)},Err(e)=>HttpResponse::InternalServerError().json(serde_json::json!({"error":e.message}))}}
async fn command(req:HttpRequest,store:web::Data<Mutex<Store>>,c:web::Json<Command>)->HttpResponse{
 let valid=req.headers().get("x-funkraum").and_then(|v|v.to_str().ok())==Some("1");
 let host=req.connection_info().host().to_owned();let scheme=req.connection_info().scheme().to_owned();let origin=req.headers().get("origin").and_then(|v|v.to_str().ok());
 if !valid||origin.is_some_and(|s|s!=format!("{scheme}://{host}")){return HttpResponse::Forbidden().json(serde_json::json!({"error":"origin_denied"}));}
 match store.lock().unwrap().command(c.revision,c.into_inner().action,now()){Ok(s)=>HttpResponse::Ok().json(s),Err(e)=>HttpResponse::build(actix_web::http::StatusCode::from_u16(e.status).unwrap()).json(serde_json::json!({"error":e.message}))}
}
#[actix_web::main]async fn main()->std::io::Result<()>{
 let args:Vec<String>=std::env::args().collect();let arg=|name:&str|args.windows(2).find(|w|w[0]==name).map(|w|w[1].clone());
 let path=arg("--db").unwrap_or_else(||std::env::var("APP_DB").unwrap_or("data/funkraum.sqlite".into()));
 let store=Store::open(Path::new(&path)).expect("open database");store.seed().expect("seed");let data=web::Data::new(Mutex::new(store));
 let port:u16=arg("--port").or_else(||std::env::var("PORT").ok()).unwrap_or("8080".into()).parse().expect("PORT");
 HttpServer::new(move||App::new().app_data(data.clone()).app_data(web::JsonConfig::default().limit(64000))
 .route("/",web::get().to(||async{HttpResponse::Ok().content_type("text/html; charset=utf-8").body(include_str!("../web/index.html"))}))
 .route("/app.js",web::get().to(||async{HttpResponse::Ok().content_type("text/javascript").body(include_str!("../web/app.js"))}))
 .route("/app.css",web::get().to(||async{HttpResponse::Ok().content_type("text/css").body(include_str!("../web/app.css"))}))
 .route("/health",web::get().to(||async{HttpResponse::Ok().json(serde_json::json!({"ok":true}))}))
 .route("/api/state",web::get().to(state)).route("/api/export",web::get().to(state)).route("/api/commands",web::post().to(command)))
 .bind((std::env::var("HOST").unwrap_or("127.0.0.1".into()),port))?.run().await
}
