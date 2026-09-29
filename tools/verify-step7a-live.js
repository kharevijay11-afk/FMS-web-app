import pg from 'pg';
import {verifyPassword} from '../services/api/src/lib/security-step3.js';
const {Pool}=pg;
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required.');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:process.env.DATABASE_SSL_VERIFY!=='false'}:false,max:1});
try{
 const [users,sessions,tokens,transport]=await Promise.all([
  pool.query("SELECT user_id,role,status,mfa_enabled,password_salt,password_digest FROM app_users"),
  pool.query("SELECT count(*) FILTER(WHERE revoked_at IS NULL AND expires_at<=now())::int AS expired_not_revoked,count(*) FILTER(WHERE revoked_at IS NULL AND expires_at>now())::int AS active FROM sessions"),
  pool.query("SELECT count(*) FILTER(WHERE used_at IS NULL AND expires_at<=now())::int AS expired_unused FROM account_tokens"),
  pool.query("SELECT ssl,version,cipher FROM pg_stat_ssl WHERE pid=pg_backend_pid()")
 ]);
 const demoIds=new Set(['admin@example.test','superadmin@example.test','staff@example.test','STU-DEMO-001','STU-ACT-002']),demo=users.rows.filter(x=>demoIds.has(x.user_id));
 const knownDefaults=demo.filter(x=>x.password_salt&&x.password_digest&&['ChangeMe!123','Student!123'].some(password=>verifyPassword(password,{salt:x.password_salt,digest:x.password_digest}))).length;
 const activePrivileged=users.rows.filter(x=>['admin','superadmin'].includes(x.role)&&x.status==='active');
 console.log(JSON.stringify({privilegedWithoutMfa:activePrivileged.filter(x=>!x.mfa_enabled).length,activePrivilegedAccounts:activePrivileged.length,activeNonDemoPrivilegedAccounts:activePrivileged.filter(x=>!demoIds.has(x.user_id)).length,demoAccounts:demo.length,activeDemoAccounts:demo.filter(x=>x.status==='active').length,demoAccountsWithKnownDefaultPassword:knownDefaults,sessions:sessions.rows[0],expiredUnusedAccountTokens:tokens.rows[0].expired_unused,poolerBackendTransport:transport.rows[0]}));
}finally{await pool.end()}
