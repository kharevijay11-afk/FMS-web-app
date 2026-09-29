import { esc, money } from './views.js';

const labels = { notices: 'Notices', reminders: 'Due Reminders', certificates: 'Certificates', 'id-cards': 'ID Cards' };
const table = (heads, body) => `<section class="panel"><div class="table-scroll"><table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body || `<tr><td colspan="${heads.length}" class="empty">No records found.</td></tr>`}</tbody></table></div></section>`;
const options = (students, prompt = false) => `${prompt ? '<option value="">Select student</option>' : ''}${students.map((s) => `<option value="${esc(s.id)}">${esc(s.studentId)} - ${esc(s.name)} - ${esc(s.course)}</option>`).join('')}`;
const post = (request, csrf, path, body) => request(`/api/v1/admin/step6e/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(body) });

export function whatsappNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `91${digits.slice(1)}`;
  return /^\d{11,15}$/.test(digits) ? digits : '';
}

export function whatsappUrl(mobile, message) {
  const phone = whatsappNumber(mobile);
  return phone && String(message || '').trim() ? `https://wa.me/${phone}?text=${encodeURIComponent(String(message).trim())}` : '';
}

function reminderMessage(row) {
  return `Namaste ${row.studentName},\n\nAapki fee ${money(row.amountPaise)} ${row.status === 'overdue' ? 'overdue' : 'due soon'} hai. Due date: ${row.dueDate}.\n\nKripya institute se sampark karein.\nFMS`;
}

function openWhatsApp(mobile, message, alert) {
  const url = whatsappUrl(mobile, message);
  if (!url) {
    alert.textContent = mobile ? 'WhatsApp message is empty.' : 'A valid student mobile number is required.';
    return;
  }
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) alert.textContent = 'Popup was blocked. Allow popups for this site and retry.';
  else alert.textContent = 'WhatsApp opened with a pre-filled message. Review it and press Send manually.';
}

export async function loadStep6E(kind, { request, csrf, refresh }) {
  const data = await request(`/api/v1/admin/step6e?kind=${encodeURIComponent(kind)}`);
  if (kind === 'reminders') {
    const students = await request('/api/v1/admin/students?pageSize=100');
    const mobileById = new Map(students.items.map((s) => [s.id, s.mobile]));
    data.items = data.items.map((row) => ({ ...row, mobile: row.mobile || mobileById.get(row.studentRecordId) || null }));
  }

  let controls = '';
  let content = '';
  if (kind === 'notices') {
    controls = `<form id="notice-form" class="panel detail-panel"><h2>Create notice</h2><div class="form-grid"><label>Title<input name="title" required maxlength="160"></label><label>Audience<select name="targetType"><option value="active">All active students</option><option value="course">Active students in course</option><option value="session">Active students in session</option><option value="students">Selected active students</option></select></label><label>Course/session value<input name="targetValue" maxlength="160"></label><label class="wide">Selected students<select name="studentIds" multiple size="5">${options(data.students)}</select></label><label class="wide">Message<textarea name="message" required maxlength="2000" rows="5"></textarea></label><label>Open WhatsApp for<select name="whatsappStudentId"><option value="">Select one active student</option>${options(data.students)}</select></label></div><div class="form-actions"><button class="primary" type="submit">Save notice history</button><button id="open-notice-whatsapp" type="button">Open in WhatsApp</button></div><p class="muted">WhatsApp opens with a pre-filled message. Review it and press Send manually; opening it does not record delivery.</p></form>`;
    content = table(['Created', 'Title', 'Target', 'Recipients', 'Status'], data.items.map((n) => `<tr><td>${esc(String(n.createdAt).slice(0, 10))}</td><td>${esc(n.title)}</td><td>${esc(n.target.type)}${n.target.value ? ` - ${esc(n.target.value)}` : ''}</td><td>${esc(n.recipientCount)}</td><td>${esc(n.status)}</td></tr>`).join(''));
  }
  if (kind === 'reminders') {
    content = table(['Student', 'Course', 'Due date', 'Cumulative due', 'Status', 'Action'], data.items.map((r, index) => `<tr><td>${esc(r.studentId)} - ${esc(r.studentName)}</td><td>${esc(r.course)}</td><td>${esc(r.dueDate)}</td><td>${money(r.amountPaise)}</td><td>${esc(r.status)}</td><td><div class="form-actions"><button class="record-reminder" data-id="${esc(r.studentRecordId)}" data-date="${esc(data.asOf)}">Record reminder</button><button class="open-reminder-whatsapp" data-index="${index}" type="button" ${r.mobile ? '' : 'disabled title="No valid mobile number"'}>Open in WhatsApp</button></div></td></tr>`).join('')) + table(['Recorded', 'Student', 'Due date', 'Amount', 'Delivery', 'WhatsApp'], data.history.map((r) => `<tr><td>${esc(String(r.recordedAt).slice(0, 10))}</td><td>${esc(r.studentId)} - ${esc(r.studentName)}</td><td>${esc(r.dueDate)}</td><td>${money(r.amountPaise)}</td><td>${esc(r.deliveryStatus)}</td><td>${esc(r.whatsappStatus)}</td></tr>`).join(''));
  }
  if (kind === 'certificates') {
    controls = `<form id="certificate-form" class="panel detail-panel"><h2>Issue certificate</h2><div class="form-grid"><label>Student<select name="studentRecordId" required>${options(data.students, true)}</select></label><label>Type<select name="type"><option value="main">Main course - 100%</option><option value="data-entry">CVRU Data Entry - 40%</option><option value="ms-office">CVRU MS Office - 50%</option><option value="accounting-tally">CVRU Accounting/Tally - 60%</option></select></label><label>Issue date<input name="issueDate" type="date" required></label><label>Certificate number<input name="certificateNumber" required maxlength="100"></label></div><button class="primary">Issue after eligibility check</button></form>`;
    content = table(['Number', 'Student', 'Type', 'Issue date', 'Gate', 'Status', 'Print'], data.items.map((c) => `<tr><td>${esc(c.certificateNumber)}</td><td>${esc(c.studentId)} - ${esc(c.studentName)}</td><td>${esc(c.type)}</td><td>${esc(c.issueDate)}</td><td>${esc(c.thresholdPercent)}%</td><td>${esc(c.status)}</td><td><a class="button" target="_blank" rel="noopener" href="/api/v1/admin/step6e/certificates/${encodeURIComponent(c.id)}/document">Open print layout</a></td></tr>`).join(''));
  }
  if (kind === 'id-cards') {
    controls = `<form id="id-card-form" class="panel detail-panel"><h2>Issue ID card</h2><div class="form-grid"><label>Active student<select name="studentRecordId" required>${options(data.students, true)}</select></label><label>Issue date<input name="issueDate" type="date" required></label></div><button class="primary">Create issue record</button></form>`;
    content = table(['Student', 'Course', 'Issue date', 'Status', 'Print count', 'Last print', 'Action'], data.items.map((c) => `<tr><td>${esc(c.studentId)} - ${esc(c.studentName)}</td><td>${esc(c.course)}</td><td>${esc(c.issueDate)}</td><td>${esc(c.status)}</td><td>${esc(c.printCount)}</td><td>${esc(c.lastPrintedAt || 'Never')}</td><td><div class="form-actions"><a class="button" target="_blank" rel="noopener" href="/api/v1/admin/step6e/id-cards/${encodeURIComponent(c.id)}/document">Open print layout</a><button class="record-print" data-id="${esc(c.id)}">Record print</button></div></td></tr>`).join(''));
  }

  return {
    html: `<div class="page-intro"><div><p class="eyebrow">COMMUNICATIONS & DOCUMENTS</p><h1>${labels[kind]}</h1><p class="muted">Rules and history are enforced server-side. WhatsApp opens manually; no automatic delivery is claimed.</p></div><span class="source-badge">Controlled integration</span></div><p id="step6e-alert" role="alert"></p>${controls}${content}`,
    bind(root) {
      const alert = root.querySelector('#step6e-alert');
      const run = async (fn) => { try { await fn(); refresh(); } catch (error) { alert.textContent = error.message; } };
      const noticeForm = root.querySelector('#notice-form');
      noticeForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const type = form.get('targetType');
        const selected = [...event.currentTarget.elements.studentIds.selectedOptions].map((option) => option.value);
        run(() => post(request, csrf, 'notices', { title: form.get('title'), message: form.get('message'), target: { type, ...(['course', 'session'].includes(type) ? { value: form.get('targetValue') } : { studentIds: selected }) } }));
      });
      root.querySelector('#open-notice-whatsapp')?.addEventListener('click', () => {
        const id = noticeForm.elements.whatsappStudentId.value;
        const student = data.students.find((item) => item.id === id);
        openWhatsApp(student?.mobile, noticeForm.elements.message.value, alert);
      });
      root.querySelectorAll('.record-reminder').forEach((button) => { button.onclick = () => run(() => post(request, csrf, 'reminders', { studentRecordId: button.dataset.id, asOf: button.dataset.date })); });
      root.querySelectorAll('.open-reminder-whatsapp').forEach((button) => { button.onclick = () => { const row = data.items[Number(button.dataset.index)]; openWhatsApp(row.mobile, reminderMessage(row), alert); }; });
      root.querySelector('#certificate-form')?.addEventListener('submit', (event) => { event.preventDefault(); run(() => post(request, csrf, 'certificates', Object.fromEntries(new FormData(event.currentTarget)))); });
      root.querySelector('#id-card-form')?.addEventListener('submit', (event) => { event.preventDefault(); run(() => post(request, csrf, 'id-cards', Object.fromEntries(new FormData(event.currentTarget)))); });
      root.querySelectorAll('.record-print').forEach((button) => { button.onclick = () => run(() => post(request, csrf, `id-cards/${encodeURIComponent(button.dataset.id)}/print`, {})); });
    },
  };
}
