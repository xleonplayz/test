//! Backend app: hands out quotes as JSON.
//!
//! ```text
//!   GET /health        {"ok":true,"app":"backend"}
//!   GET /quote?i=<n>   {"text":"…","index":n,"total":5}
//! ```
//!
//! Two modes, one handler. On the platform the app is started per request:
//! the raw HTTP request arrives on stdin and whatever goes to stdout is the
//! response. `--serve` starts a plain HTTP server for local development.

use std::io::Read;

const QUOTES: &[&str] = &[
    "Talk is cheap. Show me the code.",
    "Programs must be written for people to read.",
    "Simplicity is prerequisite for reliability.",
    "Any fool can write code that a computer can understand.",
    "Deleted code is debugged code.",
];

fn answer(method: &str, target: &str) -> String {
    let (path, query) = match target.split_once('?') {
        Some((p, q)) => (p, q),
        None => (target, ""),
    };
    match (method, path) {
        ("GET", "/") | ("GET", "/health") => r#"{"ok":true,"app":"backend"}"#.to_string(),
        ("GET", "/quote") => {
            let i = query
                .split('&')
                .find_map(|kv| kv.strip_prefix("i="))
                .and_then(|v| v.parse::<usize>().ok())
                .unwrap_or(0);
            let index = i % QUOTES.len();
            format!(
                r#"{{"text":"{}","index":{},"total":{}}}"#,
                escape(QUOTES[index]),
                index,
                QUOTES.len()
            )
        }
        _ => format!(r#"{{"error":"not found","path":"{}"}}"#, escape(path)),
    }
}

fn escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out
}

fn request_line(raw: &str) -> (String, String) {
    let line = raw.lines().next().unwrap_or("");
    let mut parts = line.split_whitespace();
    let method = parts.next().unwrap_or("GET").to_string();
    let target = parts.next().unwrap_or("/").to_string();
    (method, target)
}

fn main() {
    if std::env::args().any(|a| a == "--serve") {
        serve();
        return;
    }
    let mut raw = String::new();
    let _ = std::io::stdin().read_to_string(&mut raw);
    let (method, target) = request_line(&raw);
    println!("{}", answer(&method, &target));
}

/// Local development only: `std::net` is not available on the platform.
fn serve() {
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpListener;
    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8081);
    let listener = TcpListener::bind(("0.0.0.0", port)).expect("bind");
    eprintln!("backend: listening on :{port}");
    for stream in listener.incoming() {
        let Ok(mut s) = stream else { continue };
        let mut line = String::new();
        let _ = BufReader::new(&s).read_line(&mut line);
        let (method, target) = request_line(&line);
        let body = answer(&method, &target);
        let _ = write!(
            s,
            "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{}",
            body.len(),
            body
        );
    }
}
