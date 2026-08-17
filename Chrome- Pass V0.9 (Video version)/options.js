let masterPassword = null;
let allCredentials  = [];
let deleteTargetId  = null;
let securityFlags   = {};

function sendMessage(action, data = {}) {
  return new Promise(resolve => chrome.runtime.sendMessage({ action, ...data }, resolve));
}

// ── INIT ──
async function init() {
const s = await chrome.storage.session.get('cp_master');
const saved = s.cp_master;
  if (saved) { masterPassword = saved; showShell(); await loadVault(); await loadLockTimeout(); return; }
  showGate();
}

function showGate()  { document.getElementById('gate').classList.remove('hidden'); document.getElementById('shell').classList.add('hidden'); }
function showShell() { document.getElementById('gate').classList.add('hidden');    document.getElementById('shell').classList.remove('hidden'); }

// ── GATE ──
document.getElementById('gate-btn').addEventListener('click', async () => {
  const pass  = document.getElementById('gate-password').value;
  const errEl = document.getElementById('gate-error');
  errEl.classList.add('hidden');
  const res = await sendMessage('verifyPassword', { masterPassword: pass });
  if (res?.success && res.result === true) {
    masterPassword = pass;
await chrome.storage.session.set({ cp_master: pass });
    showShell();
    await loadVault();
    await loadLockTimeout();
  } else {
    errEl.textContent = 'Incorrect master password';
    errEl.classList.remove('hidden');
  }
});
document.getElementById('gate-password').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('gate-btn').click(); });

// ── LOCK ──
document.getElementById('sidebar-lock').addEventListener('click', async () => {
  masterPassword = null;
await chrome.storage.session.remove('cp_master');
  allCredentials = [];
  securityFlags  = {};
  sendMessage('lock');
  showGate();
});

// ── NAV ──
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.panel).classList.add('active');
  });
});

// ── VAULT ──
async function loadVault() {
  const res = await sendMessage('getVault', { masterPassword });
  if (!res?.success) { showToast('Failed to load vault', 'error'); return; }
  allCredentials = res.result?.credentials || [];
  renderCredentials(allCredentials);
  updateCount();
}

function updateCount() {
  document.getElementById('vault-count').textContent =
    `${allCredentials.length} saved credential${allCredentials.length !== 1 ? 's' : ''}`;
}

// ── RENDER ──
function renderCredentials(creds) {
  const list = document.getElementById('credentials-list');
  if (!creds.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🔐</div><p>No credentials yet — click <strong>+ Add</strong> to get started</p></div>';
    return;
  }
  list.innerHTML = creds.map(credRowHTML).join('');

  list.querySelectorAll('.cred-row-head').forEach(h => {
    h.addEventListener('click', () => h.closest('.cred-row').classList.toggle('open'));
  });
  list.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openEditModal(b.dataset.id); }));
  list.querySelectorAll('.btn-del' ).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openDeleteModal(b.dataset.id); }));
  list.querySelectorAll('.btn-tiny').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      if (b.classList.contains('btn-copy-field')) {
        navigator.clipboard.writeText(b.dataset.val || '').then(() => showToast('Copied!'));
      }
      if (b.classList.contains('btn-toggle-pw')) {
        const span = b.closest('.detail-value').querySelector('span');
        const cred = allCredentials.find(c => c.id === b.dataset.id);
        span.textContent = span.textContent === '••••••••••' ? cred.password : '••••••••••';
      }
    });
  });
}

function credRowHTML(c) {
  const flags = securityFlags[c.id] || [];
  const badges = flags.map(f => `<span class="badge-warn${f==='breach'?' badge-breach':''}">${f}</span>`).join('');
  const fav = faviconHTML(c.url, c.name);
  return `
  <div class="cred-row${flags.length?' has-warning':''}" data-id="${c.id}">
    <div class="cred-row-head">
      <div class="cred-favicon">${fav}</div>
      <div class="cred-head-info">
        <div class="cred-row-name">${esc(c.name || c.url)}</div>
        <div class="cred-row-user">${esc(c.username)}</div>
      </div>
      <div class="cred-row-badges">${badges}</div>
      <span class="cred-chevron">▼</span>
    </div>
    <div class="cred-row-body">
      <div class="detail-grid">
        <div class="detail-field"><label>Username</label>
          <div class="detail-value"><span>${esc(c.username)}</span>
            <button class="btn-tiny btn-copy-field" data-val="${esc(c.username)}" title="Copy">📋</button></div></div>
        <div class="detail-field"><label>Password</label>
          <div class="detail-value"><span>••••••••••</span>
            <button class="btn-tiny btn-toggle-pw" data-id="${c.id}" title="Show">👁️</button>
            <button class="btn-tiny btn-copy-field" data-val="${esc(c.password)}" title="Copy">📋</button></div></div>
        <div class="detail-field"><label>URL</label>
          <div class="detail-value"><span>${esc(c.url)}</span>
            <button class="btn-tiny btn-copy-field" data-val="${esc(c.url)}" title="Copy">📋</button></div></div>
        <div class="detail-field"><label>Modified</label>
          <div class="detail-value" style="font-family:inherit;font-size:11px"><span>${new Date(c.modified).toLocaleDateString()}</span></div></div>
      </div>
      ${c.note ? `<div class="detail-field" style="margin-bottom:10px"><label class="form-label">Note</label><div class="detail-note">${esc(c.note)}</div></div>` : ''}
      <div class="cred-actions">
        <button class="btn-edit" data-id="${c.id}">✏️ Edit</button>
        <button class="btn-del"  data-id="${c.id}">🗑 Delete</button>
      </div>
    </div>
  </div>`;
}

// ── SEARCH ──
document.getElementById('search-input').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  renderCredentials(allCredentials.filter(c =>
    (c.name||'').toLowerCase().includes(q) ||
    (c.username||'').toLowerCase().includes(q) ||
    (c.url||'').toLowerCase().includes(q)
  ));
});

// ── ADD ──
document.getElementById('add-btn').addEventListener('click', () => {
  document.getElementById('modal-cred-title').textContent = 'Add Credential';
  document.getElementById('cred-edit-id').value = '';
  ['cred-name','cred-url','cred-username','cred-password','cred-note'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('modal-cred-error').classList.add('hidden');
  document.getElementById('modal-delete-btn').classList.add('hidden');
  document.getElementById('modal-sbar').style.width = '0%';
  document.getElementById('modal-slabel').innerHTML = '&nbsp;';
  openModal('modal-cred');
});

function openEditModal(id) {
  const c = allCredentials.find(x => x.id === id);
  if (!c) return;
  document.getElementById('modal-cred-title').textContent = 'Edit Credential';
  document.getElementById('cred-edit-id').value    = c.id;
  document.getElementById('cred-name').value       = c.name || '';
  document.getElementById('cred-url').value        = c.url || '';
  document.getElementById('cred-username').value   = c.username || '';
  document.getElementById('cred-password').value   = c.password || '';
  document.getElementById('cred-note').value       = c.note || '';
  document.getElementById('modal-cred-error').classList.add('hidden');
  document.getElementById('modal-delete-btn').classList.remove('hidden');
  updateStrength(c.password || '');
  openModal('modal-cred');
}

document.getElementById('save-cred-btn').addEventListener('click', async () => {
  const id    = document.getElementById('cred-edit-id').value;
  const errEl = document.getElementById('modal-cred-error');
  errEl.classList.add('hidden');
  const input = {
    name:     document.getElementById('cred-name').value.trim(),
    url:      document.getElementById('cred-url').value.trim(),
    username: document.getElementById('cred-username').value.trim(),
    password: document.getElementById('cred-password').value,
    note:     document.getElementById('cred-note').value.trim(),
  };
  if (!input.name)     return showFieldError(errEl, 'Name is required');
  if (!input.url)      return showFieldError(errEl, 'URL is required');
  if (!input.username) return showFieldError(errEl, 'Username is required');
  if (!input.password) return showFieldError(errEl, 'Password is required');

  const action = id ? 'editCredential' : 'addCredential';
  const data   = id ? { masterPassword, id, input } : { masterPassword, input };
  const res    = await sendMessage(action, data);
  if (res?.success) {
    closeModal('modal-cred');
    showToast(id ? 'Credential updated ✓' : 'Credential added ✓', 'success');
    await loadVault();
  } else {
    showFieldError(errEl, res?.error || 'Save failed');
  }
});

function showFieldError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }

// ── DELETE ──
function openDeleteModal(id) {
  const c = allCredentials.find(x => x.id === id);
  if (!c) return;
  deleteTargetId = id;
  document.getElementById('delete-cred-name').textContent = c.name || c.url;
  openModal('modal-delete');
}

document.getElementById('modal-delete-btn').addEventListener('click', () => {
  closeModal('modal-cred');
  const id = document.getElementById('cred-edit-id').value;
  if (id) { deleteTargetId = id; const c = allCredentials.find(x => x.id === id); document.getElementById('delete-cred-name').textContent = c?.name || c?.url || ''; openModal('modal-delete'); }
});

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
  if (!deleteTargetId) return;
  const res = await sendMessage('deleteCredential', { masterPassword, id: deleteTargetId });
  if (res?.success) { closeModal('modal-delete'); showToast('Credential deleted'); deleteTargetId = null; await loadVault(); }
  else showToast('Delete failed', 'error');
});

// ── PASSWORD VISIBILITY & STRENGTH ──
document.getElementById('toggle-pass-vis').addEventListener('click', () => {
  const inp = document.getElementById('cred-password');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});
document.getElementById('cred-password').addEventListener('input', e => updateStrength(e.target.value));

function updateStrength(pw) {
  const bar = document.getElementById('modal-sbar');
  const lbl = document.getElementById('modal-slabel');
  if (!pw) { bar.style.width = '0%'; lbl.innerHTML = '&nbsp;'; return; }
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 14) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  const levels = [
    { w:'20%', c:'#f38ba8', t:'Very weak' },
    { w:'40%', c:'#fab387', t:'Weak'      },
    { w:'60%', c:'#f9e2af', t:'Fair'      },
    { w:'80%', c:'#a6e3a1', t:'Strong'    },
    { w:'100%',c:'#94e2d5', t:'Very strong'},
  ];
  const l = levels[Math.min(score, 4)];
  bar.style.width = l.w; bar.style.background = l.c;
  lbl.textContent = l.t; lbl.style.color = l.c;
}

// ── GENERATE INTO MODAL ──
document.getElementById('gen-for-cred').addEventListener('click', () => {
  try {
    const pass = passwordGeneration({ size: 16, upper: true, digits: true, symbols: false });
    const inp  = document.getElementById('cred-password');
    inp.value = pass; inp.type = 'text';
    updateStrength(pass);
  } catch { showToast('Generator error', 'error'); }
});

// ── SECURITY CHECK ──
document.getElementById('run-check-btn').addEventListener('click', async () => {
  const btn = document.getElementById('run-check-btn');
  const res = document.getElementById('security-results');
  btn.disabled = true; btn.textContent = 'Checking…';
  res.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Running checks…</p></div>';
  securityFlags = {};

  const [passRes, breachRes] = await Promise.all([
    sendMessage('checkPasswords', { masterPassword }),
    sendMessage('checkBreaches',  { masterPassword })
  ]);

  const weakAll   = passRes?.success   ? passRes.result   : [];
  const breachAll = breachRes?.success ? breachRes.result : [];

  breachAll.forEach(f => { if (!securityFlags[f.id]) securityFlags[f.id] = []; securityFlags[f.id].push('breach'); });
  weakAll.forEach(f   => { if (!securityFlags[f.id]) securityFlags[f.id] = []; if (!securityFlags[f.id].includes('weak')) securityFlags[f.id].push('weak'); });

  renderCredentials(allCredentials);

  const total  = allCredentials.length;
  const nWeak  = new Set(weakAll.map(f => f.id)).size;
  const nReuse = new Set(weakAll.filter(f => f.message.toLowerCase().includes('reused')).map(f => f.id)).size;

  const breachItems = breachAll.map(f => {
    const c = allCredentials.find(x => x.id === f.id);
    return secItemHTML(c?.name || f.id, f.message, 'breach');
  });
  const weakItems = weakAll.filter(f => !f.message.toLowerCase().includes('reused')).map(f => {
    const c = allCredentials.find(x => x.id === f.id);
    return secItemHTML(c?.name || f.id, f.message, 'weak');
  });
  const reuseItems = weakAll.filter(f => f.message.toLowerCase().includes('reused')).map(f => {
    const c = allCredentials.find(x => x.id === f.id);
    return secItemHTML(c?.name || f.id, f.message, 'reuse');
  });

  res.innerHTML = `
    <div class="audit-stat-row">
      <div class="audit-stat green"><div class="as-num">${total}</div><div class="as-label">Total</div></div>
      <div class="audit-stat red"  ><div class="as-num">${nWeak}</div><div class="as-label">Weak</div></div>
      <div class="audit-stat yellow"><div class="as-num">${nReuse}</div><div class="as-label">Reused</div></div>
    </div>
    ${secSection('🚨 Breached Passwords', breachItems)}
    <hr class="divider">
    ${secSection('⚠️ Weak Passwords', weakItems)}
    <hr class="divider">
    ${secSection('🔁 Reused Passwords', reuseItems)}`;

  btn.disabled = false; btn.textContent = '🔍 Run Check';
  showToast('Security check complete', 'success');
});

function secItemHTML(name, msg, type) {
  return `<div class="sec-item">
    <div><div class="sec-item-name">${esc(name)}</div><div class="sec-item-msg">${esc(msg)}</div></div>
    <span class="sec-badge sec-badge-${type}">${type}</span></div>`;
}
function secSection(title, items) {
  return `<div class="audit-section">
    <div class="audit-heading">${title}</div>
    ${items.length ? items.join('') : '<div class="sec-empty">None found ✓</div>'}
  </div>`;
}

// ── GENERATOR ──
document.getElementById('gen-length').addEventListener('input', e => document.getElementById('len-val').textContent = e.target.value);

document.getElementById('gen-btn').addEventListener('click', () => {
  try {
    const pass = passwordGeneration({
      size:    parseInt(document.getElementById('gen-length').value),
      upper:   document.getElementById('opt-upper').checked,
      digits:  document.getElementById('opt-digits').checked,
      symbols: document.getElementById('opt-symbols').checked,
    });
    document.getElementById('gen-output').textContent = pass;
    const bar = document.getElementById('gen-sbar');
    const lbl = document.getElementById('gen-slabel');
    const len = pass.length;
    const score = [len >= 8, len >= 14, /[A-Z]/.test(pass), /[0-9]/.test(pass), /[^a-zA-Z0-9]/.test(pass)].filter(Boolean).length;
    const levels = [{ w:'20%',c:'#f38ba8',t:'Very weak'},{ w:'40%',c:'#fab387',t:'Weak'},{ w:'60%',c:'#f9e2af',t:'Fair'},{ w:'80%',c:'#a6e3a1',t:'Strong'},{ w:'100%',c:'#94e2d5',t:'Very strong'}];
    const l = levels[Math.min(score,4)]; bar.style.width=l.w; bar.style.background=l.c; lbl.textContent=l.t; lbl.style.color=l.c;
  } catch(e) { showToast(e.message||'Generator error','error'); }
});

document.getElementById('gen-copy-btn').addEventListener('click', () => {
  const val = document.getElementById('gen-output').textContent;
  if (val === '—') return;
  navigator.clipboard.writeText(val).then(() => showToast('Password copied!'));
});

function passwordGeneration(options) {
  if (options.size > 64 || options.size < 8) throw new Error('Size must be 8–64');
  const SETS = { lower:'abcdefghijklmnopqrstuvwxyz', upper:'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digits:'0123456789', symbols:'!@#$%^&*()-_=+[]{};:,.<>/?' };
  let pool = SETS.lower;
  if (options.upper)   pool += SETS.upper;
  if (options.digits)  pool += SETS.digits;
  if (options.symbols) pool += SETS.symbols;
  let pass = '', counter = 0;
  while (true) {
    let n = crypto.getRandomValues(new Uint8Array(1))[0];
    if (n > pool.length - 1) { n = crypto.getRandomValues(new Uint8Array(1))[0]; counter++; }
    else { pass += pool[n]; counter = 0; }
    if (counter >= Math.floor(Math.random()*(6-3))+3) { pass += pool[n%pool.length]; counter = 0; }
    if (options.size === pass.length) break;
  }
  return pass;
}

// ── LOCK TIMEOUT ──
async function loadLockTimeout() {
    const stored = await chrome.storage.local.get('lockTimeout');
    const minutes = stored.lockTimeout ?? 0;  // default to never
    document.getElementById('lock-timeout-select').value = String(minutes);
}

document.getElementById('lock-timeout-select').addEventListener('change', async e => {
  const minutes = parseInt(e.target.value);
  await sendMessage('setLockTimeout', { minutes });
  showToast(minutes === 0 ? 'Auto-lock disabled' : `Auto-lock set to ${minutes} min`, 'success');
});

// ── SETTINGS ──
document.getElementById('export-json-btn').addEventListener('click', async () => {
  const res = await sendMessage('exportVault', { masterPassword });
  if (res?.success) showToast('Vault exported ✓', 'success');
  else showToast('Export failed', 'error');
});

document.getElementById('import-json-btn').addEventListener('click', () => document.getElementById('import-json-file').click());

document.getElementById('import-json-file').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!parsed.credentials || !Array.isArray(parsed.credentials)) throw new Error('Invalid format');
      let count = 0;
      for (const cred of parsed.credentials) {
        const res = await sendMessage('addCredential', { masterPassword, input: { name: cred.name||'', url: cred.url||'', username: cred.username||'', password: cred.password||'', note: cred.note||'' } });
        if (res?.success) count++;
      }
      showToast(`Imported ${count} credentials`, 'success');
      await loadVault();
    } catch { showToast('Import failed — invalid file', 'error'); }
    e.target.value = '';
  };
  reader.readAsText(file);
});

document.getElementById('feedback-btn').addEventListener('click', () => { document.getElementById('feedback-text').value = ''; openModal('modal-feedback'); });
document.getElementById('send-feedback-btn').addEventListener('click', () => {
  if (!document.getElementById('feedback-text').value.trim()) return;
  closeModal('modal-feedback');
  showToast('Thank you for your feedback!', 'success');
});

// ── MODALS ──
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden');    }
document.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => closeModal(el.dataset.close)));
document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); }));

// ── TOAST ──
let toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'copied-toast' + (type ? ' ' + type : '');
  el.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

// ── UTILS ──
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function faviconHTML(url, name) {
  try { const h = new URL(url).hostname; return `<img src="https://www.google.com/s2/favicons?domain=${h}&sz=32" onerror="this.outerHTML='${(name||'?').charAt(0).toUpperCase()}'">` ; }
  catch { return (name||'?').charAt(0).toUpperCase(); }
}

init();
