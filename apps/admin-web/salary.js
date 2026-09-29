import { esc, money } from './views.js';

const input = (label, name, value = '', type = 'text', attrs = '') =>
  `<label>${label}<input name="${name}" value="${esc(value)}" type="${type}" ${attrs}></label>`;

export async function loadSalary({ request, csrf, refresh }) {
  const params = new URLSearchParams(location.search);
  const data = await request(`/api/v1/admin/salary?${params}`);
  const row = data.items.find((item) => item.id === params.get('edit'));
  const staffOptions = `<option value="">Select staff/admin</option>${data.staff.map((item) =>
    `<option value="${esc(item.id)}" ${item.id === row?.staffUserId ? 'selected' : ''}>${esc(item.name)} (${esc(item.role)})</option>`).join('')}`;
  const modes = ['Cash', 'Online', 'UPI', 'Bank', 'Cheque'];
  const statuses = ['pending', 'partial', 'paid', 'void'];

  return {
    html: `<div class="page-intro"><div><p class="eyebrow">STAFF PAYROLL</p><h1>Staff Salary</h1><p class="muted">Net ${money(data.summary.netPaise)} - Paid ${money(data.summary.paidPaise)} - Due ${money(data.summary.duePaise)}</p></div></div>
      <p id="salary-alert" role="alert"></p>
      <form id="salary-form" class="panel detail-panel"><h2>${row ? 'Edit' : 'Add'} salary record</h2><div class="form-grid">
        <label>Staff / Admin<select name="staffUserId" required>${staffOptions}</select></label>
        ${input('Salary month', 'salaryMonth', row?.salaryMonth || new Date().toISOString().slice(0, 7), 'month', 'required')}
        ${input('Gross salary (₹)', 'grossAmount', row ? row.grossPaise / 100 : '', 'number', 'min="0.01" step="0.01" required')}
        ${input('Absent days', 'absentDays', row?.absentDays || 0, 'number', 'min="0" step="0.5" required')}
        ${input('Advance (₹)', 'advanceAmount', row ? row.advancePaise / 100 : 0, 'number', 'min="0" step="0.01" required')}
        ${input('Paid amount (₹)', 'paidAmount', row ? row.paidPaise / 100 : 0, 'number', 'min="0" step="0.01" required')}
        ${input('Payment date', 'paymentDate', row?.paymentDate || new Date().toISOString().slice(0, 10), 'date', 'required')}
        <label>Mode<select name="paymentMode">${modes.map((mode) => `<option ${mode === row?.paymentMode ? 'selected' : ''}>${mode}</option>`).join('')}</select></label>
        <label class="wide">Notes<textarea name="notes" maxlength="500">${esc(row?.notes || '')}</textarea></label>
      </div><div class="form-actions"><button class="primary">Save salary</button>${row ? '<button id="cancel-salary" type="button">Cancel</button>' : ''}</div></form>
      <form id="salary-filter" class="management-filters">
        ${input('Search', 'query', params.get('query') || '', 'search')}${input('Month', 'month', params.get('month') || '', 'month')}
        <label>Status<select name="status"><option value="">All</option>${statuses.map((status) => `<option ${status === params.get('status') ? 'selected' : ''}>${status}</option>`).join('')}</select></label>
        <button class="primary">Apply</button>
      </form>
      <section class="panel"><div class="table-scroll"><table><thead><tr><th>No.</th><th>Staff</th><th>Month</th><th>Gross</th><th>Absent</th><th>Advance</th><th>Net</th><th>Paid</th><th>Due</th><th>Status</th><th>Action</th></tr></thead><tbody>
        ${data.items.map((item) => `<tr><td>${esc(item.salaryNumber)}</td><td>${esc(item.staffName)}</td><td>${esc(item.salaryMonth)}</td><td>${money(item.grossPaise)}</td><td>${esc(item.absentDays)}</td><td>${money(item.advancePaise)}</td><td>${money(item.netPaise)}</td><td>${money(item.paidPaise)}</td><td>${money(item.duePaise)}</td><td>${esc(item.status)}</td><td>${item.status !== 'void' ? `<button data-edit="${esc(item.id)}">Edit</button><button class="danger-outline" data-void="${esc(item.id)}" data-version="${item.version}">Void</button>` : 'History preserved'}</td></tr>`).join('') || '<tr><td colspan="11">No salary records.</td></tr>'}
      </tbody></table></div></section>`,
    bind(root) {
      const alert = root.querySelector('#salary-alert');
      const run = async (operation) => { try { await operation(); await refresh(); } catch (error) { alert.textContent = error.message; } };
      root.querySelector('#salary-form').onsubmit = (event) => {
        event.preventDefault();
        const body = Object.fromEntries(new FormData(event.currentTarget));
        if (row) body.version = row.version;
        run(() => request(`/api/v1/admin/salary${row ? `/${encodeURIComponent(row.id)}` : ''}`, { method: row ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(body) }));
      };
      root.querySelector('#salary-filter').onsubmit = (event) => {
        event.preventDefault();
        history.replaceState(null, '', `/admin/salary?${new URLSearchParams(new FormData(event.currentTarget))}`);
        refresh();
      };
      root.querySelectorAll('[data-edit]').forEach((button) => { button.onclick = () => { params.set('edit', button.dataset.edit); history.replaceState(null, '', `/admin/salary?${params}`); refresh(); }; });
      root.querySelector('#cancel-salary')?.addEventListener('click', () => { params.delete('edit'); history.replaceState(null, '', `/admin/salary?${params}`); refresh(); });
      root.querySelectorAll('[data-void]').forEach((button) => { button.onclick = () => { if (confirm('Void salary record? History will be preserved.')) run(() => request(`/api/v1/admin/salary/${encodeURIComponent(button.dataset.void)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ version: Number(button.dataset.version) }) })); }; });
    },
  };
}
