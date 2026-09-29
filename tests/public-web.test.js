import test from 'node:test';
import assert from 'node:assert/strict';
import { inquiryPayload, createSubmission } from '../apps/public-web/inquiry.js';
import { renderPage, safeLink } from '../apps/public-web/pages.js';
import { validateInquiry } from '../packages/contracts/src/validation.js';
import { createStep3App } from '../services/api/src/app-step3.js';
import { loadConfig } from '../services/api/src/config-step3.js';
import { createSyntheticStep3Repository } from '../services/api/src/repositories/synthetic-step3.js';
const details={name:'Synthetic Learner',mobile:'9999999999',email:'learner@example.test',course:'Computer Foundations',session:'Sample session',address:'Synthetic address',message:'Test only',consent:'on'};
test('public inquiry adapter preserves existing contract and rejects combined overflow',()=>{
 const payload=inquiryPayload(details); assert.equal(validateInquiry(payload).ok,true);
 assert.deepEqual(Object.keys(payload),['name','mobile','course','message','consent']);
 for(const value of [details.email,details.session,details.address]) assert.ok(payload.message.includes(value));
 assert.throws(()=>inquiryPayload({...details,message:'x'.repeat(500)}),/shorten/);
 assert.equal(validateInquiry(inquiryPayload({...details,mobile:'bad',consent:''})).ok,false);
});
test('public routes resolve and unsafe content links are rejected',()=>{
 const routes=['','about','courses','courses/foundations','courses/office','courses/accounting','student-zone','notices','registration','verify','assignments','projects','practical','gallery','testimonials','results','contact','privacy','terms'];
 for(const route of routes){const html=renderPage(route);assert.ok(html.includes('<h1'));assert.ok(!html.includes('PAGE NOT FOUND'),route);for(const [,target] of html.matchAll(/href="#\/([^"<]*)"/g))assert.ok(!renderPage(target).includes('PAGE NOT FOUND'),target);}
 for(const unsafe of ['javascript:alert(1)','//evil.test','data:text/html,x','http://evil.test'])assert.equal(safeLink(unsafe),null);
 assert.ok(renderPage('verify').includes('does not send or verify'));
});
test('submission blocks overlapping clicks and changed uncertain requests',async()=>{
 let resolve;const send=()=>new Promise(done=>{resolve=done;});const flow=createSubmission(send,()=> 'test-key-001');const payload=inquiryPayload(details);
 const first=flow.submit(payload);await assert.rejects(flow.submit(payload),/already/);
 resolve({ok:false,status:500,json:async()=>({})});await assert.rejects(first,/failed/);
 await assert.rejects(flow.submit({...payload,name:'Changed'}),/uncertain/);
});
test('Step 4 static routes, security and lost-response retry preserve one inquiry',async t=>{
 const config={...loadConfig(),origin:'http://127.0.0.1',port:0};const repo=createSyntheticStep3Repository(config);const server=createStep3App(config,repo);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());const base=`http://127.0.0.1:${server.address().port}`;
 for(const path of ['/','/student','/admin','/apps/public-web/styles.css','/apps/public-web/app.js','/apps/public-web/content.js','/apps/public-web/pages.js','/apps/public-web/inquiry.js']){const result=await fetch(base+path);assert.equal(result.status,200,path);assert.ok(result.headers.get('Content-Security-Policy').includes("script-src 'self'"));}
 let calls=0;const before=(await repo.listInquiries({})).length;
 const flow=createSubmission(async({body,key})=>{calls++;const response=await fetch(base+'/api/v1/inquiries',{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json','Idempotency-Key':key},body});if(calls===1)throw new Error('Simulated response lost after commit');return response;},()=> 'step4-lost-response');
 const payload=inquiryPayload(details);await assert.rejects(flow.submit(payload),/response lost/);const result=await flow.submit(payload);assert.ok(result.inquiry.inquiryNo);
 assert.deepEqual(await flow.submit(payload),result);assert.equal(calls,2);assert.equal((await repo.listInquiries({})).length,before+1);
 const bad=await fetch(base+'/api/v1/inquiries',{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json','Idempotency-Key':'step4-invalid-request'},body:JSON.stringify({...payload,mobile:'invalid',consent:false})});assert.equal(bad.status,422);
});

test('rate-limited uncertain retry retains original idempotency key',async()=>{
 const keys=[];let call=0;const flow=createSubmission(async({key})=>{keys.push(key);call++;if(call===1)throw new Error('Network interruption');if(call===2)return{ok:false,status:429,json:async()=>({error:{message:'Rate limited'}})};return{ok:true,json:async()=>({inquiry:{inquiryNo:'TEST-001'}})};},()=>`key-${keys.length}`);
 const payload=inquiryPayload(details);await assert.rejects(flow.submit(payload));await assert.rejects(flow.submit(payload));await flow.submit(payload);assert.equal(new Set(keys).size,1);await assert.rejects(flow.submit({...payload,name:'Another learner'}),/Start a new inquiry/);
});
