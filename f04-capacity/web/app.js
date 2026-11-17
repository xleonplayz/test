import {
  $,
  el,
  button,
  badge,
  date,
  value,
  number,
  panel,
  grid,
  split,
  line,
  metric,
  table,
  actions,
  field,
  progress,
  modal,
  confirm,
  page,
  searchBar,
  navigation,
  application,
  reportError,
  auditPanel,
} from "./ui.js";
let view = "overview",
  studentId = 1,
  courseId = null,
  enrollmentId = null,
  lessonId = null,
  certificateId = null,
  query = "",
  groupFilter = "";
const nav = [
  ["overview", "◉", "Überblick"],
  ["library", "▦", "Kursbibliothek"],
  ["learning", "◷", "Mein Lernpfad"],
  ["people", "♙", "Lernprofile & Gruppen"],
  ["author", "✎", "Kurse gestalten"],
  ["reports", "▤", "Fortschritt"],
  ["audit", "≡", "Verlauf"],
];
const statusNames = {
  draft: "Entwurf",
  published: "Veröffentlicht",
  archived: "Archiviert",
};
const app = application(draw),
  s = () => app.state,
  course = (id) => s().courses.find((c) => c.id === id),
  student = (id) => s().students.find((p) => p.id === id),
  lessons = (id) =>
    s()
      .lessons.filter((l) => l.course_id === id)
      .sort((a, b) => a.position - b.position),
  attempts = (id) => s().attempts.filter((a) => a.enrollment_id === id),
  completed = (en, l) =>
    attempts(en).some((a) => a.lesson_id === l && a.passed),
  certificate = (id) => s().certificates.find((c) => c.enrollment_id === id);
const done = (en) =>
    lessons(en.course_id).filter((l) => completed(en.id, l.id)).length,
  available = (en, l) =>
    lessons(en.course_id)
      .filter((p) => p.position < l.position)
      .every((p) => completed(en.id, p.id));
function go(next) {
  view = next;
  query = "";
  draw();
}
function learn(en, l = null) {
  enrollmentId = en.id;
  lessonId =
    l?.id ??
    lessons(en.course_id).find((l) => !completed(en.id, l.id))?.id ??
    lessons(en.course_id)[0].id;
  view = "lesson";
  draw();
  window.scrollTo(0, 0);
}
function author(c) {
  courseId = c.id;
  view = "course";
  draw();
  window.scrollTo(0, 0);
}
function showCertificate(c) {
  certificateId = c.id;
  view = "certificate";
  draw();
  window.scrollTo(0, 0);
}
function profilePicker() {
  const bar = el("div", null, "toolbar");
  const profile = field(bar, "Lernprofil", {
    type: "select",
    value: studentId,
    options: s().students.map((p) => [
      p.id,
      p.name + " · " + s().groups.find((g) => g.id === p.group_id).name,
    ]),
  });
  profile.onchange = () => {
    studentId = number(profile);
    draw();
  };
  bar.append(
    el("p", "Ansicht wechseln im gemeinsamen lokalen Arbeitsbereich.", "muted"),
  );
  return bar;
}
function courseCard(c) {
  const card = el("article", null, "course-card"),
    cover = el("div", null, "course-cover cover-" + (c.id % 3));
  cover.append(
    el("span", c.category),
    el(
      "strong",
      c.id % 3 === 1 ? "Aa" : c.id % 3 === 2 ? "↗" : "◎",
      "cover-symbol",
    ),
    el(
      "small",
      lessons(c.id).length +
        " Lektionen · " +
        lessons(c.id).reduce((n, l) => n + l.minutes, 0) +
        " Minuten",
    ),
  );
  const body = el("div", null, "course-body");
  body.append(
    el("h2", c.title),
    el("p", c.description),
    el("small", "Mit " + c.teacher),
  );
  const en = s().enrollments.find(
    (e) => e.course_id === c.id && e.student_id === studentId,
  );
  if (en) {
    body.append(
      progress(done(en), lessons(c.id).length, "Lernfortschritt"),
      line(
        done(en) + " / " + lessons(c.id).length + " Lektionen",
        certificate(en.id)
          ? badge("Abgeschlossen", "good")
          : badge("In deinem Lernpfad"),
      ),
      button("Weiterlernen ↗", () => learn(en), "primary"),
    );
  } else
    body.append(
      line(c.pass_mark + " % zum Bestehen", badge(c.category)),
      button("Einschreiben", () => enroll(c), "primary"),
    );
  card.append(cover, body);
  return card;
}
function enrollmentCard(en) {
  const c = course(en.course_id),
    p = panel(c.title);
  p.append(
    el("p", c.description, "muted"),
    progress(done(en), lessons(c.id).length, "Lernfortschritt"),
    line(
      done(en) + " von " + lessons(c.id).length + " Lektionen bestanden",
      "Ziel: " + date(en.due),
    ),
    actions(
      button("Lernpfad öffnen", () => learn(en), "primary"),
      ...(certificate(en.id)
        ? [
            button("Abschlussnachweis", () =>
              showCertificate(certificate(en.id)),
            ),
          ]
        : []),
    ),
  );
  return p;
}
function draw() {
  if (!s()) return;
  if (!student(studentId)) studentId = s().students[0]?.id;
  navigation(
    nav,
    ["lesson", "certificate"].includes(view)
      ? "learning"
      : view === "course"
        ? "author"
        : view,
    go,
  );
  $("breadcrumb").textContent =
    nav.find((n) => n[0] === view)?.[2] ??
    (view === "course"
      ? "Kurs gestalten"
      : view === "certificate"
        ? "Abschlussnachweis"
        : "Lektion");
  let content;
  if (view === "overview") {
    content = page(
      "Heute ein Stück weiter.",
      "Entdecke Wissen, entwickle Fähigkeiten und behalte deinen Fortschritt im Blick.",
      [button("Kurse entdecken ↗", () => go("library"), "primary")],
    );
    const mine = s().enrollments.filter((e) => e.student_id === studentId),
      passed = s().certificates.length;
    content.append(
      metric([
        [
          "Veröffentlichte Kurse",
          s().courses.filter((c) => c.status === "published").length,
          "Bereit für neue Perspektiven",
        ],
        [
          "Aktive Lernpfade",
          s().enrollments.length - passed,
          "Schritt für Schritt weiterkommen",
        ],
        [
          "Lernprofile",
          s().students.length,
          "In " + s().groups.length + " Gruppen",
        ],
        ["Abschlüsse", passed, "Mit lokalem Nachweis"],
      ]),
      profilePicker(),
    );
    const next = mine.find((en) => !certificate(en.id));
    if (next) {
      const c = course(next.course_id),
        p = el("section", null, "learning-hero");
      p.append(
        el("p", "DEIN NÄCHSTER SCHRITT", "eyebrow"),
        el("h2", c.title),
        el(
          "p",
          lessons(c.id).find((l) => !completed(next.id, l.id))?.title ??
            "Alle Lektionen bestanden",
        ),
        button("Weiterlernen ↗", () => learn(next), "primary"),
      );
      const aside = panel("Kleine Schritte. Bleibendes Wissen.");
      aside.append(
        el("div", done(next) + " / " + lessons(c.id).length, "hero-number"),
        el("p", "Lektionen in diesem Lernpfad bestanden.", "muted"),
        progress(done(next), lessons(c.id).length, "Dein Fortschritt"),
        line("Dein Lernziel", date(next.due)),
      );
      content.append(split(p, aside));
    }
    const heading = el("div", null, "section-head");
    heading.append(
      el("h2", "Ein guter Anfang"),
      button("Zur Bibliothek", () => go("library"), "text-button"),
    );
    content.append(
      heading,
      grid(
        ...s()
          .courses.filter((c) => c.status === "published")
          .map(courseCard),
      ),
    );
  } else if (view === "library") {
    content = page(
      "Raum für neue Perspektiven.",
      "Kurse mit klaren Lernschritten, kurzen Checks und persönlichem Fortschritt.",
    );
    content.append(profilePicker());
    const cards = el("div", null, "grid"),
      render = () =>
        cards.replaceChildren(
          ...s()
            .courses.filter(
              (c) =>
                c.status === "published" &&
                [c.title, c.category, c.teacher]
                  .join(" ")
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
            .map(courseCard),
        );
    content.append(
      searchBar(
        "Kurse suchen",
        (q) => {
          query = q;
          render();
        },
        query,
      ),
      cards,
    );
    render();
  } else if (view === "learning") {
    content = page(
      "Dein Wissen nimmt Form an.",
      "Jede bestandene Lektion öffnet den nächsten Schritt.",
    );
    content.append(profilePicker());
    const mine = s().enrollments.filter((e) => e.student_id === studentId);
    content.append(grid(...mine.map(enrollmentCard)));
    if (!mine.length)
      content.append(
        el(
          "p",
          "Noch kein Lernpfad. Schreibe dich in der Kursbibliothek ein.",
          "empty",
        ),
      );
  } else if (view === "people") {
    content = page(
      "Gemeinsam weiterlernen.",
      "Lernprofile verwalten und Gruppen für gemeinsame Einschreibungen nutzen.",
      [
        button("＋ Gruppe", newGroup),
        button("＋ Lernprofil", newStudent, "primary"),
      ],
    );
    for (const g of s().groups) {
      const p = panel(g.name, [
        button("Gruppe einschreiben", () => enrollGroup(g)),
      ]);
      p.append(
        table(
          ["Person", "Kontakt", "Lernpfade", "Abschlüsse", "Aktion"],
          s()
            .students.filter((st) => st.group_id === g.id)
            .map((st) => {
              const ens = s().enrollments.filter((e) => e.student_id === st.id);
              return [
                st.name,
                st.email,
                ens.length,
                ens.filter((e) => certificate(e.id)).length,
                button("Gruppe ändern", () => moveStudent(st)),
              ];
            }),
        ),
      );
      content.append(p);
    }
  } else if (view === "author") {
    content = page(
      "Aus Erfahrung wird ein Lernpfad.",
      "Inhalte, Fragen und Reihenfolge gestalten. Veröffentlichte Fassungen bleiben stabil.",
      [button("＋ Kursentwurf", () => editCourse(), "primary")],
    );
    content.append(
      grid(
        ...s().courses.map((c) => {
          const p = panel(c.title);
          p.append(
            badge(
              statusNames[c.status],
              c.status === "published" ? "good" : "neutral",
            ),
            el("p", c.description, "muted"),
            line("Inhalt", lessons(c.id).length + " Lektionen"),
            line("Bestehensgrenze", c.pass_mark + " %"),
            button("Kurs öffnen ↗", () => author(c), "primary"),
          );
          return p;
        }),
      ),
    );
  } else if (view === "reports") {
    content = page(
      "Fortschritt wird sichtbar.",
      "Lernziele, Versuche und Abschlüsse je Person und Gruppe.",
      [
        Object.assign(el("a", "Fortschritt als CSV ↗", "button-link"), {
          href: "/api/report.csv",
        }),
      ],
    );
    const bar = el("div", null, "toolbar"),
      group = field(bar, "Gruppe filtern", {
        type: "select",
        value: groupFilter,
        options: [
          ["", "Alle Gruppen"],
          ...s().groups.map((g) => [g.id, g.name]),
        ],
      }),
      results = panel();
    const render = () =>
      results.replaceChildren(
        table(
          ["Person", "Kurs", "Fortschritt", "Zieltermin", "Versuche", "Aktion"],
          s()
            .enrollments.filter(
              (en) =>
                !groupFilter ||
                student(en.student_id).group_id === Number(groupFilter),
            )
            .map((en) => {
              const c = course(en.course_id),
                cert = certificate(en.id);
              return [
                student(en.student_id).name,
                c.title,
                done(en) + " / " + lessons(c.id).length,
                actions(
                  el("span", date(en.due)),
                  ...(!cert && en.due < s().now.slice(0, 10)
                    ? [badge("Ziel überschritten", "warn")]
                    : []),
                ),
                attempts(en.id).length,
                actions(
                  button("Ziel ändern", () => changeDue(en)),
                  ...(cert
                    ? [button("Nachweis", () => showCertificate(cert))]
                    : []),
                ),
              ];
            }),
        ),
      );
    group.onchange = () => {
      groupFilter = group.value;
      render();
    };
    content.append(bar, results);
    render();
  } else if (view === "audit") {
    content = page(
      "Lernen mit Verlauf.",
      "Die letzten 200 Aktionen. Der vollständige Verlauf liegt im Datenexport.",
    );
    content.append(auditPanel(s().audit));
  } else if (view === "course") courseEditor();
  else if (view === "lesson") reader();
  else certificateView();
}
function reader() {
  const en = s().enrollments.find((e) => e.id === enrollmentId),
    c = course(en.course_id),
    l = s().lessons.find((l) => l.id === lessonId),
    all = lessons(c.id),
    latest = attempts(en.id).find((a) => a.lesson_id === l.id);
  const content = page(
    l.title,
    c.title +
      " · " +
      student(en.student_id).name +
      " · Lektion " +
      l.position +
      " von " +
      all.length,
    [button("← Mein Lernpfad", () => go("learning"))],
  );
  const article = panel();
  article.classList.add("lesson-article");
  article.append(
    actions(badge(l.minutes + " Minuten"), badge(c.category)),
    el("div", l.body, "long-text lesson-copy"),
  );
  article.append(
    actions(
      button("Lerncheck starten", () => quiz(en, l), "primary"),
      button("Lernnotiz", () => note(en, l)),
    ),
  );
  if (latest) {
    const feedback = el(
      "div",
      null,
      "feedback " + (latest.passed ? "passed" : "failed"),
    );
    feedback.append(
      el(
        "h3",
        latest.passed
          ? "Gut gemacht. Schritt bestanden."
          : "Ein guter Versuch. Schau noch einmal hin.",
      ),
      el("p", latest.score + " % · Ziel: " + c.pass_mark + " %"),
    );
    l.questions.forEach((q, i) => {
      const row = el("div", null, "answer-feedback");
      row.append(
        el("strong", q.prompt),
        el("p", "Deine Antwort: " + q.options[latest.answers[i]]),
        el("p", "Passende Antwort: " + q.options[q.correct]),
        el("small", q.explanation),
      );
      feedback.append(row);
    });
    article.append(feedback);
  }
  const saved = s().notes.find(
    (n) => n.enrollment_id === en.id && n.lesson_id === l.id,
  );
  if (saved?.body) {
    const n = el("div", null, "learning-note");
    n.append(el("h3", "Deine Lernnotiz"), el("p", saved.body, "long-text"));
    article.append(n);
  }
  if (completed(en.id, l.id)) {
    const next = all.find((p) => p.position === l.position + 1);
    article.append(
      next
        ? button("Nächste Lektion ↗", () => learn(en, next), "primary")
        : button(
            "Abschlussnachweis öffnen ↗",
            () => showCertificate(certificate(en.id)),
            "primary",
          ),
    );
  }
  const outline = panel("Dein Lernpfad");
  outline.append(progress(done(en), all.length, "Kursfortschritt"));
  for (const item of all) {
    const b = button("", () => learn(en, item), "outline-item");
    b.disabled = !available(en, item);
    b.append(
      el(
        "span",
        completed(en.id, item.id)
          ? "✓"
          : available(en, item)
            ? String(item.position).padStart(2, "0")
            : "○",
      ),
      el("span", item.title),
    );
    b.setAttribute("aria-current", l.id === item.id ? "step" : "false");
    outline.append(b);
  }
  outline.append(
    el(
      "p",
      "Die nächste Lektion wird nach bestandenem Lerncheck freigeschaltet. Wiederholungen sind jederzeit möglich.",
      "muted",
    ),
  );
  const layout = split(article, outline);
  layout.classList.add("reader-layout");
  content.append(layout);
}
function courseEditor() {
  const c = course(courseId),
    draft = c.status === "draft",
    controls = [
      button("← Alle Kurse", () => go("author")),
      button("Neue Version kopieren", () => clone(c)),
    ];
  if (draft)
    controls.push(
      button("Kursdaten bearbeiten", () => editCourse(c)),
      button(
        "Veröffentlichen",
        () =>
          confirm(
            "Kurs veröffentlichen?",
            "Diese Fassung wird unveränderlich. Für spätere Änderungen eine neue Version erstellen.",
            () => app.command({ type: "course.publish", id: c.id }),
          ),
        "primary",
      ),
    );
  else if (c.status === "published")
    controls.push(
      button("Archivieren", () =>
        confirm(
          "Kurs archivieren?",
          "Neue Einschreibungen schließen. Bestehende Lernpfade bleiben verfügbar.",
          () => app.command({ type: "course.archive", id: c.id }),
        ),
      ),
    );
  const content = page(
    c.title,
    "Kursgestaltung · " + c.teacher + " · " + c.pass_mark + " % zum Bestehen",
    controls,
  );
  content.append(
    actions(badge(statusNames[c.status]), badge(c.category)),
    el("p", c.description, "notice"),
  );
  const p = panel(
    "Inhalte in der richtigen Reihenfolge",
    draft ? [button("＋ Lektion", () => editLesson(c), "primary")] : [],
  );
  for (const l of lessons(c.id)) {
    const row = el("div", null, "lesson-row"),
      copy = el("div");
    copy.append(
      el("small", "LEKTION " + l.position + " · " + l.minutes + " MINUTEN"),
      el("h3", l.title),
      el("small", l.questions.length + " Prüfungsfrage(n)"),
    );
    row.append(copy);
    if (draft)
      row.append(
        actions(
          button("Nach oben", () =>
            app.command({ type: "lesson.move", id: l.id, direction: -1 }),
          ),
          button("Nach unten", () =>
            app.command({ type: "lesson.move", id: l.id, direction: 1 }),
          ),
          button("Bearbeiten", () => editLesson(c, l)),
        ),
      );
    else
      row.append(
        button("Inhalt ansehen", () =>
          modal(
            l.title,
            "Veröffentlichte Kursfassung.",
            (form) => {
              form.append(el("p", l.body, "long-text wide"));
              return async () => true;
            },
            "Schließen",
          ),
        ),
      );
    p.append(row);
  }
  if (!lessons(c.id).length)
    p.append(el("p", "Die erste Lektion wartet auf deine Inhalte.", "empty"));
  content.append(p);
}
function certificateView() {
  const cert = s().certificates.find((c) => c.id === certificateId),
    en = s().enrollments.find((e) => e.id === cert.enrollment_id),
    c = course(en.course_id);
  const content = page(
    "Ein Schritt, auf den du bauen kannst.",
    "Dein persönlicher Abschlussnachweis.",
    [
      button("← Lernpfade", () => go("learning")),
      button("Drucken", () => window.print(), "primary"),
    ],
  );
  const card = el("section", null, "certificate");
  card.append(
    el("div", "◎", "certificate-mark"),
    el("p", "CAMPUS · ABSCHLUSSNACHWEIS", "eyebrow"),
    el("h2", student(en.student_id).name),
    el("p", "hat alle Lektionen des folgenden Lernpfads bestanden:"),
    el("h3", c.title),
    line("Umfang", lessons(c.id).length + " Lektionen"),
    line("Abgeschlossen", date(cert.created)),
    line("Nachweiscode", cert.id),
    el(
      "p",
      "Lokal erzeugter Lernnachweis. Keine externe Zertifizierung.",
      "muted",
    ),
  );
  content.append(card);
}

function newGroup() {
  modal(
    "Lerngruppe anlegen",
    "Gruppen ermöglichen gemeinsame Einschreibungen und Auswertungen.",
    (form) => {
      const name = field(form, "Gruppenname");
      return () => app.command({ type: "group.create", name: value(name) });
    },
  );
}
function newStudent() {
  if (!s().groups.length) {
    newGroup();
    return;
  }
  modal(
    "Lernprofil anlegen",
    "Ein Profil im gemeinsamen lokalen Arbeitsbereich, ohne eigenes Benutzerkonto.",
    (form) => {
      const name = field(form, "Name"),
        email = field(form, "E-Mail", { type: "email" }),
        group = field(form, "Gruppe", {
          type: "select",
          options: s().groups.map((g) => [g.id, g.name]),
        });
      return () =>
        app.command({
          type: "student.create",
          name: value(name),
          email: value(email),
          groupId: number(group),
        });
    },
  );
}
function moveStudent(st) {
  modal("Gruppe wechseln", st.name, (form) => {
    const group = field(form, "Gruppe", {
      type: "select",
      value: st.group_id,
      options: s().groups.map((g) => [g.id, g.name]),
    });
    return () =>
      app.command({ type: "student.group", id: st.id, groupId: number(group) });
  });
}
const defaultDue = () =>
  new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
function enroll(c) {
  if (!s().students.length) {
    newStudent();
    return;
  }
  modal(
    "In einen Lernpfad einschreiben",
    c.title,
    (form) => {
      const person = field(form, "Lernprofil", {
          type: "select",
          value: studentId,
          options: s().students.map((p) => [p.id, p.name]),
        }),
        due = field(form, "Lernzieltermin", {
          type: "date",
          value: defaultDue(),
        });
      return () =>
        app.command({
          type: "enroll",
          courseId: c.id,
          studentId: number(person),
          due: value(due),
        });
    },
    "Einschreiben",
  );
}
function enrollGroup(g) {
  const published = s().courses.filter((c) => c.status === "published");
  if (!published.length) {
    editCourse();
    return;
  }
  modal(
    "Gruppe einschreiben",
    g.name + " · Bereits eingeschriebene Personen werden übersprungen.",
    (form) => {
      const c = field(form, "Kurs", {
          type: "select",
          options: published.map((c) => [c.id, c.title]),
        }),
        due = field(form, "Lernzieltermin", {
          type: "date",
          value: defaultDue(),
        });
      return () =>
        app.command({
          type: "enroll.group",
          groupId: g.id,
          courseId: number(c),
          due: value(due),
        });
    },
    "Gruppe einschreiben",
  );
}
function changeDue(en) {
  modal(
    "Lernzieltermin ändern",
    student(en.student_id).name + " · " + course(en.course_id).title,
    (form) => {
      const due = field(form, "Lernzieltermin", {
        type: "date",
        value: en.due,
      });
      return () =>
        app.command({ type: "enrollment.due", id: en.id, due: value(due) });
    },
  );
}
function editCourse(c) {
  modal(
    c ? "Kursdaten bearbeiten" : "Kursentwurf anlegen",
    "Erst nach Veröffentlichung können Lernprofile eingeschrieben werden.",
    (form) => {
      const title = field(form, "Kurstitel", { value: c?.title }),
        category = field(form, "Thema", { value: c?.category }),
        teacher = field(form, "Autor oder Autorin", { value: c?.teacher }),
        pass = field(form, "Bestehensgrenze in Prozent", {
          type: "number",
          min: 50,
          max: 100,
          value: c?.pass_mark ?? 80,
        }),
        description = field(form, "Kurzbeschreibung", {
          type: "textarea",
          wide: true,
          value: c?.description,
        });
      return () =>
        app.command({
          type: c ? "course.update" : "course.create",
          ...(c ? { id: c.id } : {}),
          title: value(title),
          category: value(category),
          teacher: value(teacher),
          passMark: number(pass),
          description: value(description),
        });
    },
  );
}
function clone(c) {
  modal(
    "Neue Kursversion",
    "Inhalte und Fragen werden kopiert. Einschreibungen und Lernfortschritt bleiben bei der bisherigen Fassung.",
    (form) => {
      const title = field(form, "Titel der neuen Version", {
        value: c.title + " · Neue Fassung",
        wide: true,
      });
      return () =>
        app.command({ type: "course.clone", id: c.id, title: value(title) });
    },
    "Kopie anlegen",
  );
}
function editLesson(c, l) {
  modal(
    l ? "Lektion bearbeiten" : "Lektion anlegen",
    "1–10 Fragen mit je 2–5 Antwortmöglichkeiten. Genau eine Antwort pro Frage ist richtig.",
    (form) => {
      const title = field(form, "Lektionstitel", { value: l?.title }),
        minutes = field(form, "Lernzeit in Minuten", {
          type: "number",
          min: 1,
          max: 600,
          value: l?.minutes ?? 10,
        }),
        body = field(form, "Lerninhalt", {
          type: "textarea",
          value: l?.body,
          wide: true,
        });
      body.rows = 9;
      const block = el("div", null, "wide"),
        questions = [];
      const add = (q) => {
        const row = el("div", null, "question-editor");
        row.append(el("h3", "Prüfungsfrage"));
        const prompt = field(row, "Fragetext", { value: q?.prompt }),
          options = field(row, "Antworten (eine pro Zeile)", {
            type: "textarea",
            value: q?.options.join("\n") ?? "Erste Antwort\nZweite Antwort",
          }),
          correct = field(row, "Richtige Antwort", { type: "select" }),
          explanation = field(row, "Erklärung", {
            type: "textarea",
            value: q?.explanation,
          });
        const update = () => {
          const previous = correct.value;
          correct.replaceChildren();
          value(options)
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean)
            .forEach((v, i) => {
              const o = el("option", String(i + 1) + ". " + v);
              o.value = i;
              correct.append(o);
            });
          if ([...correct.options].some((o) => o.value === previous))
            correct.value = previous;
        };
        update();
        correct.value = q?.correct ?? 0;
        options.oninput = update;
        row.append(button("Frage entfernen", () => row.remove(), "danger"));
        questions.push({ row, prompt, options, correct, explanation });
        block.append(row);
      };
      for (const q of l?.questions ?? [null]) add(q);
      form.append(block);
      const addButton = button("＋ Frage hinzufügen", () => add(null));
      addButton.classList.add("wide");
      form.append(addButton);
      return () =>
        app.command({
          type: l ? "lesson.update" : "lesson.create",
          ...(l ? { id: l.id } : { courseId: c.id }),
          title: value(title),
          minutes: number(minutes),
          body: value(body),
          questions: questions
            .filter((q) => q.row.parentNode === block)
            .map((q) => ({
              prompt: value(q.prompt),
              options: value(q.options)
                .split("\n")
                .map((v) => v.trim())
                .filter(Boolean),
              correct: number(q.correct),
              explanation: value(q.explanation),
            })),
        });
    },
  );
}
function quiz(en, l) {
  modal(
    "Lerncheck: " + l.title,
    "Eine Antwort pro Frage auswählen. Du kannst den Lerncheck wiederholen.",
    (form) => {
      const answers = l.questions.map((q, i) => {
        const set = el("fieldset", null, "wide");
        set.append(el("legend", i + 1 + ". " + q.prompt));
        q.options.forEach((option, index) => {
          const label = el("label", null, "choice"),
            input = el("input");
          input.type = "radio";
          input.name = "question-" + i;
          input.value = index;
          input.required = true;
          label.append(input, el("span", option));
          set.append(label);
        });
        form.append(set);
        return set;
      });
      return () =>
        app.command({
          type: "attempt.submit",
          enrollmentId: en.id,
          lessonId: l.id,
          answers: answers.map((set) =>
            Number(set.querySelector("input:checked")?.value),
          ),
        });
    },
    "Antworten prüfen",
  );
}
function note(en, l) {
  modal("Deine Lernnotiz", l.title, (form) => {
    const body = field(form, "Notiz", {
      type: "textarea",
      wide: true,
      required: false,
      value:
        s().notes.find((n) => n.enrollment_id === en.id && n.lesson_id === l.id)
          ?.body ?? "",
    });
    return () =>
      app.command({
        type: "note.save",
        enrollmentId: en.id,
        lessonId: l.id,
        body: value(body),
      });
  });
}
app.load().catch(reportError);
