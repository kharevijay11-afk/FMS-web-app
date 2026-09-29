// Optional, isolated synthetic workflow examples. Never uses a database connection.
import {createStep3App} from './app-step3.js';
import {createSyntheticStep3Repository} from './repositories/synthetic-step3.js';
import {loadConfig} from './config-step3.js';
const config=loadConfig();if(config.production||config.dataSource!=='synthetic')throw new Error('Step 6B examples require synthetic development mode.');
const repo=createSyntheticStep3Repository(config);
for(const [name,status,course,date] of [['Kavya Example','new','Diploma in Computer Applications','2026-09-10'],['Rohan Example','contacted','Office & Data Skills','2026-09-09'],['Aarav Demo','converted','Diploma in Computer Applications','2026-06-20']]){
  const row=await repo.addInquiry({name,mobile:'9999999999',course,message:status==='contacted'?'Synthetic follow-up example: contacted; date scheduling is not integrated.':'Synthetic inquiry example.',consent:true});
  row.createdAt=date+'T09:00:00Z';if(status!=='new')await repo.updateInquiryStatus(row.id,status,row.version);
  if(status==='converted')row.studentRecordId='student-demo-001';
}
await repo.managementUpdate('students','student-demo-002',{status:'left'},1,{actorUserId:'usr-admin',actorRole:'admin',action:'STUDENT_MARK_LEFT',entityType:'student',entityId:'student-demo-002',requestId:'synthetic-preview-initialization',ipHash:null,outcome:'success'});
const server=createStep3App(config,repo);server.listen(config.port,config.host,()=>console.log(`Step 6B synthetic examples: ${config.origin}/admin`));
const stop=()=>server.close(async()=>{await repo.close();process.exit(0);});process.on('SIGINT',stop);process.on('SIGTERM',stop);
