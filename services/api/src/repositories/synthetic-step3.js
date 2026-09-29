import { createSyntheticManagement } from "./synthetic-management.js";
import { createSyntheticAcademic } from "./academic-synthetic.js";
import { createStudentPortalFixtures } from './student-portal-fixtures.js';
import { createSyntheticFinance } from './finance-synthetic.js';
import { createSyntheticStep6E } from './step6e-synthetic.js';
import { createSyntheticExpenses } from './expenses-synthetic.js';
import { createSyntheticReports } from './reports-synthetic.js';
import { createSyntheticSalary } from './salary-synthetic.js';
import { createSyntheticAdministration } from './administration-synthetic.js';
import { randomBytes, randomUUID } from "node:crypto";
import { makePasswordRecord, sha256 } from "../lib/security-step3.js";

export function createSyntheticStep3Repository(config){
 const users=[{id:"usr-super",userId:"superadmin@example.test",name:"Demo Admin (migrated)",role:"admin",status:"active",password:makePasswordRecord("ChangeMe!123"),mfaEnabled:true,mfaSecret:"JBSWY3DPEHPK3PXP"},{id:"usr-admin",userId:"admin@example.test",name:"Demo Admin",role:"admin",status:"active",password:makePasswordRecord("ChangeMe!123"),mfaEnabled:true,mfaSecret:"JBSWY3DPEHPK3PXP"},{id:"usr-staff",userId:"staff@example.test",name:"Demo Staff",role:"staff",status:"active",password:makePasswordRecord("ChangeMe!123"),mfaEnabled:true,mfaSecret:"JBSWY3DPEHPK3PXP"},{id:"usr-student",userId:"STU-DEMO-001",name:"Aarav Demo",role:"student",status:"active",studentRecordId:"student-demo-001",password:makePasswordRecord("Student!123"),mfaEnabled:false},{id:"usr-activate",userId:"STU-ACT-002",name:"Diya Example",role:"student",status:"pending_activation",studentRecordId:"student-demo-002",password:{},mfaEnabled:false}];
 const students=[{id:"student-demo-001",studentId:"STU-DEMO-001",name:"Aarav Demo",course:"Diploma in Computer Applications",batch:"Morning 08:00",status:"active",admissionDate:"2026-07-01",fee:{currency:"INR",totalPaise:1800000,paidPaise:750000,duePaise:1050000},nextInstallment:{dueDate:"2026-10-01",amountPaise:300000}},{id:"student-demo-002",studentId:"STU-ACT-002",name:"Diya Example",course:"Office & Data Skills",batch:"Afternoon 14:00",status:"active",admissionDate:"2026-08-01",fee:{currency:"INR",totalPaise:1200000,paidPaise:0,duePaise:1200000},nextInstallment:{dueDate:"2026-10-15",amountPaise:300000}}];
 const portalFixtures=createStudentPortalFixtures();
 const sessions=new Map(),tokens=new Map(),challenges=new Map(),idempotency=new Map(),audits=[],inquiries=[];
 const repository = {
  async getStudentPortal(studentId){const data=portalFixtures.get(studentId);return data?{...structuredClone(data),unreadNoticeCount:data.notices.filter(item=>!item.readAt).length}:null},
  async markStudentNoticeRead(studentId,noticeId){const notice=portalFixtures.get(studentId)?.notices.find(item=>item.id===noticeId);if(!notice)return null;const changed=!notice.readAt;if(changed)notice.readAt=new Date().toISOString();return{notice:structuredClone(notice),changed}},
  kind:"synthetic",async findUser(userId){return users.find(u=>u.userId.toLowerCase()===String(userId).toLowerCase())},async findUserById(id){return users.find(u=>u.id===id)},async findStudent(id){return students.find(s=>s.id===id)},async listStudents({query=""}={}){const q=query.toLowerCase();return students.filter(s=>!q||`${s.studentId} ${s.name} ${s.course}`.toLowerCase().includes(q))},
  async createSession({tokenHash,csrfHash,userId,expiresAt}){sessions.set(tokenHash,{tokenHash,csrfHash,userId,expiresAt,revokedAt:null})},async getSession(tokenHash){const s=sessions.get(tokenHash);return s&&!s.revokedAt&&s.expiresAt>Date.now()?s:null},async revokeSession(tokenHash){const s=sessions.get(tokenHash);if(s)s.revokedAt=Date.now()},
  async createChallenge(userId,expiresAt){const row={id:randomUUID(),userId,expiresAt,attempts:0,consumed:false};challenges.set(row.id,row);return row},async getChallenge(id){const c=challenges.get(id);return c&&!c.consumed&&c.expiresAt>Date.now()&&c.attempts<5?c:null},async failChallenge(id){const c=challenges.get(id);if(c)c.attempts++},async consumeChallenge(id){const c=challenges.get(id);if(c)c.consumed=true},
  async createAccountToken(userId,kind,tokenHash,expiresAt){for(const row of tokens.values())if(row.userId===userId&&row.kind===kind)row.used=true;tokens.set(tokenHash,{userId,kind,expiresAt,used:false})},async consumeAccountToken(tokenHash,kind,password){const row=tokens.get(tokenHash);if(!row||row.kind!==kind||row.used||row.expiresAt<Date.now())return null;row.used=true;const user=users.find(u=>u.id===row.userId);user.password=password;user.status="active";for(const session of sessions.values())if(session.userId===user.id)session.revokedAt=Date.now();return user},
  async getIdempotency(scope,key){return idempotency.get(`${scope}:${key}`)},async saveIdempotency(scope,key,requestHash,status,body){idempotency.set(`${scope}:${key}`,{requestHash,status,body})},
  async addInquiry(data){const row={id:randomUUID(),inquiryNo:`WEB-${String(inquiries.length+1).padStart(4,"0")}`,...data,status:"new",version:1,createdAt:new Date().toISOString()};inquiries.push(row);return row},async listInquiries({status,query=""}={}){const q=query.toLowerCase();return inquiries.filter(i=>(!status||i.status===status)&&(!q||`${i.inquiryNo} ${i.name} ${i.mobile} ${i.course}`.toLowerCase().includes(q)))},async updateInquiryStatus(id,status,version){const i=inquiries.find(x=>x.id===id);if(!i||i.version!==version)return null;i.status=status;i.version++;i.updatedAt=new Date().toISOString();return i},
  async audit(event){audits.push(Object.freeze({...event,id:audits.length+1,occurredAt:new Date().toISOString()}))},async listAudit(){return [...audits]},async close(){}
 };
 Object.assign(repository,createSyntheticManagement({students,inquiries,portalFixtures,audit:e=>repository.audit(e),listAudit:()=>repository.listAudit()}));
 Object.assign(repository,createSyntheticAcademic(students,e=>repository.audit(e)));
 const finance=createSyntheticFinance(students,portalFixtures,e=>repository.audit(e));
 Object.assign(repository,finance);
 Object.assign(repository,createSyntheticStep6E(students,portalFixtures,e=>repository.audit(e),finance));
 Object.assign(repository,createSyntheticExpenses(finance,e=>repository.audit(e)));
 Object.assign(repository,createSyntheticReports(finance,students));
 Object.assign(repository,createSyntheticSalary(users,e=>repository.audit(e)));
 Object.assign(repository,createSyntheticAdministration(users,audits,e=>repository.audit(e)));
 return repository;
}


