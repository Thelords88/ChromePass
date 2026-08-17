import { encrypt, hashMasterPassword, cryptoVerifyMasterPassword } from './Crypto.js';
async function setupMasterPassword(masterPassword){
    const {hash_string, salt_string} = await hashMasterPassword(masterPassword)

    const hash_salt = 
    {
        vault_meta: {
            hash: hash_string,
            salt: salt_string
        }
    };

    // result not used
    await chrome.storage.local.set(hash_salt);
    const encryptedBase64 = await encrypt(JSON.stringify({credentials: []}), masterPassword)
    await chrome.storage.local.set ({ encrypted_vault: encryptedBase64 })

    return 
} 


async function verifyMasterPassword(masterPassword){
    const loadedVault = await chrome.storage.local.get("vault_meta")
    const result = await cryptoVerifyMasterPassword(
        masterPassword, 
        loadedVault.vault_meta.hash, 
        loadedVault.vault_meta.salt
    );
    // if password is a match, return true
    if (result == true){
        return true
    }
    // if password is a mismatch, return false
    if(result == false){
        return false
    }
    // returning null if an error occurs (not ideal but should work for now)
    else{
        return null
    }    
}

export { setupMasterPassword, verifyMasterPassword };