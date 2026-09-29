import { loadConfig } from "../config-step3.js";
import { makePasswordRecord, encryptSecret } from "../lib/security-step3.js";
import { createPool } from "./pool.js";
const config=loadConfig(); if(config.production)throw new Error("Synthetic seeding is forbidden in production."); const pool=createPool(config);
const users=[["20000000-0000-4000-8000-000000000001","superadmin@example.test","Demo Admin (migrated)","admin","ChangeMe!123",null,true],["20000000-0000-4000-8000-000000000002","admin@example.test","Demo Admin","admin","ChangeMe!123",null,true],["20000000-0000-4000-8000-000000000003","staff@example.test","Demo Staff","staff","ChangeMe!123",null,false]];
for(const [id,userId,name,role,password,studentId,mfa] of users){const record=makePasswordRecord(password);const cipher=mfa?encryptSecret("JBSWY3DPEHPK3PXP",config.mfaEncryptionKey):null;await pool.query(`INSERT INTO app_users(id,user_id,normalized_user_id,display_name,role,status,password_salt,password_digest,student_record_id,mfa_secret_ciphertext,mfa_enabled,activated_at) VALUES($1,$2,$3,$4,$5,'active',$6,$7,$8,$9,$10,now()) ON CONFLICT(normalized_user_id) DO NOTHING`,[id,userId,userId.toLowerCase(),name,role,record.salt,record.digest,studentId,cipher,mfa]);}
await pool.end(); console.log("Demo admin and staff users seeded.");
