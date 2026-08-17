// Autofill dropdown when username field clicked
// Save prompt after manual credential entry


const hostname = location.hostname;
let dropdown = null;
let savePrompt = null;
let lastDetectedUsername = '';
let lastDetectedPassword = '';

//  INJECT STYLES 
const style = document.createElement('style');
style.textContent = `
  #cp-dropdown {
    position: absolute;
    z-index: 2147483647;
    background: #1e1e2e;
    border: 1px solid #45475a;
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    width: 280px;
    font-family: system-ui, sans-serif;
    overflow: hidden;
    animation: cp-fade-in 0.12s ease;
  }
  #cp-dropdown .cp-header {
    padding: 8px 12px 6px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #6c7086;
    border-bottom: 1px solid #45475a;
  }
  #cp-dropdown .cp-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    cursor: pointer;
    transition: background 0.12s;
  }
  #cp-dropdown .cp-item:hover { background: #313244; }
  #cp-dropdown .cp-item + .cp-item { border-top: 1px solid #313244; }
  #cp-dropdown .cp-item-icon {
    width: 26px; height: 26px;
    background: #313244;
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; color: #89b4fa;
    flex-shrink: 0; font-weight: 700;
  }
  #cp-dropdown .cp-item-name { font-size: 13px; color: #cdd6f4; font-weight: 500; }
  #cp-dropdown .cp-item-user { font-size: 11px; color: #6c7086; font-family: monospace; margin-top: 1px; }
  #cp-dropdown .cp-empty  { padding: 14px 12px; font-size: 12px; color: #6c7086; font-style: italic; }
  #cp-dropdown .cp-locked { padding: 14px 12px; font-size: 12px; color: #6c7086; font-style: italic; }

  #cp-save-prompt {
    position: fixed;
    z-index: 2147483647;
    bottom: 24px;
    right: 24px;
    background: #1e1e2e;
    border: 1px solid #45475a;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.55);
    width: 300px;
    font-family: system-ui, sans-serif;
    overflow: hidden;
    animation: cp-slide-up 0.15s ease;
  }
  #cp-save-prompt .cp-sp-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px 8px;
    border-bottom: 1px solid #45475a;
  }
  #cp-save-prompt .cp-sp-title {
    font-size: 13px; font-weight: 600; color: #cdd6f4;
    display: flex; align-items: center; gap: 7px;
  }
  #cp-save-prompt .cp-sp-close {
    background: none; border: none; color: #6c7086;
    font-size: 15px; cursor: pointer; padding: 0 3px; line-height: 1;
  }
  #cp-save-prompt .cp-sp-close:hover { color: #cdd6f4; }
  #cp-save-prompt .cp-sp-body { padding: 10px 14px 12px; display: flex; flex-direction: column; gap: 8px; }
  #cp-save-prompt .cp-sp-row { font-size: 12px; color: #a6adc8; }
  #cp-save-prompt .cp-sp-row strong { color: #cdd6f4; font-weight: 500; }
  #cp-save-prompt .cp-sp-input {
    width: 100%;
    background: #313244;
    border: 1px solid #45475a;
    border-radius: 7px;
    padding: 8px 10px;
    color: #cdd6f4;
    font-size: 12px;
    font-family: monospace;
    letter-spacing: 2px;
    outline: none;
  }
  #cp-save-prompt .cp-sp-input:focus { border-color: #89b4fa; }
  #cp-save-prompt .cp-sp-input::placeholder { letter-spacing: 0; font-family: system-ui, sans-serif; color: #6c7086; }
  #cp-save-prompt .cp-sp-error { font-size: 11px; color: #f38ba8; display: none; }
  #cp-save-prompt .cp-sp-btns { display: flex; gap: 7px; }
  #cp-save-prompt .cp-btn-yes {
    flex: 1; background: #89b4fa; color: #1e1e2e;
    border: none; border-radius: 7px; padding: 8px;
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: opacity 0.15s;
  }
  #cp-save-prompt .cp-btn-yes:hover { opacity: 0.85; }
  #cp-save-prompt .cp-btn-yes:disabled { opacity: 0.5; cursor: not-allowed; }
  #cp-save-prompt .cp-btn-no {
    flex: 1; background: #313244; color: #a6adc8;
    border: 1px solid #45475a; border-radius: 7px; padding: 8px;
    font-size: 12px; cursor: pointer; transition: color 0.15s;
  }
  #cp-save-prompt .cp-btn-no:hover { color: #cdd6f4; }

  @keyframes cp-fade-in  { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  @keyframes cp-slide-up { from { opacity: 0; transform: translateY(8px);  } to { opacity: 1; transform: none; } }
`;
document.head.appendChild(style);

// UTILS 
function sendMessage(action, data = {}) {
  return new Promise(resolve =>
    chrome.runtime.sendMessage({ action, ...data }, resolve)
  );
}

function removeDropdown()  { if (dropdown)   { dropdown.remove();   dropdown = null;   } }
function removeSavePrompt(){ if (savePrompt) { savePrompt.remove(); savePrompt = null; } }

//  AUTOFILL DROPDOWN 


async function showDropdown(usernameField,targetField) {
  removeDropdown();

  const res = await sendMessage('getMatchingCredentials', { hostname });

  dropdown = document.createElement('div');
  dropdown.id = 'cp-dropdown';

  if (!res?.success) {
    dropdown.innerHTML = `<div class="cp-locked">🔒 ChromePass is locked</div>`;
  } else if (!res.result || res.result.length === 0) {
    dropdown.innerHTML = `
      <div class="cp-header">ChromePass</div>
      <div class="cp-empty">No saved credentials for this site</div>`;
  } else {
    dropdown.innerHTML = `
      <div class="cp-header">ChromePass — click to fill</div>
      ${res.result.map((c, i) => `
        <div class="cp-item" data-idx="${i}">
          <div class="cp-item-icon">${(c.name || c.url || '?').charAt(0).toUpperCase()}</div>
          <div>
            <div class="cp-item-name">${escHtml(c.name || c.url)}</div>
            <div class="cp-item-user">${escHtml(c.username)}</div>
          </div>
        </div>`).join('')}`;

    dropdown.querySelectorAll('.cp-item').forEach(item => {
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        const cred = res.result[parseInt(item.dataset.idx)];
        fillCredential(cred, usernameField);
        removeDropdown();
      });
    });
  }

  const rect = targetField.getBoundingClientRect();
  dropdown.style.top   = `${rect.bottom + window.scrollY + 4}px`;
  dropdown.style.left  = `${rect.left   + window.scrollX}px`;
  dropdown.style.width = `${Math.max(280, rect.width)}px`;

  document.body.appendChild(dropdown);
}

function fillCredential(cred, usernameField) {
  if (usernameField) {
    usernameField.value = cred.username;
    usernameField.dispatchEvent(new Event('input', { bubbles: true }));
  }
  waitForPasswordField(passwordField => {
    passwordField.value = cred.password;
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

// USERNAME FIELD CLICK LISTENER 
//version 1.1 (changed from 'focusin' to'click'), pop up will show on click only
// instead of auto showing up

document.addEventListener('click', e => {
  const usernameField = findUsernameField();
  const passwordField = findPasswordField();
  if (e.target === usernameField || e.target === passwordField)     showDropdown(usernameField, e.target);

  else if (dropdown && !dropdown.contains(e.target)) removeDropdown();
});



// SAVE PROMPT 
document.addEventListener('submit', e => {
  const { usernameField, passwordField } = detectFields();
  if (!usernameField || !passwordField) return;
  const username = usernameField.value.trim();
  const password = passwordField.value;
  if (!username || !password) return;
  lastDetectedUsername = username;
  lastDetectedPassword = password;
  showSavePrompt(username);
}, true);

document.addEventListener('click', e => {
  const tag  = e.target.tagName;
  const type = e.target.type?.toLowerCase();
  if ((tag !== 'BUTTON' && tag !== 'INPUT') || (type !== 'submit' && type !== 'button')) return;
  setTimeout(() => {
    const { usernameField, passwordField } = detectFields();
    const username = usernameField?.value?.trim();
    const password = passwordField?.value;
    if (!username || !password) return;
    if (username === lastDetectedUsername && password === lastDetectedPassword) return;
    lastDetectedUsername = username;
    lastDetectedPassword = password;
    showSavePrompt(username);
  }, 300);
});

function showSavePrompt(username) {
  removeSavePrompt();
  savePrompt = document.createElement('div');
  savePrompt.id = 'cp-save-prompt';
  savePrompt.innerHTML = `
    <div class="cp-sp-header">
      <span class="cp-sp-title">⬡ Save to ChromePass?</span>
      <button class="cp-sp-close">✕</button>
    </div>
    <div class="cp-sp-body">
      <div class="cp-sp-row">Username: <strong>${escHtml(username)}</strong></div>
      <div class="cp-sp-btns">
        <button class="cp-btn-yes">Save</button>
        <button class="cp-btn-no">Not now</button>
      </div>
    </div>`;

  const saveBtn  = savePrompt.querySelector('.cp-btn-yes');
  const noBtn    = savePrompt.querySelector('.cp-btn-no');
  const closeBtn = savePrompt.querySelector('.cp-sp-close');

  noBtn.addEventListener('click', removeSavePrompt);
  closeBtn.addEventListener('click', removeSavePrompt);

  saveBtn.addEventListener('click', async () => {
    saveBtn.textContent = 'Saving…';
    saveBtn.disabled = true;
    const res = await sendMessage('saveFromContent', {
      input: {
        name:     hostname,
        url:      location.href,
        username: lastDetectedUsername,
        password: lastDetectedPassword,
        note:     ''
      }
    });
    if (res?.success) {
      removeSavePrompt();
    } else {
      saveBtn.textContent = 'Save';
      saveBtn.disabled = false;
    }
  });

  document.body.appendChild(savePrompt);
}

// AUTOFILL MESSAGE FROM POPUP 
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'autofill') {
    const { usernameField } = detectFields();
    fillCredential(message.credential, usernameField);
  }
});
//  FIELD DETECTION 
function findPasswordField() {
  const all = document.querySelectorAll('input[type="password"]');
  if (all.length > 1) return null;
  return all[0] || null;
}

function findUsernameField() {
  return document.querySelector('input[autocomplete*="user"]') ||
    document.querySelector('input[autocomplete*="email"]')     ||
    document.querySelector('input[type="email"]')              ||
    document.querySelector('input[id="username"]')             ||
    // version 1.1
    document.querySelector('input[name="username"]')           ||
    document.querySelector('input[name="email"]')              ||
    document.querySelector('input[placeholder*="username" i]') ||
    document.querySelector('input[placeholder*="email" i]');
    //
}

function detectFields() {
  return { usernameField: findUsernameField(), passwordField: findPasswordField() };
}

function waitForPasswordField(callback, timeout = 10000) {
  const existing = findPasswordField();
  if (existing) { callback(existing); return; }
  const observer = new MutationObserver(() => {
    const field = findPasswordField();
    if (field) { observer.disconnect(); callback(field); }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), timeout);
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
