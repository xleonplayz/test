import {
  database,
  workspace,
  text,
  optional,
  int,
  choice,
  email,
  day,
  csv,
  fail,
} from "./db.mjs";
import { randomUUID } from "node:crypto";
const schema =
  [
    "CREATE TABLE IF NOT EXISTS groups(id INTEGER PRIMARY KEY,name TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,group_id INTEGER NOT NULL REFERENCES groups(id))",
    "CREATE TABLE IF NOT EXISTS courses(id INTEGER PRIMARY KEY,title TEXT NOT NULL,category TEXT NOT NULL,description TEXT NOT NULL,teacher TEXT NOT NULL,pass_mark INTEGER NOT NULL,status TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS lessons(id INTEGER PRIMARY KEY,course_id INTEGER NOT NULL REFERENCES courses(id),position INTEGER NOT NULL,title TEXT NOT NULL,minutes INTEGER NOT NULL,body TEXT NOT NULL,questions TEXT NOT NULL,UNIQUE(course_id,position))",
    "CREATE TABLE IF NOT EXISTS enrollments(id INTEGER PRIMARY KEY,course_id INTEGER NOT NULL REFERENCES courses(id),student_id INTEGER NOT NULL REFERENCES students(id),due TEXT NOT NULL,created TEXT NOT NULL,UNIQUE(course_id,student_id))",
    "CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY,enrollment_id INTEGER NOT NULL REFERENCES enrollments(id),lesson_id INTEGER NOT NULL REFERENCES lessons(id),answers TEXT NOT NULL,score INTEGER NOT NULL,passed INTEGER NOT NULL,created TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS notes(id INTEGER PRIMARY KEY,enrollment_id INTEGER NOT NULL REFERENCES enrollments(id),lesson_id INTEGER NOT NULL REFERENCES lessons(id),body TEXT NOT NULL,UNIQUE(enrollment_id,lesson_id))",
    "CREATE TABLE IF NOT EXISTS certificates(id TEXT PRIMARY KEY,enrollment_id INTEGER UNIQUE NOT NULL REFERENCES enrollments(id),created TEXT NOT NULL)",
  ].join(";") + ";";
export function openStore(dir, { seed = true } = {}) {
  const db = database(dir, "campus", schema);
  const courseLessons = (id) =>
    db.all("SELECT * FROM lessons WHERE course_id=? ORDER BY position", id);
  const passed = (enrollment, lesson) =>
    !!db.one(
      "SELECT id FROM attempts WHERE enrollment_id=? AND lesson_id=? AND passed=1",
      enrollment,
      lesson,
    );
  const available = (enrollment, lesson) => {
    if (enrollment.course_id !== lesson.course_id)
      fail("Lektion gehört nicht zu dieser Einschreibung.");
    for (const prev of courseLessons(lesson.course_id).filter(
      (l) => l.position < lesson.position,
    ))
      if (!passed(enrollment.id, prev.id))
        fail("Zuerst die vorherigen Lektionen bestehen.");
  };
  const draft = (c) => {
    if (c.status !== "draft")
      fail(
        "Veröffentlichte Kurse sind unveränderlich. Für Änderungen eine neue Version kopieren.",
      );
  };
  const questions = (value) => {
    if (!Array.isArray(value) || value.length < 1 || value.length > 10)
      fail("1–10 Prüfungsfragen erforderlich.");
    return value.map((q) => {
      if (
        !q ||
        !Array.isArray(q.options) ||
        q.options.length < 2 ||
        q.options.length > 5
      )
        fail("Jede Frage braucht 2–5 Antworten.");
      const options = q.options.map((o) => text(o, 500));
      if (new Set(options).size !== options.length)
        fail("Antworten müssen sich unterscheiden.");
      return {
        prompt: text(q.prompt, 1000),
        options,
        correct: int(q.correct, 0, options.length - 1),
        explanation: text(q.explanation, 2000),
      };
    });
  };
  const read = () => ({
    groups: db.all("SELECT * FROM groups ORDER BY name"),
    students: db.all("SELECT * FROM students ORDER BY name"),
    courses: db.all("SELECT * FROM courses ORDER BY id DESC"),
    lessons: db
      .all("SELECT * FROM lessons ORDER BY course_id,position")
      .map((l) => ({ ...l, questions: JSON.parse(l.questions) })),
    enrollments: db.all("SELECT * FROM enrollments ORDER BY id"),
    attempts: db
      .all("SELECT * FROM attempts ORDER BY id DESC")
      .map((a) => ({ ...a, answers: JSON.parse(a.answers) })),
    notes: db.all("SELECT * FROM notes"),
    certificates: db.all("SELECT * FROM certificates"),
  });
  const api = workspace(db, read, (a) => {
    switch (a.type) {
      case "group.create":
        db.run("INSERT INTO groups(name) VALUES(?)", text(a.name));
        return "Lerngruppe angelegt: " + a.name;
      case "student.create": {
        const address = email(a.email);
        db.require("groups", a.groupId);
        if (db.one("SELECT id FROM students WHERE email=?", address))
          fail("E-Mail-Adresse bereits vorhanden.");
        db.run(
          "INSERT INTO students(name,email,group_id) VALUES(?,?,?)",
          text(a.name),
          address,
          a.groupId,
        );
        return "Lernprofil angelegt: " + a.name;
      }
      case "student.group": {
        const s = db.require("students", a.id),
          g = db.require("groups", a.groupId);
        db.run("UPDATE students SET group_id=? WHERE id=?", g.id, s.id);
        return s.name + " → " + g.name;
      }
      case "course.create":
        db.run(
          "INSERT INTO courses(title,category,description,teacher,pass_mark,status) VALUES(?,?,?,?,?,'draft')",
          text(a.title),
          text(a.category, 80),
          text(a.description, 8000),
          text(a.teacher),
          int(a.passMark, 50, 100),
        );
        return "Kursentwurf: " + a.title;
      case "course.update": {
        const c = db.require("courses", a.id);
        draft(c);
        db.run(
          "UPDATE courses SET title=?,category=?,description=?,teacher=?,pass_mark=? WHERE id=?",
          text(a.title),
          text(a.category, 80),
          text(a.description, 8000),
          text(a.teacher),
          int(a.passMark, 50, 100),
          c.id,
        );
        return "Kurs bearbeitet: " + a.title;
      }
      case "course.publish": {
        const c = db.require("courses", a.id);
        draft(c);
        if (!courseLessons(c.id).length)
          fail("Mindestens eine vollständige Lektion anlegen.");
        db.run("UPDATE courses SET status='published' WHERE id=?", c.id);
        return "Kurs veröffentlicht: " + c.title;
      }
      case "course.archive": {
        const c = db.require("courses", a.id);
        if (c.status !== "published")
          fail("Nur veröffentlichte Kurse archivieren.");
        db.run("UPDATE courses SET status='archived' WHERE id=?", c.id);
        return (
          "Kurs archiviert, bestehende Einschreibungen bleiben nutzbar: " +
          c.title
        );
      }
      case "course.clone": {
        const c = db.require("courses", a.id);
        const id = db.insert(
          "INSERT INTO courses(title,category,description,teacher,pass_mark,status) VALUES(?,?,?,?,?,'draft')",
          text(a.title),
          c.category,
          c.description,
          c.teacher,
          c.pass_mark,
        );
        for (const l of courseLessons(c.id))
          db.run(
            "INSERT INTO lessons(course_id,position,title,minutes,body,questions) VALUES(?,?,?,?,?,?)",
            id,
            l.position,
            l.title,
            l.minutes,
            l.body,
            l.questions,
          );
        return "Neue Kursversion: " + a.title;
      }
      case "lesson.create":
      case "lesson.update": {
        const existing =
            a.type === "lesson.update" ? db.require("lessons", a.id) : null,
          c = db.require("courses", existing?.course_id ?? a.courseId);
        draft(c);
        const q = JSON.stringify(questions(a.questions));
        if (existing)
          db.run(
            "UPDATE lessons SET title=?,minutes=?,body=?,questions=? WHERE id=?",
            text(a.title),
            int(a.minutes, 1, 600),
            text(a.body, 20000),
            q,
            existing.id,
          );
        else {
          const position = db.one(
            "SELECT COALESCE(MAX(position),0)+1 AS n FROM lessons WHERE course_id=?",
            c.id,
          ).n;
          if (position > 30) fail("Maximal 30 Lektionen pro Kurs.");
          db.run(
            "INSERT INTO lessons(course_id,position,title,minutes,body,questions) VALUES(?,?,?,?,?,?)",
            c.id,
            position,
            text(a.title),
            int(a.minutes, 1, 600),
            text(a.body, 20000),
            q,
          );
        }
        return "Lektion gespeichert: " + a.title;
      }
      case "lesson.move": {
        const l = db.require("lessons", a.id);
        draft(db.require("courses", l.course_id));
        const direction = choice(a.direction, [-1, 1]),
          other = db.one(
            "SELECT * FROM lessons WHERE course_id=? AND position=?",
            l.course_id,
            l.position + direction,
          );
        if (!other) fail("Lektion kann nicht weiter verschoben werden.");
        db.run("UPDATE lessons SET position=0 WHERE id=?", l.id);
        db.run(
          "UPDATE lessons SET position=? WHERE id=?",
          l.position,
          other.id,
        );
        db.run(
          "UPDATE lessons SET position=? WHERE id=?",
          other.position,
          l.id,
        );
        return "Lektionsreihenfolge geändert";
      }
      case "enroll": {
        const c = db.require("courses", a.courseId),
          s = db.require("students", a.studentId);
        if (c.status !== "published")
          fail("Kurs nicht für neue Einschreibungen geöffnet.");
        if (
          db.one(
            "SELECT id FROM enrollments WHERE course_id=? AND student_id=?",
            c.id,
            s.id,
          )
        )
          fail("Lernprofil ist bereits eingeschrieben.");
        db.run(
          "INSERT INTO enrollments(course_id,student_id,due,created) VALUES(?,?,?,?)",
          c.id,
          s.id,
          day(a.due),
          new Date().toISOString(),
        );
        return s.name + " eingeschrieben: " + c.title;
      }
      case "enroll.group": {
        const c = db.require("courses", a.courseId),
          g = db.require("groups", a.groupId);
        if (c.status !== "published") fail("Kurs nicht geöffnet.");
        const due = day(a.due),
          students = db.all("SELECT * FROM students WHERE group_id=?", g.id);
        if (!students.length) fail("Die Gruppe enthält keine Lernprofile.");
        let count = 0;
        for (const s of students)
          if (
            !db.one(
              "SELECT id FROM enrollments WHERE course_id=? AND student_id=?",
              c.id,
              s.id,
            )
          ) {
            db.run(
              "INSERT INTO enrollments(course_id,student_id,due,created) VALUES(?,?,?,?)",
              c.id,
              s.id,
              due,
              new Date().toISOString(),
            );
            count++;
          }
        if (!count) fail("Alle Personen sind bereits eingeschrieben.");
        return count + " Einschreibungen: " + g.name;
      }
      case "enrollment.due": {
        db.require("enrollments", a.id);
        db.run("UPDATE enrollments SET due=? WHERE id=?", day(a.due), a.id);
        return "Lernzieltermin aktualisiert";
      }
      case "attempt.submit": {
        const en = db.require("enrollments", a.enrollmentId),
          l = db.require("lessons", a.lessonId),
          c = db.require("courses", en.course_id);
        available(en, l);
        const qs = JSON.parse(l.questions);
        if (!Array.isArray(a.answers) || a.answers.length !== qs.length)
          fail("Alle Fragen beantworten.");
        const answers = a.answers.map((v, i) =>
            int(v, 0, qs[i].options.length - 1),
          ),
          score = Math.round(
            (100 * answers.filter((v, i) => v === qs[i].correct).length) /
              qs.length,
          ),
          success = score >= c.pass_mark;
        db.run(
          "INSERT INTO attempts(enrollment_id,lesson_id,answers,score,passed,created) VALUES(?,?,?,?,?,?)",
          en.id,
          l.id,
          JSON.stringify(answers),
          score,
          Number(success),
          new Date().toISOString(),
        );
        if (success && courseLessons(c.id).every((x) => passed(en.id, x.id)))
          db.run(
            "INSERT OR IGNORE INTO certificates(id,enrollment_id,created) VALUES(?,?,?)",
            "CAMP-" + randomUUID().slice(0, 8).toUpperCase(),
            en.id,
            new Date().toISOString(),
          );
        return "Lerncheck: " + l.title + " · " + score + " %";
      }
      case "note.save": {
        const en = db.require("enrollments", a.enrollmentId),
          l = db.require("lessons", a.lessonId);
        available(en, l);
        db.run(
          "INSERT INTO notes(enrollment_id,lesson_id,body) VALUES(?,?,?) ON CONFLICT(enrollment_id,lesson_id) DO UPDATE SET body=excluded.body",
          en.id,
          l.id,
          optional(a.body, 6000),
        );
        return "Lernnotiz gespeichert";
      }
      default:
        fail("Unbekannte Aktion.");
    }
  });
  api.csv = () => {
    const s = api.snapshot();
    return csv([
      [
        "Person",
        "Gruppe",
        "Kurs",
        "Zieltermin",
        "Lektionen bestanden",
        "Lektionen gesamt",
        "Versuche",
        "Abschlusscode",
      ],
      ...s.enrollments.map((en) => {
        const student = s.students.find((p) => p.id === en.student_id),
          lessons = s.lessons.filter((l) => l.course_id === en.course_id),
          attempts = s.attempts.filter((a) => a.enrollment_id === en.id);
        return [
          student.name,
          s.groups.find((g) => g.id === student.group_id).name,
          s.courses.find((c) => c.id === en.course_id).title,
          en.due,
          lessons.filter((l) =>
            attempts.some((a) => a.lesson_id === l.id && a.passed),
          ).length,
          lessons.length,
          attempts.length,
          s.certificates.find((c) => c.enrollment_id === en.id)?.id ?? "",
        ];
      }),
    ]);
  };
  if (seed && !db.one("SELECT id FROM courses")) {
    const call = (a) => api.command(api.snapshot().revision, a),
      due = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    call({ type: "group.create", name: "Designteam" });
    call({ type: "group.create", name: "Neue Perspektiven" });
    for (const [name, address, groupId] of [
      ["Mara Winter", "mara@example.test", 1],
      ["Noah Keller", "noah@example.test", 1],
      ["Elena Roth", "elena@example.test", 2],
      ["Ben Sommer", "ben@example.test", 2],
    ])
      call({ type: "student.create", name, email: address, groupId });
    const courses = [
      [
        "Gute Fragen, bessere Gespräche",
        "Zusammenarbeit",
        "Lerne, Gespräche vorzubereiten, aufmerksam zuzuhören und Erkenntnisse festzuhalten.",
        "Lea Wagner",
        [
          [
            "Mit einer offenen Frage beginnen",
            "Offene Fragen laden zum Erzählen ein. Sie beginnen häufig mit „Wie“, „Was“ oder „Welche“.\n\nStatt „Gefällt dir der Entwurf?“ kannst du fragen: „Was fällt dir an diesem Entwurf zuerst auf?“ Lass nach der Frage Zeit zum Nachdenken.",
            "Welche Frage lädt am ehesten zum Erzählen ein?",
            ["Ist das gut?", "Was fällt dir daran auf?", "Ja oder nein?"],
            1,
            "„Was fällt dir daran auf?“ lässt Raum für eine eigene Perspektive.",
          ],
          [
            "Zuhören ohne vorwegzunehmen",
            "Höre erst zu, bevor du eine Lösung anbietest. Fasse in eigenen Worten zusammen, was du verstanden hast, und lass die andere Person korrigieren.\n\nNotiere Beobachtungen getrennt von Interpretationen. Ein direktes Zitat ist eine Beobachtung; eine vermutete Absicht ist eine Interpretation.",
            "Was hilft beim Überprüfen des eigenen Verständnisses?",
            [
              "Sofort einen Rat geben",
              "Das Thema wechseln",
              "Gehörtes zusammenfassen und nachfragen",
            ],
            2,
            "Eine Zusammenfassung macht Missverständnisse sichtbar.",
          ],
          [
            "Erkenntnisse in nächste Schritte übersetzen",
            "Ein gutes Gespräch endet mit Klarheit: Was ist offen, was wurde entschieden, und wer übernimmt welchen nächsten Schritt?\n\nFormuliere konkrete Aufgaben mit einer zuständigen Person und einem Zeitpunkt. Prüfe später gemeinsam, was sich dadurch verändert hat.",
            "Welcher nächste Schritt ist konkret?",
            [
              "Wir kümmern uns bald.",
              "Mara erstellt bis Freitag eine erste Skizze.",
              "Es sollte besser werden.",
            ],
            1,
            "Person, Tätigkeit und Zeitpunkt machen den Schritt nachvollziehbar.",
          ],
        ],
      ],
      [
        "Klar schreiben im Alltag",
        "Kommunikation",
        "Kurze Texte, klare Struktur und verständliche Aussagen. Ein kompakter Lernpfad für den Arbeitsalltag.",
        "Jonas Berg",
        [
          [
            "Die wichtigste Aussage zuerst",
            "Beginne mit der Information, die deine Leser brauchen. Danach folgen Begründungen, Details und gegebenenfalls eine konkrete Bitte.\n\nEine aussagekräftige Betreffzeile beschreibt Thema und Anlass. Absätze enthalten jeweils einen Gedanken.",
            "Was gehört an den Anfang?",
            [
              "Die wichtigste Information",
              "Alle Hintergrunddetails",
              "Eine lange Einleitung",
            ],
            0,
            "Die Kernaussage zuerst erleichtert die Orientierung.",
          ],
          [
            "Verben machen Texte lebendig",
            "Aktive Verben zeigen, wer etwas tut. „Wir prüfen den Entwurf“ ist direkter als „Die Durchführung der Prüfung des Entwurfs erfolgt“.\n\nLies einen Text vor dem Senden laut. Lange Sätze lassen sich oft in zwei klare Aussagen teilen.",
            "Welche Formulierung ist direkter?",
            ["Eine Prüfung erfolgt.", "Wir prüfen den Entwurf."],
            1,
            "Ein handelndes Subjekt und ein konkretes Verb machen den Satz verständlich.",
          ],
        ],
      ],
      [
        "Ein guter Start ins Team",
        "Onboarding",
        "Ein eigener Kursentwurf, den du mit deinen Inhalten weiterentwickeln kannst.",
        "Team Campus",
        [
          [
            "Ankommen und orientieren",
            "Sammle wichtige Ansprechpersonen, Routinen und Arbeitsmittel. Besprich offene Fragen frühzeitig im Team.",
            "Was erleichtert die Orientierung?",
            ["Fragen sammeln und besprechen", "Offene Fragen verbergen"],
            0,
            "Frühe Rückfragen schaffen Klarheit.",
          ],
        ],
      ],
    ];
    for (const [
      index,
      [title, category, description, teacher, lessons],
    ] of courses.entries()) {
      call({
        type: "course.create",
        title,
        category,
        description,
        teacher,
        passMark: 80,
      });
      for (const [
        title,
        body,
        prompt,
        options,
        correct,
        explanation,
      ] of lessons)
        call({
          type: "lesson.create",
          courseId: index + 1,
          title,
          body,
          minutes: 8,
          questions: [{ prompt, options, correct, explanation }],
        });
      if (index < 2) call({ type: "course.publish", id: index + 1 });
    }
    call({ type: "enroll.group", courseId: 1, groupId: 1, due });
    call({ type: "enroll.group", courseId: 2, groupId: 2, due });
    call({
      type: "attempt.submit",
      enrollmentId: 1,
      lessonId: 1,
      answers: [1],
    });
    call({
      type: "attempt.submit",
      enrollmentId: 3,
      lessonId: 4,
      answers: [0],
    });
    call({
      type: "attempt.submit",
      enrollmentId: 3,
      lessonId: 5,
      answers: [1],
    });
  }
  return api;
}
