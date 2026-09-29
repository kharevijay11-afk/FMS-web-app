import {randomUUID,createHash} from 'node:crypto';
import {prepareAdmission,nextStudentNumber,checkConversion,checkCapacity} from '../../../../packages/domain/src/admission.js';
import { HttpError } from '../lib/http.js';
// Extends the existing in-memory records rather than keeping a second student store.
export function createSyntheticManagement({students,inquiries,portalFixtures,audit,listAudit}){
  const admissionRequests=new Map();let nextNumber=1;
  const courses=[{id:'dca-demo',name:'Diploma in Computer Applications',code:'DCA-DEMO',duration:'12 months',fee:17000},{id:'office-demo',name:'Office & Data Skills',code:'OFFICE-DEMO',duration:'',fee:12000},{id:'cvru-demo',name:'Synthetic CVRU Course',code:'CVRU-DEMO',duration:'3 months',fee:9000}];
  const batches=[{batch:'Morning 08:00',capacity:15},{batch:'Afternoon 14:00',capacity:15}];
  let queue=Promise.resolve();
  const serialize=fn=>{const work=queue.then(fn);queue=work.catch(()=>{});return work;};
  const details=(type,row)=>{
    if(!row)return null;
    if(type==='inquiries')return structuredClone(row);
    const portal=portalFixtures.get(row.id);
    return structuredClone({...row,version:row.version||1,mobile:row.mobile??portal?.profile.mobile??null,email:row.email??portal?.profile.email??null,address:row.address??portal?.profile.address??null,session:row.session??portal?.profile.session??null,courseEndDate:row.courseEndDate??portal?.profile.courseEndDate??null,updatedAt:row.updatedAt??null});
  };
  const rows=type=>type==='inquiries'?inquiries:students;
  return{
    async admissionReferences(){return structuredClone({courses,batches});},
    async admissionCreate(body,{inquiryId=null,key,event}){return serialize(async()=>{
      const hash=createHash('sha256').update(JSON.stringify({body,inquiryId})).digest('hex'),replay=admissionRequests.get(key);
      if(replay){if(replay.hash!==hash)throw new HttpError(409,'IDEMPOTENCY_CONFLICT','This request key was used for different details.');return {...structuredClone(replay.result),replayed:true};}
      const inquiry=inquiryId?inquiries.find(i=>i.id===inquiryId):null;if(inquiryId)checkConversion(inquiry,body.version);
      const value=prepareAdmission(body,courses,inquiry);checkCapacity(value,students,batches);
      const number=nextStudentNumber('CC-',nextNumber,students.map(s=>s.studentId)),id=randomUUID(),now=new Date().toISOString();
      const row={...value,id,studentId:number.studentId,inquiryId,version:1,createdAt:now,updatedAt:now};
      // A single event captures both sides before publishing the atomic in-memory change.
      await audit({...event,action:inquiryId?'INQUIRY_CONVERT':'STUDENT_ADMISSION_CREATE',entityType:inquiryId?'inquiry':'student',entityId:inquiryId||id,metadata:{studentRecordId:id,inquiryId,studentId:row.studentId}});
      students.push(row);nextNumber=number.next;if(inquiry)Object.assign(inquiry,{status:'converted',studentRecordId:id,version:inquiry.version+1,updatedAt:now});
      const result={student:details('students',row)};admissionRequests.set(key,{hash,result:structuredClone(result)});return result;
    });},
    async managementList(type,o){
      const all=rows(type).map(r=>details(type,r));
      const dateKey=type==='inquiries'?'createdAt':'admissionDate';
      const items=all.filter(r=>{
        const date=String(r[dateKey]||'').slice(0,10);
        return(!o.query||`${r.inquiryNo||r.studentId} ${r.name} ${r.mobile||''} ${r.course}`.toLowerCase().includes(o.query.toLowerCase()))&&(!o.course||r.course===o.course)&&(!o.session||r.session===o.session)&&(!o.batch||r.batch===o.batch)&&(!o.status||(o.status==='pending'?['new','contacted'].includes(r.status):r.status===o.status))&&(!o.from||date>=o.from)&&(!o.to||date<=o.to);
      }).sort((a,b)=>{const cmp=String(a[dateKey]||'').localeCompare(String(b[dateKey]||''))||a.id.localeCompare(b.id);return o.sort==='oldest'?cmp:-cmp;});
      const filters=Object.fromEntries(['course','session','batch'].map(k=>[k,[...new Set(all.map(r=>r[k]).filter(Boolean))].sort()]));
      return{items:items.slice((o.page-1)*o.pageSize,o.page*o.pageSize),total:items.length,page:o.page,pageSize:o.pageSize,filters};
    },
    async managementGet(type,id){return details(type,rows(type).find(r=>r.id===id));},
    async managementUpdate(type,id,patch,version,event){return serialize(async()=>{
      const row=rows(type).find(r=>r.id===id);if(!row)throw new HttpError(404,'NOT_FOUND','Record was not found.');
      if((row.version||1)!==version)throw new HttpError(409,'VERSION_CONFLICT','This record changed. Reload it before saving.');
      const next={...row,...patch,version:version+1,updatedAt:new Date().toISOString()};
      // Audit failure prevents the state change. No partially edited row is exposed.
      await audit({...event,metadata:{fields:Object.keys(patch),fromStatus:row.status,toStatus:next.status}});
      Object.assign(row,next);
      if(type==='students'){const portal=portalFixtures.get(id);if(portal)for(const key of ['mobile','email','address'])if(Object.hasOwn(patch,key))portal.profile[key]=patch[key];}
      return details(type,row);
    });},
    async managementHistory(type,id){return(await listAudit()).filter(e=>(e.entityType===(type==='inquiries'?'inquiry':'student')||(type==='students'&&e.metadata?.studentRecordId===id))&&(e.entityId===id||(type==='students'&&e.metadata?.studentRecordId===id))).slice(-20).reverse().map(e=>({action:e.action,occurredAt:e.occurredAt,actorRole:e.actorRole,outcome:e.outcome}));}
  };
}
