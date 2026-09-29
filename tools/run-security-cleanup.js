import pg from 'pg';
const {Pool}=pg;
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required.');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:process.env.DATABASE_SSL_VERIFY!=='false'}:false,max:1});
try{
 const r=await pool.query("WITH s AS (DELETE FROM sessions WHERE expires_at<now() OR revoked_at<now()-interval '7 days' RETURNING 1),c AS (DELETE FROM mfa_challenges WHERE expires_at<now() OR consumed_at<now()-interval '1 day' RETURNING 1),t AS (DELETE FROM account_tokens WHERE expires_at<now() OR used_at<now()-interval '7 days' RETURNING 1),b AS (DELETE FROM auth_throttle_buckets WHERE updated_at<now()-interval '1 day' RETURNING 1) SELECT (SELECT count(*) FROM s)::int AS sessions,(SELECT count(*) FROM c)::int AS challenges,(SELECT count(*) FROM t)::int AS tokens,(SELECT count(*) FROM b)::int AS throttle_buckets");
 console.log(JSON.stringify({removed:r.rows[0]}));
}finally{await pool.end()}
