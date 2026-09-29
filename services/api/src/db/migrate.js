import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config-step3.js";
import { createPool } from "./pool.js";
const config=loadConfig(); const pool=createPool(config); const dir=join(dirname(fileURLToPath(import.meta.url)),"../../migrations"); const client=await pool.connect();
try {
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations(version varchar(120) PRIMARY KEY, checksum char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
  for (const file of (await readdir(dir)).filter(name=>/^\d+.*\.sql$/.test(name)).sort()) {
    if(file.includes("synthetic_seed"))continue;
    const sql=await readFile(join(dir,file),"utf8"); const checksum=createHash("sha256").update(sql).digest("hex"); const prior=await client.query("SELECT checksum FROM schema_migrations WHERE version=$1",[file]);
    if(prior.rowCount){if(prior.rows[0].checksum!==checksum)throw new Error(`Migration checksum changed: ${file}`);continue;}
    await client.query(sql); await client.query("INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)",[file,checksum]); console.log(`Applied ${file}`);
  }
} finally { client.release(); await pool.end(); }
