import { sections, escape, renderStudentPage } from './views.js';
const q=selector=>document.querySelector(selector);
let csrf='',student=null,portal=null,epoch=0,loading=false;
async function call(path,options={}) {
 const response=await fetch(`/api/v1${path}`,{cache:'no-store',...options});
 const body=await response.json();
 if(!response.ok){const error=new Error(body.error?.message||'Request failed. Please try again.');error.status=response.status;if(response.status===401&&student)clearSession('Your session expired. Please sign in again.');throw error;}
 return body;
}
const post=(path,body)=>call(path,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},...(body===undefined?{}:{body:JSON.stringify(body)})});
function clearSession(message='') {
 epoch++;csrf='';student=null;portal=null;q('#page').replaceChildren();q('#student-name').textContent='';q('#portal-status').textContent='';q('#source-note').textContent='';q('#portal').hidden=true;q('#login-panel').hidden=false;q('#login-status').textContent=message;
 q('#login-form [name=password]').value='';q('#token-confirm [name=token]').value='';q('#token-confirm [name=password]').value='';q('#sidebar').classList.remove('open');
}
function section(){return location.hash.startsWith('#/')?location.hash.slice(2):'dashboard';}
function render(focus=true) {
 if(!student)return;
 const current=section();q('#page-title').textContent=sections.find(([id])=>id===current)?.[1]||'Section unavailable';
 q('#page').innerHTML=renderStudentPage(current,student,portal||{});
 q('#student-navigation').querySelectorAll('a').forEach(a=>{if(a.getAttribute('href')===`#/${current}`)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 q('#sidebar').classList.remove('open');q('#menu').setAttribute('aria-expanded','false');q('#portal-status').textContent='';
 document.title=`${q('#page-title').textContent} | Student Portal`;
 if(focus){q('#page-title').focus();window.scrollTo(0,0);}
}
async function loadPortal() {
 const turn=epoch;
 q('#login-status').textContent='Loading your student records…';
 const summary=await call('/students/me/summary');
 if(!summary.student)throw new Error('Your student record is not available. Contact the institute.');
 const detail=await call('/students/me/portal');
 if(turn!==epoch)return;
 student=summary.student;portal=detail.portal;
 q('#student-name').textContent=student.name;
 q('#source-note').textContent=portal.source==='synthetic'?`Synthetic demonstration · Snapshot ${portal.asOf}. Not a live student ledger.`:portal.message||'Student records supplied by the institute.';
 q('#login-panel').hidden=true;q('#portal').hidden=false;q('#login-form [name=password]').value='';render();
}
q('#student-navigation').innerHTML=sections.map(([id,title])=>`<a href="#/${id}">${escape(title)}</a>`).join('');
q('#menu').addEventListener('click',()=>{const open=q('#menu').getAttribute('aria-expanded')!=='true';q('#menu').setAttribute('aria-expanded',String(open));q('#sidebar').classList.toggle('open',open);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){q('#sidebar').classList.remove('open');q('#menu').setAttribute('aria-expanded','false');}});
q('#login-form').addEventListener('submit',async event=>{
 event.preventDefault();if(loading)return;loading=true;const button=event.currentTarget.querySelector('button');button.disabled=true;
 try {q('#login-status').textContent='Signing in…';const result=await post('/auth/login',Object.fromEntries(new FormData(event.currentTarget)));if(result.user?.role!=='student')throw new Error('Use a student account here. Staff and admin access remains in the Admin Panel.');csrf=result.csrfToken;await loadPortal();}
 catch(error){q('#login-status').textContent=error.message;}finally{loading=false;button.disabled=false;}
});
async function logout(recovery=false) {
 const button=q('#logout');button.disabled=true;
 try {await post('/auth/logout');clearSession('You have signed out.');if(recovery){q('#recovery').open=true;q('#token-request [name=kind]').value='recovery';q('#token-confirm [name=kind]').value='recovery';q('#token-request [name=userId]').focus();}}
 catch(error){q('#portal-status').textContent=error.message;}finally{button.disabled=false;}
}
q('#logout').addEventListener('click',()=>logout());
q('#page').addEventListener('click',async event=>{
 const notice=event.target.closest('[data-notice]'),receipt=event.target.closest('[data-receipt]');
 if(event.target.closest('#recover-entry'))return logout(true);
 if(!notice&&!receipt)return;
 const button=notice||receipt;button.disabled=true;const turn=epoch;q('#portal-status').textContent='Please wait…';
 try {
  if(notice){await post(`/students/me/notices/${encodeURIComponent(notice.dataset.notice)}/read`);const updated=await call('/students/me/portal');if(turn!==epoch)return;portal=updated.portal;render(false);q('#portal-status').textContent='Notice marked as read.';}
  else {await call(`/students/me/receipts/${encodeURIComponent(receipt.dataset.receipt)}/document`);}
 }catch(error){if(turn===epoch)q('#portal-status').textContent=error.message;}finally{button.disabled=false;}
});
for(const [id,handler] of [['token-request',async form=>{
 const data=new FormData(form),kind=data.get('kind');q('#token-confirm [name=kind]').value=kind;q('#token-confirm [name=token]').value='';
 const result=await post(`/auth/${kind==='activation'?'student/activation':'recovery'}/request`,{userId:data.get('userId')});
 if(result.syntheticToken)q('#token-confirm [name=token]').value=result.syntheticToken;
 q('#token-status').textContent=result.syntheticToken?'Synthetic mode: a demonstration token was placed in the form.':'Request accepted. If your account is eligible, follow the institute’s recovery instructions. Delivery integration may be pending.';
}],['token-confirm',async form=>{
 const data=new FormData(form),kind=data.get('kind');await post(`/auth/${kind==='activation'?'student/activation':'recovery'}/confirm`,{token:data.get('token'),password:data.get('password')});
 form.reset();q('#token-status').textContent='Password set. Sign in with your student account.';
}]])q(`#${id}`).addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;q('#token-status').textContent='Please wait…';try{await handler(form);}catch(error){q('#token-status').textContent=error.message;}finally{button.disabled=false;}});
window.addEventListener('hashchange',()=>{if(location.hash!=='#content')render();});
// Re-authenticate after a full reload: the existing API issues CSRF only at login.
// Do not persist CSRF, student data or credentials in browser storage.
window.addEventListener('pagehide',()=>clearSession());
window.addEventListener('pageshow',event=>{if(event.persisted)clearSession('Please sign in again.');});
