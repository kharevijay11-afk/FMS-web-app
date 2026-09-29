import { esc } from './views.js';

const send = (request, csrf, path, body, method = 'POST') => request(`/api/v1/admin/administration/${path}`, {
  method, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(body),
});

function auditView(data, refresh) {
  return {
    html: `<div class="page-intro"><div><p class="eyebrow">ADMINISTRATION</p><h1>Audit Log</h1><p class="muted">Append-only security and business activity.</p></div></div><form id="audit-filter" class="management-filters"><label>Search<input name="query" maxlength="120"></label><label>Outcome<select name="outcome"><option value="">All</option><option>success</option><option>failure</option></select></label><button class="primary">Apply</button></form><section class="panel"><div class="table-scroll"><table><thead><tr><th>Date</th><th>Action</th><th>Entity</th><th>Role</th><th>Outcome</th><th>Request</th></tr></thead><tbody>${data.items.map((x) => `<tr><td>${esc(String(x.occurredAt))}</td><td>${esc(x.action)}</td><td>${esc(x.entityType)} / ${esc(x.entityId)}</td><td>${esc(x.actorRole || '-')}</td><td>${esc(x.outcome)}</td><td>${esc(x.requestId)}</td></tr>`).join('') || '<tr><td colspan="6">No audit events.</td></tr>'}</tbody></table></div></section>`,
    bind(root) {
      const form = root.querySelector('#audit-filter');
      const params = new URLSearchParams(location.search);
      for (const [key, value] of params) if (form.elements[key]) form.elements[key].value = value;
      form.onsubmit = (event) => { event.preventDefault(); history.replaceState(null, '', `/admin/audit?${new URLSearchParams(new FormData(event.currentTarget))}`); refresh(); };
    },
  };
}

function settingsView(data, request, csrf, refresh) {
  const s = data.settings;
  return {
    html: `<div class="page-intro"><div><p class="eyebrow">ADMINISTRATION</p><h1>Institute Settings</h1></div></div><p id="admin-alert" role="alert"></p><form id="settings-form" class="panel detail-panel"><div class="form-grid"><label>Institute name<input name="instituteName" value="${esc(s.instituteName)}" required></label><label>Phone<input name="phone" value="${esc(s.phone)}"></label><label>Email<input name="email" type="email" value="${esc(s.email)}"></label><label>Student prefix<input name="studentPrefix" value="${esc(s.studentPrefix)}" required></label><label>Receipt prefix<input name="receiptPrefix" value="${esc(s.receiptPrefix)}" required></label><label class="wide">Address<textarea name="address">${esc(s.address)}</textarea></label></div><button class="primary">Save settings</button></form>`,
    bind(root) {
      root.querySelector('#settings-form').onsubmit = async (event) => {
        event.preventDefault();
        try { await send(request, csrf, 'settings', { ...Object.fromEntries(new FormData(event.currentTarget)), version: s.version }, 'PATCH'); await refresh(); }
        catch (error) { root.querySelector('#admin-alert').textContent = error.message; }
      };
    },
  };
}

function backupView(data, request, csrf) {
  return {
    html: `<div class="page-intro"><div><p class="eyebrow">ADMINISTRATION</p><h1>Backup / Restore</h1><p class="muted">Logical exports exclude passwords, MFA secrets, sessions and tokens.</p></div></div><section class="panel detail-panel"><h2>Validated logical backup</h2><p>Created: ${esc(data.createdAt)}</p><p>Source: ${esc(data.source)}</p><button id="download-backup" class="primary">Download JSON backup</button></section><section class="panel detail-panel"><h2>Restore safety boundary</h2><p>Restore files can be validated here. Applying a restore requires a separate maintenance window and database snapshot.</p><input id="restore-file" type="file" accept="application/json,.json"><button id="validate-restore">Validate backup</button><p id="admin-alert" role="alert"></p></section>`,
    bind(root) {
      root.querySelector('#download-backup').onclick = () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob); link.download = `fms-web-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href);
      };
      root.querySelector('#validate-restore').onclick = async () => {
        const file = root.querySelector('#restore-file').files[0]; const alert = root.querySelector('#admin-alert');
        if (!file) { alert.textContent = 'Select a JSON backup.'; return; }
        try { const result = await send(request, csrf, 'restore/validate', JSON.parse(await file.text())); alert.textContent = result.message; }
        catch (error) { alert.textContent = error.message; }
      };
    },
  };
}

function usersView(data, request, csrf, refresh) {
  return {
    html: `<div class="page-intro"><div><p class="eyebrow">ADMINISTRATION</p><h1>Users</h1><p class="muted">Create pending Admin/Staff accounts or block access. Passwords are never displayed.</p></div></div><p id="admin-alert" role="alert"></p><form id="user-form" class="panel detail-panel"><div class="form-grid"><label>Name<input name="name" required maxlength="120"></label><label>User ID<input name="userId" required maxlength="120"></label><label>Role<select name="role"><option value="staff">Staff</option><option value="admin">Admin</option></select></label></div><button class="primary">Create pending account</button></form><section class="panel"><div class="table-scroll"><table><thead><tr><th>User ID</th><th>Name</th><th>Role</th><th>Status</th><th>MFA</th><th>Action</th></tr></thead><tbody>${data.items.map((x) => `<tr><td>${esc(x.userId)}</td><td>${esc(x.name)}</td><td>${esc(x.role)}</td><td>${esc(x.status)}</td><td>${x.mfaEnabled ? 'Enabled' : 'No'}</td><td>${['admin', 'staff'].includes(x.role) ? `<button data-status="${x.status === 'blocked' ? 'active' : 'blocked'}" data-id="${esc(x.id)}">${x.status === 'blocked' ? 'Activate' : 'Block'}</button>` : 'Managed by student workflow'}</td></tr>`).join('')}</tbody></table></div></section>`,
    bind(root) {
      const alert = root.querySelector('#admin-alert');
      const run = async (operation) => { try { await operation(); await refresh(); } catch (error) { alert.textContent = error.message; } };
      root.querySelector('#user-form').onsubmit = (event) => { event.preventDefault(); run(() => send(request, csrf, 'users', Object.fromEntries(new FormData(event.currentTarget)))); };
      root.querySelectorAll('[data-status]').forEach((button) => { button.onclick = () => run(() => send(request, csrf, `users/${encodeURIComponent(button.dataset.id)}/status`, { status: button.dataset.status })); });
    },
  };
}

export async function loadAdministration(kind, { request, csrf, refresh }) {
  const data = await request(`/api/v1/admin/administration/${kind}${kind === 'audit' ? location.search : ''}`);
  if (kind === 'audit') return auditView(data, refresh);
  if (kind === 'settings') return settingsView(data, request, csrf, refresh);
  if (kind === 'backup') return backupView(data, request, csrf);
  return usersView(data, request, csrf, refresh);
}
