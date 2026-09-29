import pg from 'pg';
import { createHash } from 'node:crypto';
import { createPostgresAdministration } from '../services/api/src/repositories/postgres-administration.js';

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: process.env.DATABASE_SSL_VERIFY !== 'false' }
    : false,
  max: 1
});

try {
  const administration = createPostgresAdministration(pool);
  const backup = await administration.administrationBackup();
  const serialized = JSON.stringify(backup);
  const forbidden = ['password_digest', 'password_salt', 'mfa_secret', 'token_hash', 'csrf_hash'];
  const exposedSecretFields = forbidden.filter((field) => serialized.includes(field));
  const validation = await administration.administrationValidateRestore(JSON.parse(serialized));
  if (exposedSecretFields.length || !validation.valid || validation.applyAvailable) {
    throw new Error('Logical backup safety validation failed.');
  }
  console.log(JSON.stringify({
    format: backup.format,
    source: backup.source,
    sha256: createHash('sha256').update(serialized).digest('hex'),
    bytes: Buffer.byteLength(serialized),
    sections: Object.fromEntries(Object.entries(backup.data).map(([name, value]) => [name, Array.isArray(value) ? value.length : value ? 1 : 0])),
    exposedSecretFields,
    restoreValidation: validation
  }));
} finally {
  await pool.end();
}
