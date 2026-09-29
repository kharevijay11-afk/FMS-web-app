import { validateInquiry } from './validation.js';
export const INQUIRY_STATUSES = ['new','contacted','converted','closed'];
export const STUDENT_STATUSES = ['active','completed','left'];
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export function listOptions(params,type){
  const value={query:params.get('query')||'',course:params.get('course')||'',session:params.get('session')||'',batch:params.get('batch')||'',status:params.get('status')||'',from:params.get('from')||'',to:params.get('to')||'',sort:params.get('sort')||'newest',page:Number(params.get('page')||1),pageSize:Number(params.get('pageSize')||20)};
  const errors=[];
  for(const field of ['query','course','session','batch'])if(value[field].length>160)errors.push({field,message:'Maximum 160 characters.'});
  for(const field of ['from','to'])if(value[field]&&!validDate(value[field]))errors.push({field,message:'Use a valid YYYY-MM-DD date.'});
  if(value.from&&value.to&&value.from>value.to)errors.push({field:'to',message:'End date must be on or after start date.'});
  if(value.status&&!(type==='inquiries'?[...INQUIRY_STATUSES,'pending']:STUDENT_STATUSES).includes(value.status))errors.push({field:'status',message:'Unsupported status.'});
  if(!['newest','oldest'].includes(value.sort))errors.push({field:'sort',message:'Unsupported sort order.'});
  if(!Number.isSafeInteger(value.page)||value.page<1||value.page>100000)errors.push({field:'page',message:'Invalid page.'});
  if(!Number.isSafeInteger(value.pageSize)||value.pageSize<1||value.pageSize>50)errors.push({field:'pageSize',message:'Page size must be 1–50.'});
  return{ok:!errors.length,value,errors};
}
export function validateManagementPatch(body,type){
  const errors=[];const value={};
  const permitted=type==='inquiries'?['name','mobile','course','message','status']:['name','mobile','email','address'];
  if(!body||typeof body!=='object'||Array.isArray(body))return{ok:false,errors:[{field:'body',message:'An object is required.'}]};
  for(const key of Object.keys(body))if(key!=='version'&&!permitted.includes(key))errors.push({field:key,message:'This field cannot be edited here.'});
  if(!Number.isSafeInteger(body.version)||body.version<1)errors.push({field:'version',message:'A valid record version is required.'});
  for(const key of permitted)if(Object.hasOwn(body,key)){
    if(typeof body[key]!=='string'){errors.push({field:key,message:'Text is required.'});continue;}
    value[key]=body[key].trim();
  }
  if(type==='inquiries'){
    const check=validateInquiry({name:value.name??'Valid Name',mobile:value.mobile??'9999999999',course:value.course??'Valid Course',message:value.message??'',consent:true});
    errors.push(...check.errors);if(Object.hasOwn(value,'mobile'))value.mobile=check.value.mobile;
    if(value.status&&!INQUIRY_STATUSES.includes(value.status))errors.push({field:'status',message:'Unsupported inquiry status.'});
    if(Object.hasOwn(value,'status')&&!value.status)errors.push({field:'status',message:'A status is required.'});
  }else{
    if(Object.hasOwn(value,'name')&&(value.name.length<2||value.name.length>120))errors.push({field:'name',message:'Name must be 2–120 characters.'});
    if(Object.hasOwn(value,'mobile')){value.mobile=value.mobile.replace(/[\s()-]/g,'');if(value.mobile&&!/^\+?[0-9]{10,15}$/.test(value.mobile))errors.push({field:'mobile',message:'Enter 10–15 digits.'});}
    if(value.email&&(value.email.length>254||!/^\S+@\S+\.\S+$/.test(value.email)))errors.push({field:'email',message:'Enter a valid email.'});
    if(value.address?.length>500)errors.push({field:'address',message:'Address must not exceed 500 characters.'});
  }
  if(!Object.keys(value).length)errors.push({field:'body',message:'Provide at least one editable field.'});
  return{ok:!errors.length,value,version:body.version,errors};
}
