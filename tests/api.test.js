import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../services/api/src/app.js";
import { loadConfig } from "../services/api/src/config.js";

async function fixture(t) {
  const config = { ...loadConfig(), port: 0, origin: "http://127.0.0.1" };
  const server = createApp(config);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}`;
}

async function login(base, userId, password) {
  const response = await fetch(`${base}/api/v1/auth/login`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1" }, body: JSON.stringify({ userId, password }) });
  return { response, body: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
}

test("health identifies synthetic data and sends security headers", async (t) => {
  const base = await fixture(t); const response = await fetch(`${base}/api/v1/health`); const body = await response.json();
  assert.equal(response.status, 200); assert.equal(body.dataSource, "synthetic"); assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("inquiry validates consent and supports idempotency", async (t) => {
  const base = await fixture(t); const headers = { "Content-Type": "application/json", Origin: "http://127.0.0.1", "Idempotency-Key": "test-inquiry-001" };
  const invalid = await fetch(`${base}/api/v1/inquiries`, { method: "POST", headers, body: JSON.stringify({ name: "A", mobile: "123", course: "X", consent: false }) }); assert.equal(invalid.status, 422);
  const payload = { name: "Synthetic Parent", mobile: "+919876543210", course: "Computer Foundations", message: "Please call", consent: true };
  const first = await fetch(`${base}/api/v1/inquiries`, { method: "POST", headers, body: JSON.stringify(payload) }); const firstBody = await first.json();
  const second = await fetch(`${base}/api/v1/inquiries`, { method: "POST", headers, body: JSON.stringify(payload) }); const secondBody = await second.json();
  assert.equal(first.status, 201); assert.equal(second.status, 200); assert.equal(secondBody.inquiry.id, firstBody.inquiry.id);
});

test("student reads own summary while staff is denied that endpoint", async (t) => {
  const base = await fixture(t); const student = await login(base, "STU-DEMO-001", "Student!123"); assert.equal(student.response.status, 200);
  const summary = await fetch(`${base}/api/v1/students/me/summary`, { headers: { Cookie: student.cookie } }); assert.equal(summary.status, 200); assert.equal((await summary.json()).student.studentId, "STU-DEMO-001");
  const staff = await login(base, "staff@example.test", "ChangeMe!123"); const forbidden = await fetch(`${base}/api/v1/students/me/summary`, { headers: { Cookie: staff.cookie } }); assert.equal(forbidden.status, 403);
});

test("logout requires CSRF token", async (t) => {
  const base = await fixture(t); const student = await login(base, "STU-DEMO-001", "Student!123");
  const rejected = await fetch(`${base}/api/v1/auth/logout`, { method: "POST", headers: { Cookie: student.cookie, Origin: "http://127.0.0.1" } }); assert.equal(rejected.status, 403);
  const accepted = await fetch(`${base}/api/v1/auth/logout`, { method: "POST", headers: { Cookie: student.cookie, Origin: "http://127.0.0.1", "X-CSRF-Token": student.body.csrfToken } }); assert.equal(accepted.status, 200);
});
