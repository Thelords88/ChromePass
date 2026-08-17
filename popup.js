let masterPassword = null;

// ── MESSAGE HELPER WITH RETRY ──
function sendMessage(action, data = {}) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action, ...data }, response => {
      if (chrome.runtime.lastError) {
        // Service worker was starting up — retry once after short delay
        setTimeout(() => {
          chrome.runtime.sendMessage({ action, ...data }, resolve);
        }, 500);
        return;
      }
      resolve(response);
    });
  });
}

async function init() {
  const stored = await chrome.storage.local.get('vault_meta');
  if (!stored.vault_meta) { showState('setup'); return; }
const s = await chrome.storage.session.get('cp_master');
const saved = s.cp_master;
  if (saved) { masterPassword = saved; showState('unlocked'); loadSiteCredentials(); }
  else showState('login');
}

function showState(name) {
  document.querySelectorAll('.state').forEach(s => s.classList.add('hidden'));
  document.getElementById('state-' + name).classList.remove('hidden');
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ── SETUP ──
document.getElementById('setup-btn').addEventListener('click', async () => {
  const pass = document.getElementById('setup-password').value;
  const conf = document.getElementById('setup-confirm').value;
  document.getElementById('setup-error').classList.add('hidden');
  if (pass.length < 8) return showError('setup-error', 'Password must be at least 8 characters');
  if (pass !== conf)   return showError('setup-error', 'Passwords do not match');
  const res = await sendMessage('setupPassword', { masterPassword: pass });
  if (res?.success) {
    masterPassword = pass;
await chrome.storage.session.set({ cp_master: pass });
    showState('unlocked');
    loadSiteCredentials();
  } else {
    showError('setup-error', res?.error || 'Setup failed');
  }
});
document.getElementById('setup-confirm').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('setup-btn').click(); });

// ── LOGIN ──
document.getElementById('login-btn').addEventListener('click', async () => {
  const pass = document.getElementById('login-password').value;
  document.getElementById('login-error').classList.add('hidden');
  const res = await sendMessage('verifyPassword', { masterPassword: pass });
  if (res?.success && res.result === true) {
    masterPassword = pass;
await chrome.storage.session.set({ cp_master: pass });
    showState('unlocked');
    loadSiteCredentials();
  } else {
    showError('login-error', 'Incorrect master password');
  }
});
document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('login-btn').click(); });

// ── LOCK ──
document.getElementById('lock-btn').addEventListener('click',async () => {
  masterPassword = null;
await chrome.storage.session.remove('cp_master');
  sendMessage('lock');
  document.getElementById('login-password').value = '';
  showState('login');
});

// ── OPEN FULL VAULT ──
document.getElementById('open-vault-btn').addEventListener('click', async () => {
await chrome.storage.session.set({ cp_master: masterPassword });
  chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  window.close();
});

// ── SITE CREDENTIALS ──
async function loadSiteCredentials() {
  const container = document.getElementById('site-credentials');
  const label     = document.getElementById('site-label');
  container.innerHTML = '';

  let hostname = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    hostname = new URL(tab.url).hostname;
    label.textContent = hostname || 'This site';
  } catch { label.textContent = 'This site'; }

  const res = await sendMessage('getVault', { masterPassword });
  if (!res?.success) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${res?.error || 'Could not load vault'}</p></div>`;
    return;
  }

  const creds   = res.result?.credentials || [];
  const matches = creds.filter(c => { try { return new URL(c.url).hostname === hostname; } catch { return false; } });

  if (matches.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>No saved credentials for this site</p></div>`;
    return;
  }

  container.innerHTML = matches.map(c => `
    <div class="cred-card" data-id="${c.id}">
      <div class="cred-favicon">${getFavicon(c.url, c.name)}</div>
      <div class="cred-info">
        <div class="cred-title">${esc(c.name || c.url)}</div>
        <div class="cred-user">${esc(c.username)}</div>
      </div>
      <span class="fill-hint">Fill ↵</span>
    </div>`).join('');

  container.querySelectorAll('.cred-card').forEach(card => {
    card.addEventListener('click', async () => {
      const cred = matches.find(c => c.id === card.dataset.id);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: 'autofill', credential: cred });
      window.close();
    });
  });
}

function getFavicon(url, name) {
  try {
    const h = new URL(url).hostname;
    return `<img src="https://www.google.com/s2/favicons?domain=${h}&sz=32" onerror="this.outerHTML='${(name||'?').charAt(0).toUpperCase()}'">`;
  } catch { return (name || '?').charAt(0).toUpperCase(); }
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

init();
