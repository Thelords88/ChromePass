async function deriveKey (masterPassword, salt){
const rawPass = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(masterPassword),
    { name: "PBKDF2"},
    false,
    ["deriveKey"]
);

const crypticPass = await crypto.subtle.deriveKey(
    {name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256"},
    rawPass,
    { name: "AES-GCM", length: 256},
    false,
    ["encrypt", "decrypt"]
);


return crypticPass
}

async function encrypt(plaintext, masterPassword){

    const salt =  crypto.getRandomValues(new Uint8Array(16));

    const AESKey = await deriveKey(masterPassword, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipherTextBuffer = await crypto.subtle.encrypt(
        {name:"AES-GCM", iv},
        AESKey,
        new TextEncoder().encode(plaintext)

    );
    const encrypted = new Uint8Array(salt.length + iv.length + cipherTextBuffer.byteLength)
    encrypted.set(salt, 0)
    encrypted.set(iv, salt.length)
    encrypted.set(new Uint8Array(cipherTextBuffer), salt.length + iv.length)
    let binary = '';
    encrypted.forEach(b => binary += String.fromCharCode(b));
    const encryptedBase64 = btoa(binary);
    return encryptedBase64
    
}

async function decrypt(encryptedBase64, masterPassword){


    const binaryStr = atob(encryptedBase64);
    const decrypted = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) decrypted[i] = binaryStr.charCodeAt(i);

    const salt = decrypted.slice(0,16)

    const iv = decrypted.slice(16,28)
    const ciperTextBuffer = decrypted.slice(28)



    const AESKey = await deriveKey(masterPassword, salt)
    const plainText = 
     await crypto.subtle.decrypt(
        {name:"AES-GCM", iv},
        AESKey,
        ciperTextBuffer
    );
    

    return new TextDecoder().decode(plainText)

}


// INCOMPLETE --- COMPLETE
async function hashMasterPassword(masterPassword) {
    const salt = crypto.getRandomValues(new Uint8Array(16));

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(masterPassword),
        {name:"PBKDF2"},
        false,
        ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {name: "PBKDF2",
        salt: salt,
        iterations: 310000,
        hash: "SHA-256",
        }, keyMaterial, 256);
        
        // conversion bytes to base64 strings
    const hash_string = btoa(String.fromCharCode(...new Uint8Array(derivedBits))); 
    const salt_string = btoa(String.fromCharCode(...new Uint8Array(salt)));
        return {hash_string,salt_string}
}

async function cryptoVerifyMasterPassword(masterPassword, hash_string, salt_string){
    // NOT USED  
    //const hashBytes = Uint8Array.from(atob(hash_string), c => c.charCodeAt(0));
        const saltBytes = Uint8Array.from(atob(salt_string), c => c.charCodeAt(0));
        const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(masterPassword),
        {name:"PBKDF2"},
        false,
        ["deriveBits"]
        );

        const derivedBits = await crypto.subtle.deriveBits(
        {name: "PBKDF2",
        salt: saltBytes,
        iterations: 310000,
        hash: "SHA-256",
        }, keyMaterial, 256);
        
        // conversion bytes to base64 strings
        const hashVerify_string = btoa(String.fromCharCode(...new Uint8Array(derivedBits))); 
        if (hash_string != hashVerify_string){
            return false
        }
        else{   
            return true
        }
}
export { deriveKey, encrypt, decrypt, hashMasterPassword, cryptoVerifyMasterPassword };