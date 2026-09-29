import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { hasPermission, PERMISSIONS } from "../../../packages/domain/src/rbac.js";
import { validateInquiry, validateLogin } from "../../../packages/contracts/src/validation.js";
import { HttpError, readJson, requestId, securityHeaders, sendJson } from "./lib/http.js";
import { createRateLimiter, createSessionStore, requireCsrf, requireSameOrigin, verifyPassword } from "./lib/security.js";
import { createSyntheticRepository } from "./repositories/synthetic.js";

const projectRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".yaml": "application/yaml; charset=utf-8" };

function publicUser(user) { return { id: user.id, userId: user.userId, name: user.name, role: user.role, permissions: PERMISSIONS[user.role] }; }
function ip(req) { return String(req.socket.remoteAddress ?? "unknown"); }

export function createApp(config, dependencies = {}) {
  const repository = dependencies.repository ?? createSyntheticRepository();
  const sessions = createSessionStore(config);
  const loginLimit = createRateLimiter({ limit: 8, windowMs: 15 * 60_000 });
  const inquiryLimit = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

  async function authenticate(req) {
    const session = sessions.read(req);
    if (!session) throw new HttpError(401, "UNAUTHENTICATED", "Authentication is required.");
    const user = repository.findUserById(session.userId);
    if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Authentication is required.");
    return { user, session };
  }

  function authorize(user, permission) {
    if (!hasPermission(user, permission)) throw new HttpError(403, "FORBIDDEN", "You do not have permission for this action.");
  }

  async function api(req, res, url) {
    if (req.method === "GET" && url.pathname === "/api/v1/health") return sendJson(res, 200, { status: "ok", dataSource: "synthetic", version: "0.2.0" });

    if (req.method === "POST" && url.pathname === "/api/v1/auth/login") {
      requireSameOrigin(req, config); loginLimit(ip(req));
      const parsed = validateLogin(await readJson(req, config.maxBodyBytes));
      if (!parsed.ok) throw new HttpError(422, "VALIDATION_FAILED", "Login data is invalid.", parsed.errors);
      const user = repository.findUser(parsed.value.userId);
      if (!user || !verifyPassword(parsed.value.password, user.password)) throw new HttpError(401, "INVALID_CREDENTIALS", "User ID or password is incorrect.");
      const issued = sessions.issue(user);
      return sendJson(res, 200, { user: publicUser(user), csrfToken: issued.csrf }, { "Set-Cookie": issued.cookie });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/auth/logout") {
      requireSameOrigin(req, config); const { session } = await authenticate(req); requireCsrf(req, session); sessions.revoke(req);
      return sendJson(res, 200, { ok: true }, { "Set-Cookie": sessions.clearCookie });
    }

    if (req.method === "GET" && url.pathname === "/api/v1/me") {
      const { user, session } = await authenticate(req);
      return sendJson(res, 200, { user: publicUser(user), csrfToken: session.csrf });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/inquiries") {
      requireSameOrigin(req, config); inquiryLimit(ip(req));
      const key = String(req.headers["idempotency-key"] ?? "");
      if (key && !/^[A-Za-z0-9._-]{8,100}$/.test(key)) throw new HttpError(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be 8-100 safe characters.");
      const existing = repository.inquiryByKey(key);
      if (existing) return sendJson(res, 200, { inquiry: existing, duplicate: true });
      const parsed = validateInquiry(await readJson(req, config.maxBodyBytes));
      if (!parsed.ok) throw new HttpError(422, "VALIDATION_FAILED", "Inquiry data is invalid.", parsed.errors);
      const inquiry = { id: randomUUID(), inquiryNo: `WEB-DEMO-${String(repository.listInquiries().length + 1).padStart(4, "0")}`, ...parsed.value, status: "New", createdAt: new Date().toISOString() };
      repository.addInquiry(inquiry, key);
      return sendJson(res, 201, { inquiry: { id: inquiry.id, inquiryNo: inquiry.inquiryNo, status: inquiry.status, createdAt: inquiry.createdAt } });
    }

    if (req.method === "GET" && url.pathname === "/api/v1/students/me/summary") {
      const { user } = await authenticate(req); authorize(user, "student:summary:read:own");
      const student = repository.findStudent(user.studentRecordId);
      if (!student) throw new HttpError(404, "STUDENT_NOT_FOUND", "Student summary was not found.");
      return sendJson(res, 200, { student });
    }

    const match = url.pathname.match(/^\/api\/v1\/students\/([^/]+)\/summary$/);
    if (req.method === "GET" && match) {
      const { user } = await authenticate(req); authorize(user, "student:summary:read:any");
      const student = repository.findStudent(decodeURIComponent(match[1]));
      if (!student) throw new HttpError(404, "STUDENT_NOT_FOUND", "Student summary was not found.");
      return sendJson(res, 200, { student });
    }
    throw new HttpError(404, "NOT_FOUND", "API endpoint was not found.");
  }

  async function staticFile(req, res, url) {
    const route = url.pathname === "/" ? "/apps/public-web/index.html" : url.pathname === "/student" ? "/apps/student-portal/index.html" : url.pathname === "/admin" ? "/apps/admin-web/index.html" : url.pathname;
    const relative = normalize(route).replace(/^([/\\])+/, "");
    if (!relative.startsWith("apps/") && !relative.startsWith("apps\\") && relative !== "packages/contracts/openapi.yaml") throw new HttpError(404, "NOT_FOUND", "Page was not found.");
    const file = join(projectRoot, relative);
    const content = await readFile(file).catch(() => null);
    if (!content) throw new HttpError(404, "NOT_FOUND", "Page was not found.");
    res.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" }); res.end(content);
  }

  return createServer(async (req, res) => {
    const id = requestId(req); Object.entries(securityHeaders(config, id)).forEach(([key, value]) => res.setHeader(key, value));
    try {
      const url = new URL(req.url, config.origin);
      if (url.pathname.startsWith("/api/")) await api(req, res, url); else await staticFile(req, res, url);
    } catch (error) {
      const known = error instanceof HttpError; const status = known ? error.status : 500;
      if (!known) console.error(JSON.stringify({ level: "error", requestId: id, message: error.message }));
      sendJson(res, status, { error: { code: known ? error.code : "INTERNAL_ERROR", message: known ? error.message : "An unexpected error occurred.", ...(known && error.details ? { details: error.details } : {}), requestId: id } });
    }
  });
}
