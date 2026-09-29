import { randomUUID } from "node:crypto";

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function securityHeaders(config, requestId) {
  return {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...(config.production ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {}),
    "X-Request-Id": requestId
  };
}

export function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(body);
}

export async function readJson(req, maxBytes) {
  const contentType = String(req.headers["content-type"] ?? "").split(";")[0];
  if (contentType !== "application/json") throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.");
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { throw new HttpError(400, "INVALID_JSON", "Request body must contain valid JSON."); }
}

export function requestId(req) {
  const supplied = String(req.headers["x-request-id"] ?? "");
  return /^[A-Za-z0-9._-]{8,80}$/.test(supplied) ? supplied : randomUUID();
}

export function cookieMap(header = "") {
  return Object.fromEntries(header.split(";").map((item) => item.trim().split("=")).filter(([key, value]) => key && value).map(([key, value]) => [key, decodeURIComponent(value)]));
}
