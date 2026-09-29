// Adapt public presentation fields to the unchanged Step 3 inquiry contract.
export function inquiryPayload(values) {
 const clean = key => String(values[key] ?? '').trim();
 const message = [['Email',clean('email')],['Session',clean('session')],['Address',clean('address')],['Requirement',clean('message')]].filter(([,value])=>value).map(([key,value])=>`${key}: ${value}`).join('\n');
 if (message.length > 500) throw new Error(`Please shorten your details by ${message.length-500} characters. Email, session, address and message must fit within 500 characters together.`);
 return { name:clean('name'), mobile:clean('mobile'), course:clean('course'), message, consent:values.consent === 'on' };
}
// Retain the same key and exact payload after an uncertain response. No personal data
// is stored in browser storage; only this page's in-memory request is retained.
export function createSubmission(send, makeKey = () => crypto.randomUUID()) {
 let pending = null, complete = null, busy = false;
 return {
  get completed() { return complete; },
  reset() { if (!busy) { pending = null; complete = null; } },
  async submit(payload) {
   if (busy) throw new Error('Your inquiry is already being submitted.');
   if (complete) { if (pending.body !== JSON.stringify(payload)) throw new Error('Your previous inquiry was submitted. Choose Start a new inquiry to send different details.'); return complete; }
   const body = JSON.stringify(payload);
   if (pending && pending.body !== body) throw new Error('The previous submission has an uncertain result. Retry with the original details before starting another inquiry.');
   pending ??= { body, key:makeKey() };
   busy = true;
   try {
    const response = await send(pending);
    const result = await response.json();
    if (!response.ok) {
     if ([400,403,413,415,422].includes(response.status)) pending = null;
     throw new Error(result.error?.details?.map(item=>item.message).join(' ') || result.error?.message || 'Submission failed. Retry with the same details.');
    }
    if (!result.inquiry?.inquiryNo) throw new Error('Unexpected response. Retry with the same details.');
    complete = result; return result;
   } finally { busy = false; }
  }
 };
}
let inquiryDraft = null;
export function bindInquiry(form, submission) {
  const status = form.querySelector('#form-status'), submit = form.querySelector('[type=submit]'), restart = form.querySelector('#new-inquiry');
 if (inquiryDraft) for (const [name,value] of Object.entries(inquiryDraft)) { const input=form.elements.namedItem(name); if(input) { if(input.type==='checkbox') input.checked=value==='on'; else input.value=value; } }
 form.addEventListener('input',()=>{inquiryDraft=Object.fromEntries(new FormData(form));});
 if (submission.completed) { form.querySelectorAll('input, textarea, select').forEach(input=>input.disabled=true); submit.disabled=true; restart.hidden=false; status.textContent=`Your development inquiry ${submission.completed.inquiry.inquiryNo} was submitted. You can start a new inquiry below.`; }
 form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  try {
   const payload = inquiryPayload(Object.fromEntries(new FormData(form)));
   submit.disabled = true; status.textContent = 'Submitting your inquiry…';
   const result = await submission.submit(payload);
   status.textContent = `Thank you. Your development inquiry reference is ${result.inquiry.inquiryNo}. This is not an admission confirmation.`;
   form.querySelectorAll('input, textarea, select').forEach(input=>input.disabled=true);
   restart.hidden = false;
  } catch (error) { status.textContent = error.message; submit.disabled = false; }
 });
 restart.addEventListener('click',()=>{
  submission.reset(); inquiryDraft=null; form.reset(); form.querySelectorAll('input, textarea, select').forEach(input=>input.disabled=false);
  submit.disabled=false; restart.hidden=true; status.textContent=''; form.elements.name.focus();
 });
}

