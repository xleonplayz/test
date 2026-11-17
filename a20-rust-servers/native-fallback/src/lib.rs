use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::{
    path::Path,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
#[derive(Debug)]
pub struct Error {
    pub status: u16,
    pub message: String,
}
impl From<rusqlite::Error> for Error {
    fn from(e: rusqlite::Error) -> Self {
        eprintln!("Database: {e}");
        Self {
            status: 500,
            message: "Datenbankzugriff fehlgeschlagen.".into(),
        }
    }
}
type Result<T> = std::result::Result<T, Error>;
fn bad(s: &str) -> Error {
    Error {
        status: 400,
        message: s.into(),
    }
}
fn clean(s: &str, max: usize) -> Result<String> {
    let s = s.trim();
    if s.is_empty() || s.len() > max || s.contains('\0') {
        Err(bad("Text fehlt oder ist zu lang."))
    } else {
        Ok(s.into())
    }
}
fn queue(q: &str) -> Result<()> {
    if ["Allgemein", "Technik", "Abrechnung"].contains(&q) {
        Ok(())
    } else {
        Err(bad("Unbekannter Bereich."))
    }
}
fn priority(p: i64) -> Result<()> {
    if (1..=3).contains(&p) {
        Ok(())
    } else {
        Err(bad("Priorität 1–3 erwartet."))
    }
}
fn sla(p: i64, tier: &str) -> i64 {
    let hours = match p {
        1 => 4,
        2 => 12,
        _ => 24,
    };
    hours * 3600 / if tier == "priority" { 2 } else { 1 }
}
pub fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
#[derive(Serialize, Debug)]
pub struct Customer {
    pub id: i64,
    pub name: String,
    pub company: String,
    pub email: String,
    pub tier: String,
}
#[derive(Serialize, Debug)]
pub struct Agent {
    pub id: i64,
    pub name: String,
    pub queue: String,
}
#[derive(Serialize, Debug)]
pub struct Ticket {
    pub id: i64,
    pub customer_id: i64,
    pub subject: String,
    pub description: String,
    pub queue: String,
    pub priority: i64,
    pub status: String,
    pub assignee: Option<i64>,
    pub created: i64,
    pub cycle_started: i64,
    pub due: i64,
    pub first_reply: Option<i64>,
    pub resolved: Option<i64>,
}
#[derive(Serialize)]
pub struct Message {
    pub id: i64,
    pub ticket_id: i64,
    pub kind: String,
    pub body: String,
    pub created: i64,
}
#[derive(Serialize)]
pub struct Event {
    pub id: i64,
    pub ticket_id: Option<i64>,
    pub kind: String,
    pub body: String,
    pub created: i64,
}
#[derive(Serialize)]
pub struct Macro {
    pub id: i64,
    pub title: String,
    pub body: String,
    pub queue: String,
}
#[derive(Serialize)]
pub struct Snapshot {
    pub revision: i64,
    pub now: i64,
    pub customers: Vec<Customer>,
    pub agents: Vec<Agent>,
    pub tickets: Vec<Ticket>,
    pub messages: Vec<Message>,
    pub events: Vec<Event>,
    pub macros: Vec<Macro>,
}
#[derive(Deserialize, Debug)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    CustomerCreate {
        name: String,
        company: String,
        email: String,
        tier: String,
    },
    AgentCreate {
        name: String,
        queue: String,
    },
    MacroCreate {
        title: String,
        body: String,
        queue: String,
    },
    TicketCreate {
        customer_id: i64,
        subject: String,
        description: String,
        queue: String,
        priority: i64,
    },
    TicketRoute {
        id: i64,
        queue: String,
        assignee: Option<i64>,
    },
    TicketPriority {
        id: i64,
        priority: i64,
    },
    TicketStatus {
        id: i64,
        status: String,
        summary: String,
    },
    MessageAdd {
        id: i64,
        kind: String,
        body: String,
    },
    BatchAssign {
        ids: Vec<i64>,
        agent_id: i64,
    },
}
pub struct Store {
    conn: Connection,
}
impl Store {
    pub fn open(path: &Path) -> std::result::Result<Self, Box<dyn std::error::Error>> {
        if let Some(p) = path.parent().filter(|p| !p.as_os_str().is_empty()) {
            std::fs::create_dir_all(p)?;
        }
        Ok(Self::new(Connection::open(path)?)?)
    }
    pub fn new(conn: Connection) -> std::result::Result<Self, rusqlite::Error> {
        conn.busy_timeout(Duration::from_secs(5))?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
   CREATE TABLE IF NOT EXISTS meta(id INTEGER PRIMARY KEY,revision INTEGER NOT NULL);INSERT OR IGNORE INTO meta VALUES(1,0);
   CREATE TABLE IF NOT EXISTS customers(id INTEGER PRIMARY KEY,name TEXT NOT NULL,company TEXT NOT NULL,email TEXT UNIQUE COLLATE NOCASE NOT NULL,tier TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS agents(id INTEGER PRIMARY KEY,name TEXT NOT NULL,queue TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS macros(id INTEGER PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,queue TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS tickets(id INTEGER PRIMARY KEY,customer_id INTEGER REFERENCES customers(id),subject TEXT NOT NULL,description TEXT NOT NULL,queue TEXT NOT NULL,priority INTEGER NOT NULL,status TEXT NOT NULL,assignee INTEGER REFERENCES agents(id),created INTEGER NOT NULL,cycle_started INTEGER NOT NULL,due INTEGER NOT NULL,first_reply INTEGER,resolved INTEGER);
   CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,ticket_id INTEGER REFERENCES tickets(id),kind TEXT NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,ticket_id INTEGER REFERENCES tickets(id),kind TEXT NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL);")?;
        Ok(Self { conn })
    }
    fn revision(&self) -> Result<i64> {
        Ok(self
            .conn
            .query_row("SELECT revision FROM meta WHERE id=1", [], |r| r.get(0))?)
    }
    fn customer(&self, id: i64) -> Result<Customer> {
        self.conn
            .query_row(
                "SELECT id,name,company,email,tier FROM customers WHERE id=?",
                [id],
                |r| {
                    Ok(Customer {
                        id: r.get(0)?,
                        name: r.get(1)?,
                        company: r.get(2)?,
                        email: r.get(3)?,
                        tier: r.get(4)?,
                    })
                },
            )
            .map_err(|_| bad("Kunde nicht gefunden."))
    }
    fn agent(&self, id: i64) -> Result<Agent> {
        self.conn
            .query_row("SELECT id,name,queue FROM agents WHERE id=?", [id], |r| {
                Ok(Agent {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    queue: r.get(2)?,
                })
            })
            .map_err(|_| bad("Person nicht gefunden."))
    }
    fn ticket(&self, id: i64) -> Result<Ticket> {
        self.conn
            .query_row("SELECT * FROM tickets WHERE id=?", [id], ticket_row)
            .map_err(|_| bad("Ticket nicht gefunden."))
    }
    fn event(&self, id: Option<i64>, kind: &str, body: &str, time: i64) -> Result<()> {
        self.conn.execute(
            "INSERT INTO events(ticket_id,kind,body,created)VALUES(?,?,?,?)",
            params![id, kind, body, time],
        )?;
        Ok(())
    }
    fn read(&self, time: i64) -> Result<Snapshot> {
        let customers = self
            .conn
            .prepare("SELECT * FROM customers ORDER BY name")?
            .query_map([], |r| {
                Ok(Customer {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    company: r.get(2)?,
                    email: r.get(3)?,
                    tier: r.get(4)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        let agents = self
            .conn
            .prepare("SELECT * FROM agents ORDER BY name")?
            .query_map([], |r| {
                Ok(Agent {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    queue: r.get(2)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        let tickets = self
            .conn
            .prepare("SELECT * FROM tickets ORDER BY created DESC,id DESC")?
            .query_map([], ticket_row)?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        let messages = self
            .conn
            .prepare("SELECT * FROM messages ORDER BY id")?
            .query_map([], |r| {
                Ok(Message {
                    id: r.get(0)?,
                    ticket_id: r.get(1)?,
                    kind: r.get(2)?,
                    body: r.get(3)?,
                    created: r.get(4)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        let events = self
            .conn
            .prepare("SELECT * FROM events ORDER BY id DESC")?
            .query_map([], |r| {
                Ok(Event {
                    id: r.get(0)?,
                    ticket_id: r.get(1)?,
                    kind: r.get(2)?,
                    body: r.get(3)?,
                    created: r.get(4)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        let macros = self
            .conn
            .prepare("SELECT * FROM macros ORDER BY title")?
            .query_map([], |r| {
                Ok(Macro {
                    id: r.get(0)?,
                    title: r.get(1)?,
                    body: r.get(2)?,
                    queue: r.get(3)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(Snapshot {
            revision: self.revision()?,
            now: time,
            customers,
            agents,
            tickets,
            messages,
            events,
            macros,
        })
    }
    pub fn snapshot(&self) -> Result<Snapshot> {
        self.conn.execute_batch("BEGIN")?;
        let r = self.read(now());
        match r {
            Ok(s) => {
                self.conn.execute_batch("COMMIT")?;
                Ok(s)
            }
            Err(e) => {
                self.conn.execute_batch("ROLLBACK")?;
                Err(e)
            }
        }
    }
    pub fn command(&self, revision: i64, action: Action, time: i64) -> Result<Snapshot> {
        self.conn.execute_batch("BEGIN IMMEDIATE")?;
        let result = (|| {
            if self.revision()? != revision {
                return Err(Error {
                    status: 409,
                    message:
                        "Inzwischen geändert. Die Ansicht wird aktualisiert; bitte erneut prüfen."
                            .into(),
                });
            }
            self.apply(action, time)?;
            self.conn
                .execute("UPDATE meta SET revision=revision+1 WHERE id=1", [])?;
            self.read(time)
        })();
        match result {
            Ok(s) => {
                self.conn.execute_batch("COMMIT")?;
                Ok(s)
            }
            Err(e) => {
                self.conn.execute_batch("ROLLBACK")?;
                Err(e)
            }
        }
    }
    fn apply(&self, a: Action, time: i64) -> Result<()> {
        match a {
            Action::CustomerCreate {
                name,
                company,
                email,
                tier,
            } => {
                let name = clean(&name, 120)?;
                let company = clean(&company, 120)?;
                let email = clean(&email, 200)?.to_lowercase();
                if email.contains(char::is_whitespace)
                    || !email.contains('@')
                    || !email.rsplit('@').next().unwrap_or("").contains('.')
                    || !["standard", "priority"].contains(&tier.as_str())
                {
                    return Err(bad("E-Mail oder Service-Level prüfen."));
                }
                let exists: bool = self.conn.query_row(
                    "SELECT EXISTS(SELECT 1 FROM customers WHERE email=?)",
                    [&email],
                    |r| r.get(0),
                )?;
                if exists {
                    return Err(bad("Diese E-Mail-Adresse existiert bereits."));
                }
                self.conn.execute(
                    "INSERT INTO customers(name,company,email,tier)VALUES(?,?,?,?)",
                    params![name, company, email, tier],
                )?;
                self.event(None, "customer", &name, time)?;
            }
            Action::AgentCreate { name, queue: q } => {
                let name = clean(&name, 80)?;
                queue(&q)?;
                self.conn.execute(
                    "INSERT INTO agents(name,queue)VALUES(?,?)",
                    params![name, q],
                )?;
                self.event(None, "agent", &name, time)?;
            }
            Action::MacroCreate {
                title,
                body,
                queue: q,
            } => {
                let title = clean(&title, 100)?;
                let body = clean(&body, 8000)?;
                queue(&q)?;
                self.conn.execute(
                    "INSERT INTO macros(title,body,queue)VALUES(?,?,?)",
                    params![title, body, q],
                )?;
                self.event(None, "macro", &title, time)?;
            }
            Action::TicketCreate {
                customer_id,
                subject,
                description,
                queue: q,
                priority: p,
            } => {
                let c = self.customer(customer_id)?;
                let subject = clean(&subject, 160)?;
                let description = clean(&description, 12000)?;
                queue(&q)?;
                priority(p)?;
                self.conn.execute("INSERT INTO tickets(customer_id,subject,description,queue,priority,status,created,cycle_started,due)VALUES(?,?,?,?,?,'open',?,?,?)",params![c.id,subject,description,q,p,time,time,time+sla(p,&c.tier)])?;
                self.event(
                    Some(self.conn.last_insert_rowid()),
                    "created",
                    "Ticket angelegt.",
                    time,
                )?;
            }
            Action::TicketRoute {
                id,
                queue: q,
                assignee,
            } => {
                let t = self.ticket(id)?;
                if t.status == "resolved" {
                    return Err(bad("Gelöstes Ticket zuerst wieder öffnen."));
                }
                queue(&q)?;
                if let Some(id) = assignee {
                    if self.agent(id)?.queue != q {
                        return Err(bad("Zuständige Person muss zum Bereich gehören."));
                    }
                }
                self.conn.execute(
                    "UPDATE tickets SET queue=?,assignee=? WHERE id=?",
                    params![q, assignee, id],
                )?;
                self.event(
                    Some(id),
                    "routed",
                    &format!(
                        "Bereich: {q} · Zuständig: {}",
                        assignee
                            .map(|a| a.to_string())
                            .unwrap_or_else(|| "offen".into())
                    ),
                    time,
                )?;
            }
            Action::TicketPriority { id, priority: p } => {
                priority(p)?;
                let t = self.ticket(id)?;
                if t.status == "resolved" {
                    return Err(bad("Gelöstes Ticket zuerst wieder öffnen."));
                }
                let due = t
                    .due
                    .min(t.cycle_started + sla(p, &self.customer(t.customer_id)?.tier));
                self.conn.execute(
                    "UPDATE tickets SET priority=?,due=? WHERE id=?",
                    params![p, due, id],
                )?;
                self.event(
                    Some(id),
                    "priority",
                    &format!("Priorität P{p}; bestehende Frist wird nicht verlängert."),
                    time,
                )?;
            }
            Action::TicketStatus {
                id,
                status,
                summary,
            } => {
                let t = self.ticket(id)?;
                let allowed = match t.status.as_str() {
                    "open" => ["working", "waiting", "resolved"].contains(&status.as_str()),
                    "working" => ["waiting", "resolved"].contains(&status.as_str()),
                    "waiting" => ["working", "resolved"].contains(&status.as_str()),
                    "resolved" => status == "open",
                    _ => false,
                };
                if !allowed {
                    return Err(bad("Dieser Statuswechsel ist nicht möglich."));
                }
                let summary = clean(&summary, 3000)?;
                if status == "open" {
                    let due = time + sla(t.priority, &self.customer(t.customer_id)?.tier);
                    self.conn.execute("UPDATE tickets SET status='open',cycle_started=?,due=?,first_reply=NULL,resolved=NULL WHERE id=?",params![time,due,id])?;
                } else {
                    self.conn.execute(
                        "UPDATE tickets SET status=?,resolved=? WHERE id=?",
                        params![
                            status,
                            if status == "resolved" {
                                Some(time)
                            } else {
                                None
                            },
                            id
                        ],
                    )?;
                }
                self.event(
                    Some(id),
                    "status",
                    &format!("{} → {}: {}", t.status, status, summary),
                    time,
                )?;
            }
            Action::MessageAdd { id, kind, body } => {
                let t = self.ticket(id)?;
                if t.status == "resolved" {
                    return Err(bad("Gelöstes Ticket zuerst wieder öffnen."));
                }
                if !["note", "reply"].contains(&kind.as_str()) {
                    return Err(bad("Notiz oder Antwort erwartet."));
                }
                let body = clean(&body, 8000)?;
                self.conn.execute(
                    "INSERT INTO messages(ticket_id,kind,body,created)VALUES(?,?,?,?)",
                    params![id, kind, body, time],
                )?;
                if kind == "reply" {
                    self.conn.execute(
                        "UPDATE tickets SET first_reply=COALESCE(first_reply,?) WHERE id=?",
                        params![time, id],
                    )?;
                }
                self.event(
                    Some(id),
                    &kind,
                    if kind == "reply" {
                        "Antwort lokal protokolliert; kein Versand."
                    } else {
                        "Interne Notiz hinzugefügt."
                    },
                    time,
                )?;
            }
            Action::BatchAssign { ids, agent_id } => {
                let agent = self.agent(agent_id)?;
                if ids.is_empty() || ids.len() > 100 {
                    return Err(bad("1–100 Tickets auswählen."));
                }
                let unique = ids.iter().collect::<std::collections::HashSet<_>>();
                if unique.len() != ids.len() {
                    return Err(bad("Doppelte Ticket-Auswahl."));
                }
                for id in &ids {
                    let t = self.ticket(*id)?;
                    if t.queue != agent.queue || t.status == "resolved" {
                        return Err(bad(
                            "Alle Tickets müssen offen und im Bereich der Person sein.",
                        ));
                    }
                }
                for id in ids {
                    self.conn.execute(
                        "UPDATE tickets SET assignee=? WHERE id=?",
                        params![agent_id, id],
                    )?;
                    self.event(
                        Some(id),
                        "assigned",
                        &format!("Zugewiesen an {}", agent.name),
                        time,
                    )?;
                }
            }
        }
        Ok(())
    }
    pub fn seed(&self) -> Result<()> {
        if !self.snapshot()?.customers.is_empty() {
            return Ok(());
        }
        let time = now();
        let actions=vec![
   Action::CustomerCreate{name:"Mara Winter".into(),company:"Studio West".into(),email:"mara@example.test".into(),tier:"priority".into()},
   Action::CustomerCreate{name:"Jonas Berg".into(),company:"Nordlicht Kollektiv".into(),email:"jonas@example.test".into(),tier:"standard".into()},
   Action::AgentCreate{name:"Lea".into(),queue:"Technik".into()},Action::AgentCreate{name:"Noah".into(),queue:"Allgemein".into()},Action::AgentCreate{name:"Alex".into(),queue:"Abrechnung".into()},
   Action::MacroCreate{title:"Rückfrage zum Vorgang".into(),queue:"Allgemein".into(),body:"Danke für die Beschreibung. Welche Schritte haben zu dem Verhalten geführt? Mit einem konkreten Beispiel können wir die Ursache besser eingrenzen.".into()},
   Action::MacroCreate{title:"Technische Prüfung".into(),queue:"Technik".into(),body:"Wir haben den Vorgang aufgenommen und prüfen die betroffenen Komponenten. Die nächsten Erkenntnisse halten wir hier fest.".into()},
   Action::TicketCreate{customer_id:1,subject:"Export bleibt bei 80 Prozent stehen".into(),description:"Seit heute Morgen bleibt der Projekt-Export hängen. Der vorherige Export war erfolgreich. Betroffen ist das Projekt Sommerkollektion.".into(),queue:"Technik".into(),priority:1},
   Action::TicketCreate{customer_id:2,subject:"Neues Teammitglied hinzufügen".into(),description:"Wir möchten nächste Woche eine weitere Person in unser Team aufnehmen. Welche Angaben werden dafür benötigt?".into(),queue:"Allgemein".into(),priority:3},
   Action::TicketCreate{customer_id:2,subject:"Belegadresse aktualisieren".into(),description:"Unser Büro ist umgezogen. Bitte den Vorgang zur Aktualisierung der Stammdaten aufnehmen.".into(),queue:"Abrechnung".into(),priority:2}
  ];
        for a in actions {
            self.command(self.revision()?, a, time - 3 * 3600)?;
        }
        self.command(
            self.revision()?,
            Action::TicketRoute {
                id: 1,
                queue: "Technik".into(),
                assignee: Some(1),
            },
            time - 2 * 3600,
        )?;
        self.command(self.revision()?,Action::MessageAdd{id:1,kind:"note".into(),body:"Reproduktion mit einer kleinen Testdatei läuft durch. Der umfangreiche Export wird noch untersucht.".into()},time-3600)?;
        Ok(())
    }
}
fn ticket_row(r: &rusqlite::Row) -> rusqlite::Result<Ticket> {
    Ok(Ticket {
        id: r.get(0)?,
        customer_id: r.get(1)?,
        subject: r.get(2)?,
        description: r.get(3)?,
        queue: r.get(4)?,
        priority: r.get(5)?,
        status: r.get(6)?,
        assignee: r.get(7)?,
        created: r.get(8)?,
        cycle_started: r.get(9)?,
        due: r.get(10)?,
        first_reply: r.get(11)?,
        resolved: r.get(12)?,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    fn setup() -> Store {
        let s = Store::new(Connection::open_in_memory().unwrap()).unwrap();
        s.command(
            0,
            Action::CustomerCreate {
                name: "Test".into(),
                company: "Firma".into(),
                email: "a@test.example".into(),
                tier: "standard".into(),
            },
            100,
        )
        .unwrap();
        s
    }
    fn ticket(s: &Store, q: &str) {
        s.command(
            s.revision().unwrap(),
            Action::TicketCreate {
                customer_id: 1,
                subject: "Problem".into(),
                description: "Beschreibung".into(),
                queue: q.into(),
                priority: 2,
            },
            100,
        )
        .unwrap();
    }
    #[test]
    fn stale_updates_do_not_write() {
        let s = setup();
        ticket(&s, "Technik");
        assert_eq!(
            s.command(0, Action::TicketPriority { id: 1, priority: 1 }, 200)
                .err()
                .unwrap()
                .status,
            409
        );
        assert_eq!(s.ticket(1).unwrap().priority, 2);
    }
    #[test]
    fn notes_do_not_stop_response_clock() {
        let s = setup();
        ticket(&s, "Technik");
        s.command(
            2,
            Action::MessageAdd {
                id: 1,
                kind: "note".into(),
                body: "Intern".into(),
            },
            200,
        )
        .unwrap();
        assert_eq!(s.ticket(1).unwrap().first_reply, None);
        s.command(
            3,
            Action::MessageAdd {
                id: 1,
                kind: "reply".into(),
                body: "Antwort".into(),
            },
            300,
        )
        .unwrap();
        assert_eq!(s.ticket(1).unwrap().first_reply, Some(300));
    }
    #[test]
    fn resolution_requires_summary_and_reopening_starts_new_cycle() {
        let s = setup();
        ticket(&s, "Technik");
        assert!(
            s.command(
                2,
                Action::TicketStatus {
                    id: 1,
                    status: "resolved".into(),
                    summary: " ".into()
                },
                200
            )
            .is_err()
        );
        s.command(
            2,
            Action::TicketStatus {
                id: 1,
                status: "resolved".into(),
                summary: "Behoben".into(),
            },
            300,
        )
        .unwrap();
        s.command(
            3,
            Action::TicketStatus {
                id: 1,
                status: "open".into(),
                summary: "Erneut aufgetreten".into(),
            },
            1000,
        )
        .unwrap();
        let t = s.ticket(1).unwrap();
        assert_eq!(t.due, 1000 + 12 * 3600);
        assert_eq!(t.first_reply, None);
        assert_eq!(t.created, 100);
    }
    #[test]
    fn priority_escalates_without_extending_existing_deadline() {
        let s = setup();
        ticket(&s, "Technik");
        s.command(2, Action::TicketPriority { id: 1, priority: 1 }, 200)
            .unwrap();
        s.command(3, Action::TicketPriority { id: 1, priority: 3 }, 300)
            .unwrap();
        assert_eq!(s.ticket(1).unwrap().due, 100 + 4 * 3600);
    }
    #[test]
    fn bulk_assignment_rolls_back_if_one_ticket_has_wrong_queue() {
        let s = setup();
        ticket(&s, "Technik");
        ticket(&s, "Allgemein");
        s.command(
            3,
            Action::AgentCreate {
                name: "Lea".into(),
                queue: "Technik".into(),
            },
            100,
        )
        .unwrap();
        assert!(
            s.command(
                4,
                Action::BatchAssign {
                    ids: vec![1, 2],
                    agent_id: 1
                },
                200
            )
            .is_err()
        );
        assert_eq!(s.ticket(1).unwrap().assignee, None);
        assert_eq!(s.revision().unwrap(), 4);
    }
    #[test]
    fn duplicate_email_is_case_insensitive() {
        let s = setup();
        assert!(
            s.command(
                1,
                Action::CustomerCreate {
                    name: "Andere".into(),
                    company: "Firma".into(),
                    email: "A@Test.Example".into(),
                    tier: "standard".into()
                },
                200
            )
            .is_err()
        );
    }
}
