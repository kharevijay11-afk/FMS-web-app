import pg from 'pg';
import { readFileSync } from 'node:fs';
import { encryptSecret, makePasswordRecord, strongPassword } from '../services/api/src/lib/security-step3.js';

for (const key of ['DATABASE_URL', 'DATABASE_SSL_CA_PATH', 'MFA_ENCRYPTION_KEY', 'PRIVILEGED_ROTATION_JSON']) {
  if (!process.env[key]) throw new Error(`${key} is required.`);
}

const rotations = JSON.parse(process.env.PRIVILEGED_ROTATION_JSON);
if (!Array.isArray(rotations) || rotations.length === 0) throw new Error('At least one rotation is required.');

const normalizedIds = new Set();
for (const item of rotations) {
  if (!['admin', 'staff'].includes(item.role)) throw new Error('Only admin and staff roles can be rotated.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.userId)) throw new Error(`Invalid login email: ${item.userId}`);
  if (!item.displayName?.trim()) throw new Error(`Display name is required for ${item.userId}.`);
  if (!strongPassword(item.password)) throw new Error(`Generated password is not strong for ${item.userId}.`);
  if (!/^[A-Z2-7]{32}$/.test(item.totpSecret)) throw new Error(`Invalid TOTP secret for ${item.userId}.`);
  const normalized = item.userId.trim().toLowerCase();
  if (normalizedIds.has(normalized)) throw new Error(`Duplicate login email: ${item.userId}`);
  normalizedIds.add(normalized);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true, ca: readFileSync(process.env.DATABASE_SSL_CA_PATH, 'utf8') },
  max: 1,
});
const client = await pool.connect();

try {
  await client.query('BEGIN');
  for (const item of rotations) {
    const existing = await client.query(
      `SELECT id, user_id, role FROM app_users WHERE user_id = $1 FOR UPDATE`,
      [item.previousUserId],
    );
    if (existing.rowCount !== 1 || !['admin', 'staff', 'superadmin'].includes(existing.rows[0].role)) {
      throw new Error(`Privileged source account was not found: ${item.previousUserId}`);
    }
    const collision = await client.query(
      `SELECT 1 FROM app_users WHERE normalized_user_id = lower($1::text) AND id <> $2`,
      [item.userId, existing.rows[0].id],
    );
    if (collision.rowCount) throw new Error(`Login email already exists: ${item.userId}`);

    const password = makePasswordRecord(item.password);
    const mfaCiphertext = encryptSecret(item.totpSecret, process.env.MFA_ENCRYPTION_KEY);
    await client.query(
      `UPDATE app_users
       SET user_id = $1::varchar, normalized_user_id = lower($1::text), display_name = $2, role = $3,
           status = 'active', password_salt = $4, password_digest = $5,
           mfa_secret_ciphertext = $6, mfa_enabled = true,
           failed_login_count = 0, locked_until = NULL,
           activated_at = COALESCE(activated_at, now()), updated_at = now()
       WHERE id = $7`,
      [item.userId.trim(), item.displayName.trim(), item.role, password.salt, password.digest,
        mfaCiphertext, existing.rows[0].id],
    );
    await client.query(`UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [existing.rows[0].id]);
    await client.query(`UPDATE account_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`, [existing.rows[0].id]);
    await client.query(`UPDATE mfa_challenges SET consumed_at = now() WHERE user_id = $1 AND consumed_at IS NULL`, [existing.rows[0].id]);
    await client.query(
      `INSERT INTO audit_events(actor_user_id, actor_role, action, entity_type, entity_id, request_id, outcome, metadata)
       VALUES(NULL, NULL, 'PRIVILEGED_ACCOUNT_ROTATION', 'user', $1, $2, 'success', $3::jsonb)`,
      [existing.rows[0].id, `maintenance-mfa-rotation-${Date.now()}`,
        JSON.stringify({ previousUserId: item.previousUserId, userId: item.userId, role: item.role, mfaEnabled: true })],
    );
  }
  await client.query('COMMIT');
  console.log(JSON.stringify({ rotated: rotations.map(({ previousUserId, userId, displayName, role }) => ({ previousUserId, userId, displayName, role, mfaEnabled: true })) }));
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
