import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {loadImportPlan} from './cfm-backup-import.js';

const [backupPath,envPath='.env.txt']=process.argv.slice(2);if(!backupPath)throw Error('Usage: node tools/check-cfm-import-target.js <backup.json> [env-file]');
for(const line of (await readFile(envPath,'utf8')).split(/\r?\n/)){const clean=line.trim();if(!clean||clean.startsWith('#'))continue;const at=clean.indexOf('=');if(at>0){const key=clean.slice(0,at).trim();if(!process.env[key])process.env[key]=clean.slice(at+1).trim().replace(/^['"]|['"]$/g,'');}}
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is missing.');
if(process.env.DATABASE_PASSWORD_OVERRIDE){const url=new URL(process.env.DATABASE_URL);url.password=process.env.DATABASE_PASSWORD_OVERRIDE;process.env.DATABASE_URL=url.toString();}
const plan=await loadImportPlan(backupPath),pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:process.env.DATABASE_SSL_VERIFY!=='false'}:false,max:1});
try{
 const client=await pool.connect();try{await client.query('BEGIN READ ONLY');
  const checks=await Promise.all([
   client.query('SELECT student_id FROM students WHERE upper(student_id)=ANY($1)',[plan.students.map(x=>x.studentId.toUpperCase())]),
   client.query('SELECT receipt_number FROM payments WHERE upper(receipt_number)=ANY($1)',[plan.payments.map(x=>x.receiptNumber.toUpperCase())]),
   client.query('SELECT inquiry_no FROM inquiries WHERE upper(inquiry_no)=ANY($1)',[plan.inquiries.map(x=>x.inquiryNo.toUpperCase())]),
   client.query('SELECT name FROM admission_courses WHERE upper(name)=ANY($1)',[plan.courses.map(x=>x.name.toUpperCase())]),
   client.query('SELECT expense_number FROM expenses WHERE upper(expense_number)=ANY($1)',[plan.expenses.map(x=>x.expenseNumber.toUpperCase())]),
   client.query('SELECT version FROM schema_migrations ORDER BY version')
  ]);
  console.log(JSON.stringify({target:'postgres',readOnly:true,migrations:checks[5].rows.length,conflicts:{students:checks[0].rowCount,payments:checks[1].rowCount,inquiries:checks[2].rowCount,courses:checks[3].rowCount,expenses:checks[4].rowCount},ready:plan.validation.valid&&checks.slice(0,5).every(x=>x.rowCount===0)},null,2));
  await client.query('ROLLBACK');
 }finally{client.release();}
}finally{await pool.end();}
