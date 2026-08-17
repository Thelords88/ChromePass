import { loadVault } from '../storage/vaultManager.js';

// takes one password to check for breach
async function checkBreach(password){
    const digested = await crypto.subtle.digest(
{name: "SHA-1",}, 
new TextEncoder().encode(password));
 // converting from hash bytes to hex string
 const hashArray = Array.from(new Uint8Array(digested));
 const hashHex = hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
 // padding it with 0 to ensure 2 chars e.g. "7" --> "07"

 const prefix= hashHex.slice(0,5); // first 5 chars 
 const suffix = hashHex.slice(5); // rest of the chars from 6th
 const results = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
 const text = await results.text();
 const lines = text.split('\n');
 /*
 Example of lines result;
 lines =
    [
    "A1B2C3D4E5:230",
    "X9Y8Z7W6V5:1",
    "F3E2D1C0B9:5432"
    ]
 */

        // finding the "count" of password encountered in a "KNOWN" Breach
 for (const line of lines){
    const [lineSuffix, count] = line.split(':');
    if (lineSuffix === suffix.toUpperCase()){
        try {
            return parseInt(count.trim())

        } catch (error) {
            console.log("Parsing count failed, BreachDetector.js")
        }
    }
 }
 return 0
}

async function checkAllBreach(masterPassword) {
    const vault = await loadVault(masterPassword);
    let flagged = [];
    for (const cred of vault.credentials){
        const result = await checkBreach(cred.password);
        if (result>0){
        flagged.push({id:cred.id, 
            message: `Password has been found in a breach ${result} times`});
        }
    }
    return flagged
}
export { checkAllBreach };
