import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../store.mjs";
const stable = (s) => {
  const copy = structuredClone(s);
  delete copy.now;
  return copy;
};
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "sample-domain-"));
  const store = openStore(dir);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    store,
    call: (a) => store.command(store.snapshot().revision, a),
    state: () => store.snapshot(),
  };
}

test("later lessons reject attempts and notes until prerequisites pass", (t) => {
  const { call, state } = fixture(t),
    before = stable(state());
  assert.throws(
    () =>
      call({
        type: "attempt.submit",
        enrollmentId: 2,
        lessonId: 2,
        answers: [2],
      }),
    /vorherigen/,
  );
  assert.throws(
    () =>
      call({
        type: "note.save",
        enrollmentId: 2,
        lessonId: 2,
        body: "Skipped",
      }),
    /vorherigen/,
  );
  assert.deepEqual(stable(state()), before);
});
test("failed answers do not unlock lessons and server grading rejects malformed answers", (t) => {
  const { call, state } = fixture(t);
  call({ type: "attempt.submit", enrollmentId: 2, lessonId: 1, answers: [0] });
  assert.equal(state().attempts[0].score, 0);
  assert.equal(state().attempts[0].passed, 0);
  assert.throws(
    () =>
      call({
        type: "attempt.submit",
        enrollmentId: 2,
        lessonId: 2,
        answers: [2],
      }),
    /vorherigen/,
  );
  assert.throws(
    () =>
      call({
        type: "attempt.submit",
        enrollmentId: 2,
        lessonId: 1,
        answers: [],
      }),
    /Alle Fragen/,
  );
  assert.throws(
    () =>
      call({
        type: "attempt.submit",
        enrollmentId: 2,
        lessonId: 1,
        answers: [99],
      }),
    /Zahl/,
  );
});
test("passing all lessons creates one stable certificate even after retries", (t) => {
  const { call, state } = fixture(t);
  for (const [lessonId, answer] of [
    [1, 1],
    [2, 2],
    [3, 1],
  ])
    call({
      type: "attempt.submit",
      enrollmentId: 2,
      lessonId,
      answers: [answer],
    });
  const cert = state().certificates.find((c) => c.enrollment_id === 2);
  assert.ok(cert);
  call({ type: "attempt.submit", enrollmentId: 2, lessonId: 3, answers: [0] });
  assert.equal(
    state().certificates.filter((c) => c.enrollment_id === 2).length,
    1,
  );
  assert.equal(
    state().certificates.find((c) => c.enrollment_id === 2).id,
    cert.id,
  );
});
test("published courses reject editing and cloned versions do not inherit enrollments", (t) => {
  const { call, state } = fixture(t),
    c = state().courses.find((c) => c.id === 1),
    before = stable(state());
  assert.throws(
    () =>
      call({
        type: "course.update",
        id: c.id,
        title: "Changed",
        category: c.category,
        description: c.description,
        teacher: c.teacher,
        passMark: 50,
      }),
    /unveränderlich/,
  );
  assert.deepEqual(stable(state()), before);
  call({ type: "course.clone", id: 1, title: "New version" });
  const copy = state().courses.find((c) => c.title === "New version");
  assert.equal(copy.status, "draft");
  assert.equal(
    state().lessons.filter((l) => l.course_id === copy.id).length,
    3,
  );
  assert.equal(
    state().enrollments.filter((e) => e.course_id === copy.id).length,
    0,
  );
});
test("archive closes new enrollment but keeps existing learning usable", (t) => {
  const { call, state } = fixture(t);
  call({ type: "course.archive", id: 1 });
  assert.throws(
    () =>
      call({ type: "enroll", courseId: 1, studentId: 4, due: "2027-01-01" }),
    /nicht für neue/,
  );
  call({ type: "attempt.submit", enrollmentId: 2, lessonId: 1, answers: [1] });
  assert.equal(state().attempts[0].passed, 1);
});
test("group enrollment skips existing profiles and is duplicate-safe", (t) => {
  const { call, state } = fixture(t);
  call({ type: "enroll.group", courseId: 1, groupId: 2, due: "2027-01-01" });
  assert.equal(state().enrollments.filter((e) => e.course_id === 1).length, 4);
  const before = stable(state());
  assert.throws(
    () =>
      call({
        type: "enroll.group",
        courseId: 1,
        groupId: 2,
        due: "2027-01-01",
      }),
    /bereits/,
  );
  assert.deepEqual(stable(state()), before);
});
test("lesson reordering preserves unique positions in drafts", (t) => {
  const { call, state } = fixture(t);
  call({ type: "course.clone", id: 1, title: "Reordered" });
  const c = state().courses[0],
    before = state().lessons.filter((l) => l.course_id === c.id);
  call({ type: "lesson.move", id: before[1].id, direction: -1 });
  const after = state().lessons.filter((l) => l.course_id === c.id);
  assert.equal(after[0].id, before[1].id);
  assert.deepEqual(
    after.map((l) => l.position),
    [1, 2, 3],
  );
});
test("quiz validation and cross-course attempts cannot corrupt progress", (t) => {
  const { call, state } = fixture(t),
    before = stable(state());
  assert.throws(
    () =>
      call({
        type: "lesson.create",
        courseId: 3,
        title: "Bad question",
        minutes: 5,
        body: "Text",
        questions: [
          {
            prompt: "Question",
            options: ["Same", "Same"],
            correct: 0,
            explanation: "Why",
          },
        ],
      }),
    /unterscheiden/,
  );
  assert.throws(
    () =>
      call({
        type: "attempt.submit",
        enrollmentId: 1,
        lessonId: 4,
        answers: [0],
      }),
    /gehört nicht/,
  );
  assert.deepEqual(stable(state()), before);
});
test("learning notes replace one record and keep content after failed attempt", (t) => {
  const { call, state } = fixture(t);
  call({ type: "note.save", enrollmentId: 1, lessonId: 1, body: "First" });
  call({ type: "note.save", enrollmentId: 1, lessonId: 1, body: "Second" });
  call({ type: "attempt.submit", enrollmentId: 1, lessonId: 1, answers: [0] });
  assert.equal(state().notes.length, 1);
  assert.equal(state().notes[0].body, "Second");
});
