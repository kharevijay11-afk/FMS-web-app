import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
const {Pool}=pg;
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required.');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:process.env.DATABASE_SSL_VERIFY!=='false'}:false,max:1});
try{
 const sql=await readFile(new URL('../services/api/migrations/015_approved_print_layouts.sql',import.meta.url),'utf8');
 const checksum=createHash('sha256').update(sql).digest('hex');
 const migration=await pool.query("SELECT checksum FROM schema_migrations WHERE version='015_approved_print_layouts.sql'");
 const defaults=await pool.query("SELECT table_name,column_name,column_default FROM information_schema.columns WHERE table_schema='public' AND (table_name,column_name) IN (('certificates','print_status'),('id_card_issues','print_layout_status')) ORDER BY table_name");
 const pending=await pool.query("SELECT (SELECT count(*) FROM certificates WHERE print_status='layout-pending')::int AS certificates,(SELECT count(*) FROM id_card_issues WHERE print_layout_status='authoritative-layout-pending')::int AS id_cards");
 if(migration.rowCount!==1||migration.rows[0].checksum!==checksum)throw new Error('Migration 015 checksum verification failed.');
 const byColumn=Object.fromEntries(defaults.rows.map(x=>[`${x.table_name}.${x.column_name}`,x.column_default]));
 if(!String(byColumn['certificates.print_status']).includes('layout-ready'))throw new Error('Certificate print-status default is not ready.');
 if(!String(byColumn['id_card_issues.print_layout_status']).includes('approved-layout-ready'))throw new Error('ID-card print-layout default is not ready.');
 if(pending.rows[0].certificates||pending.rows[0].id_cards)throw new Error('Legacy pending print-layout rows remain.');
 console.log(JSON.stringify({migration:'015_approved_print_layouts.sql',checksum:'verified',certificateDefault:'layout-ready',idCardDefault:'approved-layout-ready',legacyPendingRows:pending.rows[0]}));
}finally{await pool.end()}
