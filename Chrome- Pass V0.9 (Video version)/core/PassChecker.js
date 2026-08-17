import { loadVault } from '../storage/vaultManager.js';

function checkLength(credentials) {
    let flagged = [];
    for (const cred of credentials){
        if (cred.password.length <= 8){
            flagged.push ({id:cred.id, message: "Password is too short"})
        }
        if (cred.password.length >= 9 && cred.password.length <14) {
            flagged.push({id:cred.id, message: "Password is weak"})
        }
    }
            return flagged
}

 function checkComplexity(credentials) {
        let flagged = [];
    for (const cred of credentials){
        let variable = 0;
        if (cred.password.length <= 13){
            variable += /[a-z]/.test(cred.password)  
            variable += /[A-Z]/.test(cred.password)   
            variable += /[0-9]/.test(cred.password)   
            variable += /[^a-zA-Z0-9]/.test(cred.password)  
            if (variable <3){
            flagged.push ({id:cred.id, message: "Password is too weak"})
            variable = 0;
            }

        }
        if (cred.password.length >=14) {
            const complexChars = (cred.password.match(/[A-Z]/g) || []).length
                   + (cred.password.match(/[0-9]/g) || []).length
                   + (cred.password.match(/[^a-zA-Z0-9]/g) || []).length
            if (complexChars/cred.password.length <0.25){
            flagged.push({id:cred.id, message: "Password is weak"})
            } 
        }

    }
            return flagged
}

function checkReuse(credentials) {
    let flagged = [];
    let visited = [];
    let matches;

    for (const cred of credentials){
        if (visited.includes(cred.id)){
            continue
        }
        else {
            matches = credentials.filter(c => c.password === cred.password);
        }
        if (matches.length>1){
            for (const match of matches){
            flagged.push({id:match.id, message: "Password is reused"})
            visited.push(match.id)
            }
        }
    }
            return flagged
}

/*
This function will call the above funcitons,
it takes masterPassword, loads the vault,
passes the "credentials" to other functions.
Reducing running time by avoding re-loading 
the vault with every funciton.
Increasing secuirty by reducing unencrypted passwords
sitting in the ram.
*/
async function checkPassword(masterPassword) {
    const vault = await loadVault(masterPassword);
    const flaggedLength =checkLength(vault.credentials);
    const flaggedComplex = checkComplexity(vault.credentials);
    const flaggedReused = checkReuse(vault.credentials);
    const flaggedAll = [...flaggedLength, ...flaggedComplex, ...flaggedReused];
    return flaggedAll
}

export { checkPassword };
