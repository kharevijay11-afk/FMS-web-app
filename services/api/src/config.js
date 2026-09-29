function integer(name, fallback, min, max) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  return value;
}

export function loadConfig() {
  const environment = process.env.NODE_ENV ?? "development";
  const production = environment === "production";
  const sessionSecret = process.env.SESSION_SECRET ?? "development-only-secret-change-before-production-123";
  if (production && sessionSecret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters in production.");
  const origin = process.env.APP_ORIGIN ?? "http://127.0.0.1:3000";
  const parsedOrigin = new URL(origin);
  if (production && parsedOrigin.protocol !== "https:") throw new Error("APP_ORIGIN must use HTTPS in production.");
  return Object.freeze({
    environment,
    production,
    host: process.env.HOST ?? "127.0.0.1",
    port: integer("PORT", 3000, 1, 65535),
    origin: parsedOrigin.origin,
    sessionSecret,
    sessionTtlSeconds: integer("SESSION_TTL_SECONDS", 3600, 300, 86400),
    maxBodyBytes: 16 * 1024
  });
}
