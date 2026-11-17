use serde_json::{Value, json};
use std::{
    fs,
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    path::PathBuf,
    process::{Child, Command, Stdio},
    thread::sleep,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

struct Server {
    child: Child,
    port: u16,
    dir: PathBuf,
}
impl Server {
    fn start() -> Self {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("funkraum-http-{stamp}"));
        fs::create_dir(&dir).unwrap();
        let port = TcpListener::bind("127.0.0.1:0")
            .unwrap()
            .local_addr()
            .unwrap()
            .port();
        let child = Command::new(env!("CARGO_BIN_EXE_funkraum"))
            .args(["--port", &port.to_string(), "--db"])
            .arg(dir.join("test.sqlite"))
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .unwrap();
        let mut server = Self { child, port, dir };
        for _ in 0..100 {
            if TcpStream::connect(("127.0.0.1", port)).is_ok() {
                return server;
            }
            if let Some(status) = server.child.try_wait().unwrap() {
                panic!("Server exited: {status}");
            }
            sleep(Duration::from_millis(20));
        }
        panic!("Server did not start");
    }
    fn request(
        &self,
        method: &str,
        path: &str,
        headers: &str,
        body: &str,
    ) -> (u16, String, String) {
        let mut stream = TcpStream::connect(("127.0.0.1", self.port)).unwrap();
        stream
            .set_read_timeout(Some(Duration::from_secs(3)))
            .unwrap();
        write!(stream, "{method} {path} HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nConnection: close\r\nContent-Length: {}\r\n{headers}\r\n{body}", self.port, body.len()).unwrap();
        let mut response = String::new();
        stream.read_to_string(&mut response).unwrap();
        let (head, body) = response.split_once("\r\n\r\n").unwrap();
        let status = head.split_whitespace().nth(1).unwrap().parse().unwrap();
        (status, head.to_owned(), body.to_owned())
    }
}
impl Drop for Server {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
        let _ = fs::remove_dir_all(&self.dir);
    }
}
#[test]
fn http_routes_origin_validation_revisions_and_export() {
    let server = Server::start();
    assert_eq!(server.request("GET", "/health", "", "").0, 200);
    let (status, headers, body) = server.request("GET", "/api/state", "", "");
    assert_eq!(status, 200);
    assert!(headers.contains("no-store"));
    let initial: Value = serde_json::from_str(&body).unwrap();
    let command = json!({
        "revision": initial["revision"],
        "action": {"type":"customer_create","name":"HTTP Test","company":"Studio",
                   "email":"http@example.test","tier":"standard"}
    })
    .to_string();
    let valid = "Content-Type: application/json\r\nX-Funkraum: 1\r\n";
    assert_eq!(
        server
            .request(
                "POST",
                "/api/commands",
                "Content-Type: application/json\r\n",
                &command
            )
            .0,
        403
    );
    assert_eq!(
        server
            .request(
                "POST",
                "/api/commands",
                &(valid.to_owned() + "Origin: https://foreign.test\r\n"),
                &command
            )
            .0,
        403
    );
    assert_eq!(
        server.request("POST", "/api/commands", valid, &command).0,
        200
    );
    assert_eq!(
        server.request("POST", "/api/commands", valid, &command).0,
        409
    );
    assert_eq!(server.request("POST", "/api/commands", valid, "{").0, 400);
    let (status, headers, body) = server.request("GET", "/api/export", "", "");
    assert_eq!(status, 200);
    assert!(headers.contains("attachment"));
    let export: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(
        export["customers"].as_array().unwrap().len(),
        initial["customers"].as_array().unwrap().len() + 1
    );
}
