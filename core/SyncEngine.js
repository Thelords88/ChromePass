import { encrypt, decrypt } from './Crypto.js';
// global variables for connection to superbase storage

const SUPERBASE_URL ="https://atnvvhuucyohfigqdmpo.supabase.co";
const SUPERBASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnZ2aHV1Y3lvaGZpZ3FkbXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTM1MjQsImV4cCI6MjA5MzM4OTUyNH0.lfUV00N4yLpdjh8I2DoWlBZvHUKHKDJjtD3Jd24NKnw";

async function signUp(email, syncPassword){
    const response = await fetch(`${SUPERBASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: {
            "Content-Type":"application/json",
            "apikey": SUPERBASE_ANON_KEY
        },
        body:JSON.stringify({email, password: syncPassword})
    });
    const data = await response.json();
    if(!response.ok){
        throw new Error(data.message || "Sign up failed");
    }
    return true;
}

async function signIn(email, syncPassword){
    const response = await fetch(`${SUPERBASE_URL}/auth/v1/token?grant_type=password`, 
        {
        method: "POST",
        headers: {
            "Content-Type":"application/json",
            "apikey": SUPERBASE_ANON_KEY
        },
        body:JSON.stringify({email, password: syncPassword})
    });
    const data = await response.json();
    if(!response.ok){
        throw new Error(data.message || "Sign in failed");
    }
    // Gets the JWT
    return data.access_token;
}

// Read encrypted data from vault, without decrypting it + assign sync time
async function backupVault(jwt,syncPassword){
    const encryptedBase64 = (await chrome.storage.local.get ("encrypted_vault")).encrypted_vault;
    const vaultMeta = JSON.stringify((await chrome.storage.local.get('vault_meta')).vault_meta);
    const encryptedMeta = await encrypt(vaultMeta, syncPassword);

    // Get user ID from superbase
    const userResponse = await fetch(`${SUPERBASE_URL}/auth/v1/user`, {
    headers: {
        "apikey": SUPERBASE_ANON_KEY,
        "Authorization": `Bearer ${jwt}`
    }
});
const user = await userResponse.json();
const user_id = user.id;

    const response  = await fetch (`${SUPERBASE_URL}/rest/v1/vaults`,{
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        "apikey": SUPERBASE_ANON_KEY,
        "Authorization": `Bearer ${jwt}`,
        "Prefer": "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify({
                user_id: user_id,
            encrypted_vault: encryptedBase64,
            vault_meta: encryptedMeta,
            updated_at: new Date().toISOString()
        })
    });
    const data = await response.json();
    if (!response.ok){
        throw new Error(data.message || "Backup failed");
        
    }
    const serverTime = new Date(data[0].updated_at).toLocaleString();
    await chrome.storage.local.set({last_backup: serverTime});
    return serverTime

}

async function restoreVault(jwt, syncPassword) {
    const response = await fetch(`${SUPERBASE_URL}/rest/v1/vaults?select=encrypted_vault,vault_meta,updated_at`, {
        method: "GET",
        headers: {
            "apikey": SUPERBASE_ANON_KEY,
            "Authorization": `Bearer ${jwt}`,
        }
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Restore failed");
    }
    const decryptedMeta = await decrypt(data[0].vault_meta, syncPassword);
    await chrome.storage.local.set({ vault_meta: JSON.parse(decryptedMeta) });
    await chrome.storage.local.set({ encrypted_vault: data[0].encrypted_vault });
    return true;
}

// Deleting the JWT.
async function signOut(jwt){
        await fetch (`${SUPERBASE_URL}/auth/v1/logout`,{
        method: "POST",
        headers: {
        "Authorization": `Bearer ${jwt}`,
        }
    });
    await chrome.storage.session.remove('sync_jwt');
}


export { signUp, signIn, backupVault, restoreVault, signOut };