import { encrypt, decrypt } from '../core/Crypto.js';

async function loadVault(masterPassword){
    const temp = await chrome.storage.local.get ("encrypted_vault");

    const encryptedBase64 = temp.encrypted_vault;
    const plainText = await decrypt(encryptedBase64,masterPassword);
    return JSON.parse(plainText)
}


// takes Credentials and unencrypted masterPassword
// passes it to Crypto.encrypt, then stores it
async function saveVault(credentials, masterPassword){
    const encryptedBase64 = await encrypt(JSON.stringify(credentials), masterPassword);
    await chrome.storage.local.set({ encrypted_vault: encryptedBase64 })
    return
}

// OLD IMPORT FUNCTION (JSON)
// // Validation of json isn't completed/will be in a different class
// async function importVault(jsonString) {
//     const temp = JSON.parse(jsonString);

//     return temp
// }
async function importVault(masterPassword,csvString){
const creds = (await loadVault(masterPassword)).credentials;

    const result = csvToCrednetials(csvString)
    for (const res of result){
    creds.push(res)
    }
    await saveVault({ credentials: creds }, masterPassword)
    return 
}

/*
Structure has to match this:
{
  "credentials": [
    {
      "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "name": "Claude AI",
      "url": "https://claude.ai",
      "username": "alhassan@example.com",
      "password": "Cl@ude_Dem0!2026",
      "note": "AI assistant account",
      "created": 1705312200000,
      "modified": 1705312200000
    }, ...
        ]
         }

*/

// Exports vault in a json file (INCOMPLETE)
async function exportVault(masterPassword){

   const result = credentialsToCSV((await loadVault(masterPassword)).credentials);
   return result
}


function credentialsToCSV(credentials) {
    let loadingCSV = ["name,url,username,password,note"];


    for (const cred of credentials){
        
    loadingCSV.push(
    `${cred.name},${cred.url},${cred.username},${cred.password},${cred.note}`
    );
    }
    return loadingCSV.join("\n");
}

function csvToCrednetials(csvString) {
const loaded = csvString.split(/\r?\n/);
    let counter = 0;
    let ready = [];
    for (const load of loaded){

        if (counter ==0){
         counter++;
        }
        else{
            if (load.trim() === "") continue;

         let temp = load.split(",")

            const newEntry = {
            id: crypto.randomUUID(),
            name: temp[0],
            url: temp[1],
            username: temp[2],
            password: temp[3],
            note: temp[4],
            created: Date.now(),
            modified: Date.now()  
        
            }
            ready.push(newEntry)
        }
    }
            return ready

    /*
    csv headers: (Google chrome format)
    name,url,username,password,note
    */

    
}

async function addCredential(masterPassword,input){

    // id, name, url, username, password, note, created, modified
    //local time, needs to be changed to server time 
    // INCOMPLETE
    
    const vault = await loadVault(masterPassword);
        // NEW Data/Entry to add into vault
        const newEntry = {
        id: crypto.randomUUID(),
        name: input.name,
        url: input.url,
        username: input.username,
        password: input.password,
        note: input.note,
        created: Date.now(),
        modified: Date.now()    
    
    }

    vault.credentials.push(newEntry)
    await saveVault({ credentials: vault.credentials }, masterPassword)
    return true

}

async function deleteCredential(masterPassword,id){
    const vault = await loadVault(masterPassword);
    try {
        const result = vault.credentials.filter(c => c.id !== id)
    await saveVault({ credentials: result }, masterPassword);
    return true
    } catch (error ) {
        return false
    }

}

async function editCredential(masterPassword,id,input){
        const vault = await loadVault(masterPassword);


    try {
        const result = vault.credentials.find(c => c.id === id)
        const index = vault.credentials.findIndex(c => c.id === id)
        /* 
        replace old values with input, keep same id/url/date of creation, 
        change "date modified"(local machine time) to current date.
        */
        const newEntry = {
        id: result.id,
        name: input.name,
        url: result.url,
        username: input.username,
        password: input.password,
        note: input.note,
        created: result.created,
        modified: Date.now()    
    }
        vault.credentials[index] = newEntry

    await saveVault({ credentials: vault.credentials }, masterPassword);    return true
    } catch (error ) {
        return false
    }
    
}

export { loadVault, saveVault, addCredential, deleteCredential, editCredential, exportVault, importVault };

/* JSON Structure

   {
    credentials: [
        { id, name, url, username, password, note, created, modified },
        ...
    ]
} 
*/

// export vault old code

    //     console.log("Hi guys2")

    // const jsonString= JSON.stringify(await loadVault(masterPassword));
    // console.log("Hi guys")
    // console.log(jsonString.toString());
    //     console.log(jsonString);

    //  return jsonString;
    // // const blob = new Blob([jsonString], {type:"application/json"});
    // // const url = URL.createObjectURL(blob);
    // // try{
    // //         await chrome.downloads.download({
    // //     url: url,
    // //     filename: "Vault_export.json",
    // //     saveAs: true
    // // });
    // // } finally{
    // //     URL.revokeObjectURL(url);
    // // }
    // // return
    
    /*
    CSV PART
    */