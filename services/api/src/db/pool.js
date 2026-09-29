import pg from "pg";
import {readFileSync} from 'node:fs';
const { Pool } = pg;
export function createPool(config) {
  if (!config.databaseUrl) throw new Error("DATABASE_URL is required for PostgreSQL mode.");
  const ssl=config.databaseSsl?{rejectUnauthorized:config.databaseSslVerify,...(config.databaseSslCaPath?{ca:readFileSync(config.databaseSslCaPath,'utf8')}:{})}:false;
  return new Pool({ connectionString: config.databaseUrl, ssl, max: 10, idleTimeoutMillis: 30_000 });
}
