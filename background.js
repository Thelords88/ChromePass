import { setupMasterPassword, verifyMasterPassword } from './core/VaultStore.js';
import { loadVault, addCredential, deleteCredential, editCredential, exportVault } from './storage/vaultManager.js';
import { checkPassword } from './core/PassChecker.js';
import { checkAllBreach } from './core/BreachDetector.js';

let sessionMasterPassword = null;

/*
RESTORE ON SERVICE WORKER RESTART
 service workers get killed after a short while
 chrome.storage.session clears after browser closes
*/
chrome.storage.session.get('smp').then(result => {
    if (result.smp) sessionMasterPassword = result.smp;
});

function setSession(password) {
    sessionMasterPassword = password;
    chrome.storage.session.set({ smp: password });
}

function clearSession() {
    sessionMasterPassword = null;
    chrome.storage.session.remove('smp');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.action === "verifyPassword") {

        verifyMasterPassword(message.masterPassword)
        .then(result => {
            if (result === true) setSession(message.masterPassword);
            sendResponse({ success: true, result });
        })
        .catch(error => sendResponse({ success: false, error: error.message }));
    }

    if (message.action === "setupPassword") {
        setupMasterPassword(message.masterPassword)
        .then(result => {
            setSession(message.masterPassword);
            sendResponse({ success: true, result });
        })
        .catch(error => sendResponse({ success: false, error: error.message }));
    }

    if (message.action === "getVault") {
    loadVault(message.masterPassword)
    .then(result => {
        sendResponse({ success: true, result });
    })
    .catch(error => {
        sendResponse({ success: false, error: error.message });
    });
    }

    if (message.action === "addCredential") {
        addCredential(message.masterPassword, message.input)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    }

    if (message.action === "deleteCredential") {
        deleteCredential(message.masterPassword, message.id)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    }

    if (message.action === "editCredential") {
        editCredential(message.masterPassword, message.id, message.input)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    }

    if (message.action === "checkPasswords") {
        checkPassword(message.masterPassword)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    }

    if (message.action === "checkBreaches") {
        checkAllBreach(message.masterPassword)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    }

    if (message.action === "exportVault") {
        exportVault(message.masterPassword)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    }

    if (message.action === "getMatchingCredentials") {
        if (!sessionMasterPassword) {
            sendResponse({ success: false, error: 'locked' });
        } else {
            loadVault(sessionMasterPassword)
            .then(vault => {
                const matches = vault.credentials.filter(c => {
                    try { return new URL(c.url).hostname === message.hostname; } catch { return false; }
                });
                sendResponse({ success: true, result: matches });
            })
            .catch(error => sendResponse({ success: false, error: error.message }));
        }
    }

    if (message.action === "saveFromContent") {
    if (!sessionMasterPassword) { sendResponse({ success: false, error: 'locked' }); }
    else {
        addCredential(sessionMasterPassword, message.input)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    }
    }

    if (message.action === "setLockTimeout") {
        chrome.alarms.clearAll();
        if (message.minutes > 0) {
            chrome.alarms.create('autoLock', { delayInMinutes: message.minutes });
        }
        chrome.storage.local.set({ lockTimeout: message.minutes });
        sendResponse({ success: true });
    }

    if (message.action === "lock") {
        clearSession();
        chrome.alarms.clearAll();
        sendResponse({ success: true });
    }

    return true; // keeps channel open for async responses
});

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'autoLock') clearSession();
});
