import {HttpError} from '../../../services/api/src/lib/http.js';
const fail=(field,message)=>{throw new HttpError(422,'VALIDATION_FAILED','Check the admission fields.',[{field,message}]);};
export const properCase=s=>String(s||'').trim().toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase()).replace(/\s+/g,' ');
export function admissionSession(date,value=''){
 const raw=value.trim(),y=Number(date.slice(0,4));
 if(!raw)return `July ${String(y).slice(-2)}-${String(y+1).slice(-2)}`;
 const term=raw.match(/^(jan|july)\s+(\d{2})-(\d{2})$/i);if(term)return `${term[1].toLowerCase()==='jan'?'Jan':'July'} ${term[2]}-${term[3]}`;
 const old=raw.match(/^(?:\d{2})?(\d{2})-(\d{2})$/);return old?`July ${old[1]}-${old[2]}`:raw;
}
export function nextStudentNumber(prefix,counter,ids){
 let n=Math.max(1,counter);for(const id of ids){if(id.slice(0,prefix.length).toUpperCase()!==prefix.toUpperCase())continue;const suffix=id.slice(prefix.length);if(/^\d+$/.test(suffix))n=Math.max(n,Number(suffix)+1);}
 if(!Number.isSafeInteger(n)||n>=Number.MAX_SAFE_INTEGER)throw new HttpError(409,'COUNTER_EXHAUSTED','Student counter is exhausted.');
 return {studentId:prefix+String(n).padStart(4,'0'),next:n+1};
}
const dateValid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const money=(v,key)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||!Number.isSafeInteger(Math.round(v*100))||Math.abs(v*100-Math.round(v*100))>0.00001)fail(key,'Enter a non-negative amount with at most two decimal places.');return Math.round(v*100);};
export function prepareAdmission(body,courses,inquiry=null){
 if(!body||typeof body!=='object'||Array.isArray(body))fail('body','An object is required.');
 const allowed=['name','mobile','guardian','motherName','courseId','batch','session','admissionDate','status','fee','discount','addonEnabled','addonFee','address','cvruRegNo','abcId','debId','installments','version'];
 for(const k of Object.keys(body))if(!allowed.includes(k))fail(k,'Unsupported admission field.');
 const b={name:inquiry?.name,mobile:inquiry?.mobile,guardian:inquiry?.guardian||'',address:inquiry?.message||'',...body};
 for(const k of ['name','mobile','guardian','motherName','courseId','batch','session','admissionDate','status','address','cvruRegNo','abcId','debId'])if(b[k]!=null&&(typeof b[k]!=='string'||b[k].length>(k==='address'?500:160)))fail(k,'Invalid text.');
 if(!b.name?.trim())fail('name','Student name is required.');if(b.name.trim().length>120)fail('name','Maximum 120 characters.');
 if(!/^\d{10}$/.test(b.mobile||''))fail('mobile','Enter a 10 digit mobile number.');
 const course=courses.find(c=>c.id===b.courseId);if(!course)fail('courseId','Select an available course.');
 const admissionDate=b.admissionDate||new Date().toISOString().slice(0,10);if(!dateValid(admissionDate))fail('admissionDate','Enter a valid date.');
 const status=b.status||'active';if(!['active','completed','left'].includes(status))fail('status','Unsupported status.');
 if(b.addonEnabled!==undefined&&typeof b.addonEnabled!=='boolean')fail('addonEnabled','Use true or false.');
 const cvru=course.code.toUpperCase().includes('CVRU'),addonEnabled=cvru&&!!b.addonEnabled;
 const courseFeePaise=money(b.fee??course.fee,'fee'),discountPaise=money(b.discount??0,'discount'),addonFeePaise=addonEnabled?money(b.addonFee??0,'addonFee'):0;
 if(addonEnabled&&!addonFeePaise)fail('addonFee','Enabled add-on fee must be greater than zero.');
 const totalPaise=Math.max(0,courseFeePaise+addonFeePaise-discountPaise);if(!Number.isSafeInteger(totalPaise))fail('fee','Amount is too large.');
 if(b.installments!==undefined&&!Array.isArray(b.installments))fail('installments','Use an installment list.');
 let plan=b.installments||[];if(plan.length>600)fail('installments','Too many installments.');
 if(!plan.length&&totalPaise>0){const months=Math.max(1,Number(String(course.duration||'').match(/\d+/)?.[0]||1));if(months>600)fail('courseId','Course duration requires review.');const base=Math.floor(totalPaise/100/months)*100;plan=Array.from({length:months},(_,i)=>{const d=new Date(admissionDate+'T00:00:00Z'),day=d.getUTCDate();d.setUTCMonth(d.getUTCMonth()+i);if(d.getUTCDate()!==day)d.setUTCDate(0);return{installmentNo:i+1,dueDate:d.toISOString().slice(0,10),amount:(i===months-1?totalPaise-base*(months-1):base)/100,remark:`Installment ${i+1}`};});}
 const installments=plan.map((p,i)=>{if(!p||!dateValid(p.dueDate))fail('installments','Every installment needs a valid due date.');const amountPaise=money(p.amount,'installments');if(!amountPaise)fail('installments','Every installment amount must be positive.');if(p.remark!=null&&(typeof p.remark!=='string'||p.remark.length>500))fail('installments','Invalid remark.');if(p.installmentNo!=null&&(!Number.isSafeInteger(p.installmentNo)||p.installmentNo<1))fail('installments','Invalid installment number.');return{installmentNo:p.installmentNo||i+1,dueDate:p.dueDate,amountPaise,remark:properCase(p.remark)};}).sort((a,b)=>a.installmentNo-b.installmentNo||a.dueDate.localeCompare(b.dueDate)).map((p,i)=>({...p,installmentNo:i+1}));
 if(installments.length&&Math.round(installments.reduce((s,p)=>s+p.amountPaise,0)/100)!==Math.round(totalPaise/100))fail('installments','Installment total must equal net fee (rounded rupees).');
 const batch=properCase(b.batch).replace(/\b(a\.?\s*m\.?|p\.?\s*m\.?)\b/gi,m=>m.toLowerCase().startsWith('a')?'AM':'PM');
 return{name:properCase(b.name),mobile:b.mobile,guardian:properCase(b.guardian),motherName:properCase(b.motherName),courseId:course.id,course:course.name.toUpperCase(),courseCode:course.code.toUpperCase(),batch,session:admissionSession(admissionDate,b.session||''),admissionDate,status,address:properCase(b.address),cvruRegNo:cvru?(b.cvruRegNo||'').trim().toUpperCase():'',abcId:cvru?(b.abcId||'').trim().toUpperCase():'',debId:cvru?(b.debId||'').trim().toUpperCase():'',addonEnabled,courseFeePaise,discountPaise,addonFeePaise,installments,fee:{currency:'INR',totalPaise,paidPaise:0,duePaise:totalPaise},nextInstallment:installments[0]?{dueDate:installments[0].dueDate,amountPaise:installments[0].amountPaise}:null};
}
export function checkConversion(inquiry,version){if(!inquiry)throw new HttpError(404,'NOT_FOUND','Inquiry was not found.');if(inquiry.status==='converted'||inquiry.studentRecordId)throw new HttpError(409,'ALREADY_CONVERTED','This inquiry is already converted. No new student was created.');if(!Number.isSafeInteger(version)||version!==inquiry.version)throw new HttpError(409,'VERSION_CONFLICT','Reload the inquiry before converting.');}
export function checkCapacity(student,students,batches){if(student.status!=='active'||!student.batch)return;const key=s=>s.trim().toUpperCase(),capacity=batches.find(b=>key(b.batch)===key(student.batch))?.capacity||15;if(students.filter(s=>s.status==='active'&&key(s.batch||'')===key(student.batch)).length>=capacity)throw new HttpError(409,'BATCH_FULL','Batch time is full. Select another batch.');}
