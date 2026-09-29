import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { HttpError, cookieMap } from "./http.js";

const encode = (value) => Buffer.from(value).toString("base64url");
const hash = (value) => createHmac("sha256", "fms-demo-password-pepper").update(value).digest("hex");

export function makePasswordRecord(password) {
  const salt = randomBytes(16).toString("hex");
  return { salt, digest: scryptSync(password, salt, 64).toString("hex") };
}

export function verifyPassword(password, record) {
  const candidate = scryptSync(password, record.salt, 64);
  const expected = Buffer.from(record.digest, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function createSessionStore(config) {
  const sessions = new Map();
  const signature = (id) => createHmac("sha256", config.sessionSecret).update(id).digest("base64url");
  const cookieFlags = `Path=/; HttpOnly; SameSite=Strict; Max-Age=${config.sessionTtlSeconds}${config.production ? "; Secure" : ""}`;
  return {
    issue(user) {
      const id = randomUUID();
      const csrf = encode(randomBytes(24));
      sessions.set(hash(id), { userId: user.id, role: user.role, csrf, expiresAt: Date.now() + config.sessionTtlSeconds * 1000 });
      return { csrf, cookie: `fms_session=${id}.${signature(id)}; ${cookieFlags}` };
    },
    read(req) {
      const raw = cookieMap(req.headers.cookie).fms_session;
      if (!raw) return null;
      const [id, suppliedSignature] = raw.split(".");
      if (!id || !suppliedSignature) return null;
      const expected = signature(id);
      const a = Buffer.from(suppliedSignature); const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
      const session = sessions.get(hash(id));
      if (!session || session.expiresAt <= Date.now()) { sessions.delete(hash(id)); return null; }
      return { ...session, key: hash(id) };
    },
    revoke(req) { const session = this.read(req); if (session) sessions.delete(session.key); },
    clearCookie: `fms_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${config.production ? "; Secure" : ""}`
  };
}

export function requireSameOrigin(req, config) {
  const origin = req.headers.origin;
  if (origin && origin !== config.origin) throw new HttpError(403, "ORIGIN_REJECTED", "Request origin is not allowed.");
}

export function requireCsrf(req, session) {
  const token = String(req.headers["x-csrf-token"] ?? "");
  if (!session || token.length !== session.csrf.length || !timingSafeEqual(Buffer.from(token), Buffer.from(session.csrf))) {
    throw new HttpError(403, "CSRF_REJECTED", "CSRF token is missing or invalid.");
  }
}

export function createRateLimiter({ limit, windowMs }) {
  const buckets = new Map();
  return (key) => {
    const now = Date.now(); const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return; }
    bucket.count += 1;
    if (bucket.count > limit) throw new HttpError(429, "RATE_LIMITED", "Too many requests. Please try again later.");
  };
}
